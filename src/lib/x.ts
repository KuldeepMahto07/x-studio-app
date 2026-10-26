import "server-only";
import { get, run } from "./db";
import { decrypt, encrypt, randomToken, sha256base64url } from "./crypto";
import { demoMode, env } from "./env";

// X API v2 with OAuth 2.0 Authorization Code + PKCE.
const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const API = "https://api.x.com/2";
const SCOPES = "tweet.read tweet.write users.read offline.access";
export const redirectUri = () => `${env.appUrl}/api/auth/x/callback`;

export function buildAuthorizeUrl(): string {
  const state = randomToken(16);
  const verifier = randomToken(48);
  run("DELETE FROM oauth_states WHERE created_at < ?", Date.now() - 15 * 60_000);
  run("INSERT INTO oauth_states (state, verifier, created_at) VALUES (?, ?, ?)", state, verifier, Date.now());
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.xClientId,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state,
    code_challenge: sha256base64url(verifier),
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params}`;
}

/** Returns the PKCE verifier for a state and deletes it (one use only). */
export function consumeState(state: string): string | null {
  const row = get<{ verifier: string; created_at: number }>("SELECT verifier, created_at FROM oauth_states WHERE state = ?", state);
  run("DELETE FROM oauth_states WHERE state = ?", state);
  if (!row || row.created_at < Date.now() - 15 * 60_000) return null;
  return row.verifier;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (env.xClientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${env.xClientId}:${env.xClientSecret}`).toString("base64")}`;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body: new URLSearchParams({ client_id: env.xClientId, ...body }),
  });
  if (!res.ok) throw new Error(`X token request failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export function exchangeCode(code: string, verifier: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: verifier });
}

export function saveTokens(userId: string, t: TokenResponse) {
  run(
    `INSERT INTO x_tokens (user_id, access_enc, refresh_enc, expires_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET access_enc = excluded.access_enc,
       refresh_enc = COALESCE(excluded.refresh_enc, x_tokens.refresh_enc), expires_at = excluded.expires_at`,
    userId,
    encrypt(t.access_token),
    t.refresh_token ? encrypt(t.refresh_token) : null,
    Date.now() + t.expires_in * 1000,
  );
}

async function accessTokenFor(userId: string): Promise<string> {
  const row = get<{ access_enc: string; refresh_enc: string | null; expires_at: number }>(
    "SELECT access_enc, refresh_enc, expires_at FROM x_tokens WHERE user_id = ?",
    userId,
  );
  if (!row) throw new Error("X account not connected. Sign in with X again.");
  if (row.expires_at > Date.now() + 60_000) return decrypt(row.access_enc);
  if (!row.refresh_enc) throw new Error("X session expired. Sign in with X again.");
  const fresh = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(row.refresh_enc) });
  saveTokens(userId, fresh);
  return fresh.access_token;
}

export async function fetchMe(accessToken: string) {
  const res = await fetch(`${API}/users/me?user.fields=profile_image_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`X profile request failed (${res.status})`);
  const { data } = (await res.json()) as { data: { id: string; username: string; name: string; profile_image_url?: string } };
  return { id: data.id, username: data.username, name: data.name, avatar: data.profile_image_url ?? null };
}

/** Publishes a post and returns its X id. In demo mode nothing is sent to X. */
export async function publishPost(userId: string, text: string): Promise<string> {
  if (demoMode) return `demo-${Date.now()}`;
  const token = await accessTokenFor(userId);
  const res = await fetch(`${API}/tweets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`X rejected the post (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const { data } = (await res.json()) as { data: { id: string } };
  return data.id;
}
