"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { createSession, destroySession, requireUser, upsertXUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { oneClickMode } from "@/lib/env";
import { writePost } from "@/lib/ai";
import { postNow as firePostNow } from "@/lib/autopilot";
import {
  addDraft, deletePost, getNiche, markPosted, movePost, queuePost, recentTexts, saveNiche, unreadyPost,
  saveSchedule, setAutopilot, updatePostText, validateText,
} from "@/lib/posts";
import { PLANS, type Plan } from "@/lib/types";

export type ActionState = { ok?: string; error?: string; values?: Record<string, string> } | null;

/** Error result that echoes the submitted fields, so the form can show them again after React resets it. */
function fail(fd: FormData, error: string): ActionState {
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (!k.startsWith("$") && typeof v === "string") values[k] = v;
  return { error, values };
}

// Browsers submit textarea line breaks as \r\n; normalise so X's 280-character count matches what you see.
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").replace(/\r\n?/g, "\n").trim();
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

// ---------- auth ----------

/** One-click mode has no X API, so accounts are local: pick the handle you post as. */
export async function localLogin(fd: FormData) {
  if (!oneClickMode) throw new Error("Local accounts are disabled when X API credentials are configured.");
  const handle = str(fd, "handle").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
  if (!handle) redirect("/?error=" + encodeURIComponent("Enter your X handle."));
  const userId = upsertXUser({ id: `local-${handle.toLowerCase()}`, username: handle, name: handle });
  await createSession(userId);
  redirect(getNiche(userId) ? "/app" : "/app/setup");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}

// ---------- niche ----------

export async function saveNicheAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const niche = {
    niche: str(fd, "niche"),
    audience: str(fd, "audience"),
    voice: str(fd, "voice"),
    topics: lines(str(fd, "topics")),
    formats: lines(str(fd, "formats")),
  };
  if (!niche.niche) return fail(fd, "Describe your niche.");
  if (!niche.audience) return fail(fd, "Describe who you're writing for.");
  if (!niche.voice) return fail(fd, "Describe your voice.");
  if (niche.topics.length < 3) return fail(fd, "Add at least 3 topics, one per line.");
  if (!niche.formats.length) return fail(fd, "Add at least one post format.");
  const firstTime = !getNiche(user.id);
  saveNiche(user.id, niche);
  if (firstTime) redirect("/app/drafts?welcome=1");
  return { ok: "Saved." };
}

// ---------- drafts & queue ----------

export async function generateDrafts(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const niche = getNiche(user.id);
  if (!niche) redirect("/app/setup");
  const count = Math.min(Math.max(Number(fd.get("count")) || 3, 1), 5);
  const recent = recentTexts(user.id);
  try {
    for (let i = 0; i < count; i++) {
      const post = await writePost(niche, recent);
      addDraft(user.id, post);
      recent.unshift(post.text);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't write drafts." };
  }
  refresh();
  return { ok: `Wrote ${count} draft${count > 1 ? "s" : ""}.` };
}

export async function queueAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const text = str(fd, "text");
  const problem = validateText(text);
  if (problem) return fail(fd, problem);
  queuePost(user.id, text, str(fd, "id") || undefined);
  refresh();
  return { ok: "Added to queue." };
}

export async function saveTextAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const text = str(fd, "text");
  const problem = validateText(text);
  if (problem) return fail(fd, problem);
  updatePostText(user.id, str(fd, "id"), text);
  refresh();
  return { ok: "Saved." };
}

export async function deleteAction(fd: FormData) {
  const user = await requireUser();
  deletePost(user.id, str(fd, "id"));
  refresh();
}

// Separate actions per direction: React replaces a button's `name` when it has its own formAction,
// so a name/value pair on the button never reaches the server.
export async function moveUpAction(fd: FormData) {
  const user = await requireUser();
  movePost(user.id, str(fd, "id"), -1);
  refresh();
}

export async function moveDownAction(fd: FormData) {
  const user = await requireUser();
  movePost(user.id, str(fd, "id"), 1);
  refresh();
}

// ---------- autopilot ----------

export async function toggleAutopilot(fd: FormData) {
  const user = await requireUser();
  setAutopilot(user.id, str(fd, "on") === "1");
  refresh();
}

export async function postNowAction(): Promise<ActionState> {
  const user = await requireUser();
  const result = await firePostNow(user);
  refresh();
  if (result.status === "posted") return { ok: "Posted!" };
  if (result.status === "ready") return { ok: "Ready! Click Post on X above." };
  return { error: result.detail };
}

export async function saveScheduleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const timezone = str(fd, "timezone");
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return fail(fd, `Unknown timezone "${timezone}".`);
  }
  const requested = fd.getAll("slot").map(String).filter((s) => s.trim());
  const saved = saveSchedule(user.id, user.plan, timezone, requested);
  if (!saved.length) return { error: "Add at least one posting time." };
  refresh();
  const limit = PLANS[user.plan].maxSlots;
  return {
    ok: requested.length > saved.length
      ? `Saved. Your ${PLANS[user.plan].label} plan allows ${limit} time${limit > 1 ? "s" : ""} a day.`
      : "Saved.",
  };
}

// ---------- one-click posting ----------

export async function markPostedAction(fd: FormData) {
  const user = await requireUser();
  markPosted(user.id, str(fd, "id"));
  refresh();
}

export async function skipReadyAction(fd: FormData) {
  const user = await requireUser();
  unreadyPost(user.id, str(fd, "id"));
  refresh();
}

/** Billing isn't wired yet; in one-click (local) mode this lets you switch plans freely. */
export async function setPlanAction(fd: FormData) {
  const user = await requireUser();
  if (!oneClickMode) return;
  const plan = str(fd, "plan") as Plan;
  if (!(plan in PLANS)) return;
  run("UPDATE users SET plan = ? WHERE id = ?", plan, user.id);
  refresh();
}
