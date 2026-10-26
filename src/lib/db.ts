import "server-only";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Local SQLite file. For hosted deployments, swap this module for Postgres;
// everything else talks to the database only through the helpers below.
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  x_user_id   TEXT UNIQUE NOT NULL,
  x_handle    TEXT NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  autopilot   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS x_tokens (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_enc  TEXT NOT NULL,
  refresh_enc TEXT,
  expires_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state       TEXT PRIMARY KEY,
  verifier    TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS niche (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  niche       TEXT NOT NULL,
  audience    TEXT NOT NULL,
  voice       TEXT NOT NULL,
  topics      TEXT NOT NULL,
  formats     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slots (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time        TEXT NOT NULL,
  PRIMARY KEY (user_id, time)
);
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  topic       TEXT NOT NULL DEFAULT 'manual',
  format      TEXT NOT NULL DEFAULT 'manual',
  status      TEXT NOT NULL,
  position    REAL,
  slot_key    TEXT,
  x_post_id   TEXT,
  error       TEXT,
  created_at  TEXT NOT NULL,
  posted_at   TEXT,
  UNIQUE (user_id, slot_key)
);
CREATE INDEX IF NOT EXISTS posts_user_status ON posts (user_id, status, position);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,
  used        INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_sub_id  TEXT NOT NULL,
  customer_id      TEXT,
  plan             TEXT NOT NULL,
  status           TEXT NOT NULL,
  renews_at        TEXT,
  ends_at          TEXT,
  portal_url       TEXT,
  updated_at       TEXT NOT NULL
);
`;

// Columns added after the first release. SQLite has no "ADD COLUMN IF NOT EXISTS", so check first.
const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ["users", "email", "TEXT"],
  ["users", "password_hash", "TEXT"],
];

function migrate(db: DatabaseSync) {
  for (const [table, column, definition] of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users (email) WHERE email IS NOT NULL");
}

function open(): DatabaseSync {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

const globalForDb = globalThis as unknown as { __xstudioDb?: DatabaseSync };
export const db = globalForDb.__xstudioDb ?? (globalForDb.__xstudioDb = open());

// node:sqlite returns null-prototype rows; React can't pass those to Client Components, so copy into plain objects.
const plain = <T,>(row: unknown) => (row ? { ...(row as object) } : undefined) as T;

export function get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return plain<T | undefined>(db.prepare(sql).get(...params));
}

export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params).map((row) => plain<T>(row));
}

export function run(sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
