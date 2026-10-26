"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { authenticate, createAccount, createResetToken, normalizeEmail, rateLimit, resetPassword, validateEmail } from "@/lib/accounts";
import { cancelTestSubscription, completeTestCheckout, createCheckoutUrl } from "@/lib/billing";
import { sendMail } from "@/lib/mail";
import { env } from "@/lib/env";
import { writePost } from "@/lib/ai";
import { postNow as firePostNow } from "@/lib/autopilot";
import {
  addDraft, deletePost, getNiche, markPosted, movePost, queuePost, recentTexts, saveNiche, unreadyPost,
  saveSchedule, setAutopilot, updatePostText, validateText,
} from "@/lib/posts";
import { PLANS } from "@/lib/types";

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

/** Never echo passwords back to the browser. */
function withoutPassword(fd: FormData) {
  const copy = new FormData();
  for (const [k, v] of fd.entries()) if (!/password|confirm/i.test(k)) copy.append(k, v);
  return copy;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

// ---------- auth ----------

export async function signUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email");
  if (!rateLimit(`signup:${await clientIp()}`, 10, 60 * 60_000)) return fail(fd, "Too many sign-ups from this network. Try again later.");
  // Locally, an old handle-only account can be upgraded to email sign-in; never online.
  const result = await createAccount({ email, password: String(fd.get("password") ?? ""), handle: str(fd, "handle") }, { allowClaim: !env.isProd });
  if (!result.ok) return fail(withoutPassword(fd), result.error);
  await createSession(result.userId);
  redirect(getNiche(result.userId) ? "/app" : "/app/setup");
}

export async function signInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = normalizeEmail(str(fd, "email"));
  if (!rateLimit(`signin:${email}`, 8, 15 * 60_000) || !rateLimit(`signin-ip:${await clientIp()}`, 30, 15 * 60_000)) {
    return fail(withoutPassword(fd), "Too many attempts. Wait 15 minutes and try again.");
  }
  const userId = await authenticate(email, String(fd.get("password") ?? ""));
  if (!userId) return fail(withoutPassword(fd), "Wrong email or password.");
  await createSession(userId);
  const next = str(fd, "next");
  redirect(next.startsWith("/app") ? next : getNiche(userId) ? "/app" : "/app/setup");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = normalizeEmail(str(fd, "email"));
  const problem = validateEmail(email);
  if (problem) return fail(fd, problem);
  // Same answer whether or not the account exists, so this can't be used to discover emails.
  const done = { ok: "If that email has an account, a reset link is on its way. It works for 30 minutes." };
  if (!rateLimit(`forgot:${email}`, 3, 15 * 60_000)) return done;
  const token = createResetToken(email);
  if (token) {
    const link = `${env.appUrl}/reset?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your X Studio password",
      text: `Reset your password: ${link}
This link works once and expires in 30 minutes. If you didn't ask for this, ignore this email.`,
      html: `<p>Reset your X Studio password:</p><p><a href="${link}">Choose a new password</a></p><p>This link works once and expires in 30 minutes. If you didn't ask for this, ignore this email.</p>`,
    });
  }
  return done;
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = String(fd.get("password") ?? "");
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const result = await resetPassword(str(fd, "token"), password);
  if (!result.ok) return { error: result.error };
  await createSession(result.userId);
  redirect("/app?reset=1");
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

// ---------- billing ----------

export async function startCheckoutAction(fd: FormData) {
  const user = await requireUser();
  const plan = str(fd, "plan");
  if (plan !== "pro" && plan !== "creator") return;
  redirect(await createCheckoutUrl(user, plan, env.appUrl));
}

/** Local development only: the test checkout's "Pay" button. */
export async function completeTestCheckoutAction(fd: FormData) {
  const user = await requireUser();
  const plan = str(fd, "plan");
  if (plan !== "pro" && plan !== "creator") return;
  completeTestCheckout(user.id, plan);
  redirect(`/app/settings?upgraded=${plan}`);
}

/** Local development only: simulate cancelling in the customer portal. */
export async function cancelTestSubscriptionAction(fd: FormData) {
  const user = await requireUser();
  cancelTestSubscription(user.id, str(fd, "immediately") === "1");
  refresh();
}
