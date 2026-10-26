import "server-only";
import { all, get, newId, nowIso, run } from "./db";
import { writePost } from "./ai";
import { publishPost } from "./x";
import { oneClickMode } from "./env";
import { getNiche, getSlots, postedCountSince, recentTexts } from "./posts";
import { PLANS, type Post, type User } from "./types";

// A slot fires if its time passed within this window. Longer outages skip missed
// slots instead of posting a burst when the worker comes back.
const CATCH_UP_MINUTES = 30;

/** Local date ("2026-10-26") and minutes since midnight for a timezone. */
export function localNow(timezone: string, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export type RunResult = { userId: string; slot: string; status: "posted" | "ready" | "failed" | "skipped"; detail: string };

/** Claims the slot by inserting/updating a row with a unique (user_id, slot_key); returns null if already claimed. */
function claimSlot(user: User, slotKey: string): Post | null {
  try {
    const queued = get<Post>(
      "SELECT * FROM posts WHERE user_id = ? AND status = 'queued' ORDER BY position LIMIT 1",
      user.id,
    );
    if (queued) {
      const res = run(
        "UPDATE posts SET status = 'posting', slot_key = ? WHERE id = ? AND status = 'queued'",
        slotKey, queued.id,
      );
      return res.changes ? { ...queued, status: "posting", slot_key: slotKey } : null;
    }
    const id = newId();
    run(
      "INSERT INTO posts (id, user_id, text, status, slot_key, created_at) VALUES (?, ?, '', 'posting', ?, ?)",
      id, user.id, slotKey, nowIso(),
    );
    return get<Post>("SELECT * FROM posts WHERE id = ?", id) ?? null;
  } catch (err) {
    if (String(err).includes("UNIQUE")) return null; // another run already took this slot
    throw err;
  }
}

async function fireSlot(user: User, slotKey: string): Promise<RunResult> {
  const base = { userId: user.id, slot: slotKey };
  const plan = PLANS[user.plan] ?? PLANS.free;
  const local = localNow(user.timezone);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  if (postedCountSince(user.id, monthStart) >= plan.postsPerMonth) {
    return { ...base, status: "skipped", detail: `Monthly limit reached (${plan.postsPerMonth} posts on the ${plan.label} plan)` };
  }
  const dayStart = new Date(Date.now() - local.minutes * 60_000).toISOString();
  if (postedCountSince(user.id, dayStart) >= plan.postsPerDay) {
    return { ...base, status: "skipped", detail: `Daily limit reached (${plan.postsPerDay} post${plan.postsPerDay > 1 ? "s" : ""} a day on the ${plan.label} plan)` };
  }

  const niche = getNiche(user.id);
  if (!niche) return { ...base, status: "skipped", detail: "Niche not set up" };

  const post = claimSlot(user, slotKey);
  if (!post) return { ...base, status: "skipped", detail: "Slot already handled" };

  try {
    let { text } = post;
    if (!text) {
      const written = await writePost(niche, recentTexts(user.id));
      text = written.text;
      run("UPDATE posts SET text = ?, topic = ?, format = ? WHERE id = ?", text, written.topic, written.format, post.id);
    }
    if (oneClickMode) {
      // Free mode: hand the post to the user to publish with one click.
      run("UPDATE posts SET status = 'ready', error = NULL WHERE id = ?", post.id);
      return { ...base, status: "ready", detail: text };
    }
    const xId = await publishPost(user.id, text);
    run("UPDATE posts SET status = 'posted', x_post_id = ?, posted_at = ?, error = NULL WHERE id = ?", xId, nowIso(), post.id);
    return { ...base, status: "posted", detail: text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    run("UPDATE posts SET status = 'failed', error = ?, posted_at = ? WHERE id = ?", message, nowIso(), post.id);
    return { ...base, status: "failed", detail: message };
  }
}

/** Posts for every user whose slot is due. Safe to call as often as you like. */
export async function runAutopilot(at = new Date()): Promise<RunResult[]> {
  const users = all<User>("SELECT * FROM users WHERE autopilot = 1");
  const results: RunResult[] = [];
  for (const user of users) {
    const local = localNow(user.timezone, at);
    for (const time of getSlots(user.id)) {
      const late = local.minutes - toMinutes(time);
      if (late < 0 || late > CATCH_UP_MINUTES) continue;
      const slotKey = `${local.date}T${time}`;
      const done = get("SELECT 1 FROM posts WHERE user_id = ? AND slot_key = ?", user.id, slotKey);
      if (done) continue;
      results.push(await fireSlot(user, slotKey));
    }
  }
  return results;
}

/** "Post now" from the dashboard: same pipeline, outside the schedule. */
export async function postNow(user: User): Promise<RunResult> {
  return fireSlot(user, `manual-${Date.now()}`);
}
