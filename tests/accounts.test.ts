import { describe, expect, it } from "vitest";
import {
  authenticate, createAccount, createResetToken, hashPassword, isResetTokenValid, rateLimit, resetPassword, verifyPassword,
} from "@/lib/accounts";
import { get, newId, nowIso, run } from "@/lib/db";

const unique = () => `user${Math.random().toString(36).slice(2, 8)}@example.com`;

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("salts each hash differently", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});

describe("sign up and sign in", () => {
  it("creates an account and signs in with the same email in any case", async () => {
    const email = unique();
    const res = await createAccount({ email: `  ${email.toUpperCase()} `, password: "password123", handle: "@builder_1" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = get<{ email: string; x_handle: string; password_hash: string }>("SELECT email, x_handle, password_hash FROM users WHERE id = ?", res.userId);
    expect(row?.email).toBe(email);
    expect(row?.x_handle).toBe("builder_1");
    expect(row?.password_hash).not.toContain("password123");
    expect(await authenticate(email.toUpperCase(), "password123")).toBe(res.userId);
  });

  it("gives every new account a default posting time", async () => {
    const res = await createAccount({ email: unique(), password: "password123", handle: "slots" });
    if (!res.ok) throw new Error(res.error);
    expect(get<{ n: number }>("SELECT COUNT(*) n FROM slots WHERE user_id = ?", res.userId)?.n).toBe(1);
  });

  it("rejects wrong passwords and unknown emails the same way", async () => {
    const email = unique();
    await createAccount({ email, password: "password123", handle: "a" });
    expect(await authenticate(email, "wrong-password")).toBeNull();
    expect(await authenticate(unique(), "password123")).toBeNull();
  });

  it("refuses duplicate emails, bad emails, short passwords, and missing handles", async () => {
    const email = unique();
    expect((await createAccount({ email, password: "password123", handle: "a" })).ok).toBe(true);
    expect(await createAccount({ email, password: "password123", handle: "b" })).toEqual({ ok: false, error: expect.stringContaining("already exists") });
    expect(await createAccount({ email: "not-an-email", password: "password123", handle: "c" })).toEqual({ ok: false, error: expect.stringContaining("valid email") });
    expect(await createAccount({ email: unique(), password: "short", handle: "d" })).toEqual({ ok: false, error: expect.stringContaining("8 characters") });
    expect(await createAccount({ email: unique(), password: "password123", handle: "@@" })).toEqual({ ok: false, error: expect.stringContaining("X handle") });
  });

  it("can't sign in to a handle-only account that has no password", async () => {
    run("INSERT INTO users (id, x_user_id, x_handle, name, created_at) VALUES (?, ?, ?, ?, ?)", newId(), "local-nopass", "nopass", "nopass", nowIso());
    expect(await authenticate("", "")).toBeNull();
  });

  it("upgrades an old handle-only account only when claiming is allowed", async () => {
    const legacyId = newId();
    run("INSERT INTO users (id, x_user_id, x_handle, name, created_at) VALUES (?, ?, ?, ?, ?)", legacyId, "local-oldtimer", "oldtimer", "oldtimer", nowIso());

    const blocked = await createAccount({ email: unique(), password: "password123", handle: "oldtimer" });
    expect(blocked.ok && blocked.userId).not.toBe(legacyId);

    const claimed = await createAccount({ email: unique(), password: "password123", handle: "OldTimer" }, { allowClaim: true });
    expect(claimed.ok && claimed.userId).toBe(legacyId);
  });
});

describe("password reset", () => {
  it("resets once, signs the user out everywhere, and burns the token", async () => {
    const email = unique();
    const acct = await createAccount({ email, password: "old-password", handle: "resetter" });
    if (!acct.ok) throw new Error(acct.error);
    run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", "sess-1", acct.userId, Date.now() + 60_000);

    const token = createResetToken(email);
    expect(token).toBeTruthy();
    expect(isResetTokenValid(token!)).toBe(true);

    expect(await resetPassword(token!, "short")).toEqual({ ok: false, error: expect.stringContaining("8 characters") });
    expect((await resetPassword(token!, "brand-new-password")).ok).toBe(true);

    expect(await authenticate(email, "old-password")).toBeNull();
    expect(await authenticate(email, "brand-new-password")).toBe(acct.userId);
    expect(get("SELECT 1 FROM sessions WHERE user_id = ?", acct.userId)).toBeUndefined();
    expect(isResetTokenValid(token!)).toBe(false);
    expect((await resetPassword(token!, "another-password")).ok).toBe(false);
  });

  it("returns no token for unknown emails and rejects made-up tokens", async () => {
    expect(createResetToken(unique())).toBeNull();
    expect(isResetTokenValid("made-up-token")).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const email = unique();
    await createAccount({ email, password: "password123", handle: "expiry" });
    const token = createResetToken(email)!;
    run("UPDATE password_resets SET expires_at = ?", Date.now() - 1);
    expect(isResetTokenValid(token)).toBe(false);
    expect((await resetPassword(token, "new-password-1")).ok).toBe(false);
  });

  it("stores only a hash of the token", async () => {
    const email = unique();
    await createAccount({ email, password: "password123", handle: "hashcheck" });
    const token = createResetToken(email)!;
    expect(get("SELECT 1 FROM password_resets WHERE token_hash = ?", token)).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("allows up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    expect([1, 2, 3].map(() => rateLimit(key, 3, 60_000))).toEqual([true, true, true]);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
  });
});
