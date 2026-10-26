import "server-only";
import { all, get, newId, nowIso, run, transaction } from "./db";
import { MAX_POST_LEN, PLANS, type Niche, type Plan, type Post } from "./types";

// Every function takes the owner's userId and filters by it, so one user can never touch another's data.

export const DEFAULT_NICHE: Niche = {
  niche: "",
  audience: "",
  voice: "Clear, practical, slightly punchy. Sounds like a builder sharing what works, not a marketer.",
  topics: [],
  formats: [
    "a single useful tip",
    "a short numbered list (3 items)",
    "a contrarian opinion with one reason",
    "a question to spark replies",
    "before vs after",
    "a mini how-to in 3 steps",
  ],
};

export function getNiche(userId: string): Niche | null {
  const row = get<{ niche: string; audience: string; voice: string; topics: string; formats: string }>(
    "SELECT niche, audience, voice, topics, formats FROM niche WHERE user_id = ?",
    userId,
  );
  if (!row) return null;
  return { ...row, topics: JSON.parse(row.topics), formats: JSON.parse(row.formats) };
}

export function saveNiche(userId: string, n: Niche) {
  run(
    `INSERT INTO niche (user_id, niche, audience, voice, topics, formats) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET niche = excluded.niche, audience = excluded.audience,
       voice = excluded.voice, topics = excluded.topics, formats = excluded.formats`,
    userId, n.niche, n.audience, n.voice, JSON.stringify(n.topics), JSON.stringify(n.formats),
  );
}

export const listPosts = (userId: string, status: Post["status"]) =>
  all<Post>(
    `SELECT * FROM posts WHERE user_id = ? AND status = ?
     ORDER BY ${status === "queued" ? "position ASC" : "created_at DESC"}`,
    userId,
    status,
  );

export const listHistory = (userId: string, limit = 100) =>
  all<Post>(
    "SELECT * FROM posts WHERE user_id = ? AND status IN ('posted', 'failed') ORDER BY COALESCE(posted_at, created_at) DESC LIMIT ?",
    userId,
    limit,
  );

export const recentTexts = (userId: string) =>
  all<{ text: string }>(
    "SELECT text FROM posts WHERE user_id = ? AND status IN ('posted', 'queued') ORDER BY created_at DESC LIMIT 20",
    userId,
  ).map((r) => r.text);

export function addDraft(userId: string, d: { text: string; topic: string; format: string }) {
  run(
    "INSERT INTO posts (id, user_id, text, topic, format, status, created_at) VALUES (?, ?, ?, ?, ?, 'draft', ?)",
    newId(), userId, d.text, d.topic, d.format, nowIso(),
  );
}

function nextQueuePosition(userId: string): number {
  return (get<{ p: number | null }>("SELECT MAX(position) p FROM posts WHERE user_id = ? AND status = 'queued'", userId)?.p ?? 0) + 1;
}

export function validateText(text: string): string | null {
  const t = text.trim();
  if (!t) return "Post can't be empty.";
  if (t.length > MAX_POST_LEN) return `Post is ${t.length} characters; the limit is ${MAX_POST_LEN}.`;
  return null;
}

/** Moves a draft to the end of the queue (saving any edits), or queues a new manual post. */
export function queuePost(userId: string, text: string, draftId?: string) {
  const position = nextQueuePosition(userId);
  if (draftId) {
    run(
      "UPDATE posts SET text = ?, status = 'queued', position = ? WHERE id = ? AND user_id = ? AND status = 'draft'",
      text.trim(), position, draftId, userId,
    );
  } else {
    run(
      "INSERT INTO posts (id, user_id, text, status, position, created_at) VALUES (?, ?, ?, 'queued', ?, ?)",
      newId(), userId, text.trim(), position, nowIso(),
    );
  }
}

export function updatePostText(userId: string, postId: string, text: string) {
  run("UPDATE posts SET text = ? WHERE id = ? AND user_id = ? AND status IN ('draft', 'queued')", text.trim(), postId, userId);
}

export function deletePost(userId: string, postId: string) {
  run("DELETE FROM posts WHERE id = ? AND user_id = ? AND status IN ('draft', 'queued')", postId, userId);
}

/** Swaps a queued post with its neighbour above (-1) or below (+1). */
export function movePost(userId: string, postId: string, dir: -1 | 1) {
  transaction(() => {
    const queue = listPosts(userId, "queued");
    const i = queue.findIndex((p) => p.id === postId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= queue.length) return;
    run("UPDATE posts SET position = ? WHERE id = ?", queue[j].position, queue[i].id);
    run("UPDATE posts SET position = ? WHERE id = ?", queue[i].position, queue[j].id);
  });
}

export const getSlots = (userId: string) =>
  all<{ time: string }>("SELECT time FROM slots WHERE user_id = ? ORDER BY time", userId).map((r) => r.time);

export function saveSchedule(userId: string, plan: Plan, timezone: string, times: string[]) {
  const valid = [...new Set(times.filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort().slice(0, PLANS[plan].maxSlots);
  transaction(() => {
    run("UPDATE users SET timezone = ? WHERE id = ?", timezone, userId);
    run("DELETE FROM slots WHERE user_id = ?", userId);
    for (const t of valid) run("INSERT INTO slots (user_id, time) VALUES (?, ?)", userId, t);
  });
  return valid;
}

export function setAutopilot(userId: string, on: boolean) {
  run("UPDATE users SET autopilot = ? WHERE id = ?", on ? 1 : 0, userId);
}

/** Posts that count toward plan limits: published, being published, or prepared for one-click posting. */
export function postedCountSince(userId: string, sinceIso: string): number {
  return get<{ n: number }>(
    "SELECT COUNT(*) n FROM posts WHERE user_id = ? AND status IN ('posted', 'posting', 'ready') AND COALESCE(posted_at, created_at) >= ?",
    userId,
    sinceIso,
  )?.n ?? 0;
}

export const listReady = (userId: string) =>
  all<Post>("SELECT * FROM posts WHERE user_id = ? AND status = 'ready' ORDER BY created_at", userId);

/** One-click mode: the user opened X's composer for this post, so record it as posted. */
export function markPosted(userId: string, postId: string) {
  run("UPDATE posts SET status = 'posted', posted_at = ? WHERE id = ? AND user_id = ? AND status = 'ready'", nowIso(), postId, userId);
}

/** One-click mode: the user skipped a prepared post; put it back at the front of the queue. */
export function unreadyPost(userId: string, postId: string) {
  const first = get<{ p: number | null }>("SELECT MIN(position) p FROM posts WHERE user_id = ? AND status = 'queued'", userId)?.p ?? 1;
  run(
    "UPDATE posts SET status = 'queued', slot_key = NULL, position = ? WHERE id = ? AND user_id = ? AND status = 'ready'",
    first - 1, postId, userId,
  );
}
