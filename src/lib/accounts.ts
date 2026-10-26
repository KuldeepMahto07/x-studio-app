import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type BinaryLike } from "node:crypto";
import { promisify } from "node:util";
import { get, newId, nowIso, run, transaction } from "./db";

// Account logic with no Next.js imports, so it can be unit-tested directly.

const scrypt = promisify(scryptCb) as (password: BinaryLike, salt: BinaryLike, keylen: number) => Promise<Buffer>;
const KEY_LEN = 64;
const RESET_TTL_MS = 30 * 60_000;
export const MIN_PASSWORD = 8;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? null : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return "That password is too long.";
  return null;
}

/** Format: scrypt$<salt hex>$<hash hex> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

// Compared against when the email doesn't exist, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "scrypt$00000000000000000000000000000000$" + "00".repeat(KEY_LEN);

export type CreateResult = { ok: true; userId: string } | { ok: false; error: string };

/**
 * Creates an email account. With allowClaim (local/dev only), an existing passwordless
 * handle-only account for the same handle is upgraded instead of duplicated.
 */
export async function createAccount(input: { email: string; password: string; handle: string }, opts: { allowClaim?: boolean } = {}): Promise<CreateResult> {
  const email = normalizeEmail(input.email);
  const handle = normalizeHandle(input.handle);
  const problem = validateEmail(email) ?? validatePassword(input.password) ?? (handle ? null : "Enter your X handle.");
  if (problem) return { ok: false, error: problem };
  if (get("SELECT 1 FROM users WHERE email = ?", email)) return { ok: false, error: "An account with this email already exists. Sign in instead." };

  const passwordHash = await hashPassword(input.password);
  const legacy = opts.allowClaim
    ? get<{ id: string }>("SELECT id FROM users WHERE x_user_id = ? AND email IS NULL AND password_hash IS NULL", `local-${handle.toLowerCase()}`)
    : undefined;

  return transaction(() => {
    if (legacy) {
      run("UPDATE users SET email = ?, password_hash = ? WHERE id = ?", email, passwordHash, legacy.id);
      return { ok: true as const, userId: legacy.id };
    }
    const id = newId();
    run(
      "INSERT INTO users (id, x_user_id, x_handle, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id, `acct-${id}`, handle, handle, email, passwordHash, nowIso(),
    );
    run("INSERT INTO slots (user_id, time) VALUES (?, ?)", id, "09:00");
    return { ok: true as const, userId: id };
  });
}

/** Returns the user id when the email and password match, otherwise null. */
export async function authenticate(emailInput: string, password: string): Promise<string | null> {
  const row = get<{ id: string; password_hash: string | null }>("SELECT id, password_hash FROM users WHERE email = ?", normalizeEmail(emailInput));
  const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  return ok && row?.password_hash ? row.id : null;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a one-time reset token (only its hash is stored). Returns null if there's no such account. */
export function createResetToken(emailInput: string): string | null {
  const row = get<{ id: string }>("SELECT id FROM users WHERE email = ?", normalizeEmail(emailInput));
  if (!row) return null;
  const token = randomBytes(32).toString("base64url");
  run("DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?", row.id, Date.now());
  run("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)", hashToken(token), row.id, Date.now() + RESET_TTL_MS);
  return token;
}

export function isResetTokenValid(token: string): boolean {
  return !!get("SELECT 1 FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?", hashToken(token), Date.now());
}

/** Sets a new password, burns the token, and signs the user out everywhere. */
export async function resetPassword(token: string, newPassword: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const problem = validatePassword(newPassword);
  if (problem) return { ok: false, error: problem };
  const row = get<{ user_id: string }>(
    "SELECT user_id FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?",
    hashToken(token), Date.now(),
  );
  if (!row) return { ok: false, error: "This reset link has expired or was already used. Request a new one." };
  const passwordHash = await hashPassword(newPassword);
  transaction(() => {
    run("UPDATE password_resets SET used = 1 WHERE token_hash = ?", hashToken(token));
    run("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, row.user_id);
    run("DELETE FROM sessions WHERE user_id = ?", row.user_id);
  });
  return { ok: true, userId: row.user_id };
}

// ---------- simple in-memory rate limiting (per process) ----------

const hits = new Map<string, number[]>();

/** Returns true if the key is still under `limit` hits in the last `windowMs`, and records this hit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
