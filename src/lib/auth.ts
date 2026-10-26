import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { get, run, newId, nowIso } from "./db";
import { randomToken } from "./crypto";
import { env } from "./env";
import type { User } from "./types";

const COOKIE = "xs_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const id = randomToken();
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", id, userId, expires);
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) run("DELETE FROM sessions WHERE id = ?", id);
  jar.delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  await connection(); // session checks compare against the current time, so always render at request time
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const user = get<User>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    id,
    Date.now(),
  );
  return user ?? null;
}

/** For pages and server actions: returns the signed-in user or redirects to sign-in. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Attach an X account to an existing (email) user. Fails if that X account belongs to someone else. */
export function linkXAccount(userId: string, x: { id: string; username: string; name: string; avatar?: string | null }): { ok: true } | { ok: false; error: string } {
  const owner = get<{ id: string }>("SELECT id FROM users WHERE x_user_id = ?", x.id);
  if (owner && owner.id !== userId) return { ok: false, error: "That X account is already connected to another X Studio account." };
  run("UPDATE users SET x_user_id = ?, x_handle = ?, name = ?, avatar_url = ? WHERE id = ?", x.id, x.username, x.name, x.avatar ?? null, userId);
  return { ok: true };
}

/** Create or update the user for an X account and return their id. */
export function upsertXUser(x: { id: string; username: string; name: string; avatar?: string | null }): string {
  const existing = get<{ id: string }>("SELECT id FROM users WHERE x_user_id = ?", x.id);
  if (existing) {
    run("UPDATE users SET x_handle = ?, name = ?, avatar_url = ? WHERE id = ?", x.username, x.name, x.avatar ?? null, existing.id);
    return existing.id;
  }
  const id = newId();
  run(
    "INSERT INTO users (id, x_user_id, x_handle, name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id, x.id, x.username, x.name, x.avatar ?? null, nowIso(),
  );
  for (const time of ["09:00"]) run("INSERT INTO slots (user_id, time) VALUES (?, ?)", id, time);
  return id;
}
