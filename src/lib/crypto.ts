import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// AES-256-GCM for X tokens at rest. ENCRYPTION_KEY is required in production.
function key(): Buffer {
  if (!env.encryptionKey) {
    if (env.isProd) throw new Error("ENCRYPTION_KEY must be set in production");
    return createHash("sha256").update("x-studio-dev-only-key").digest();
  }
  return createHash("sha256").update(env.encryptionKey).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((s) => Buffer.from(s, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256base64url = (s: string) => createHash("sha256").update(s).digest("base64url");
