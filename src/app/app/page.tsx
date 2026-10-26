import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getNiche, getSlots, listHistory, listPosts, listReady, postedCountSince } from "@/lib/posts";
import { localNow } from "@/lib/autopilot";
import { PLANS } from "@/lib/types";
import { toggleAutopilot } from "../actions";
import { PostNowButton } from "@/components/forms";
import { ReadyCard } from "@/components/ready";
import { oneClickMode } from "@/lib/env";

function nextSlot(slots: string[], timezone: string) {
  const { minutes } = localNow(timezone);
  const upcoming = slots.find((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) > minutes);
  return upcoming ? `today at ${upcoming}` : slots[0] ? `tomorrow at ${slots[0]}` : "no times set";
}

// Per-user page: render at request time.
export const instant = false;

export default async function Overview() {
  const user = await requireUser();
  if (!getNiche(user.id)) redirect("/app/setup");

  const plan = PLANS[user.plan];
  const queued = listPosts(user.id, "queued");
  const drafts = listPosts(user.id, "draft");
  const slots = getSlots(user.id);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const usedThisMonth = postedCountSince(user.id, monthStart);
  const recent = listHistory(user.id, 3);
  const on = user.autopilot === 1;
  const ready = listReady(user.id);

  const stats = [
    ["Queue", `${queued.length} post${queued.length === 1 ? "" : "s"}`, "/app/queue"],
    ["Drafts to review", String(drafts.length), "/app/drafts"],
    ["Posts this month", `${usedThisMonth} / ${plan.postsPerMonth}`, "/app/history"],
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      {ready.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-accent">Ready to post ({ready.length})</h2>
          {ready.map((p) => <ReadyCard key={p.id} post={p} />)}
        </section>
      )}

      <div className={`card flex flex-wrap items-center gap-4 ${on ? "border-ok/50" : ""}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className={`size-2.5 rounded-full ${on ? "bg-ok" : "bg-muted"}`} />
            Autopilot is {on ? "on" : "off"}
          </div>
          <p className="mt-1 text-sm text-muted">
            {on
              ? `Next post ${nextSlot(slots, user.timezone)} (${user.timezone}). ${queued.length ? "It will use your queue first." : "Queue is empty, so it will write one in your niche."}${oneClickMode ? " You'll get a reminder to publish it with one click." : ""}`
              : oneClickMode
                ? "Turn it on and X Studio gets a post ready at each of your scheduled times."
                : "Turn it on and X Studio posts at your scheduled times."}
          </p>
        </div>
        <form action={toggleAutopilot}>
          <input type="hidden" name="on" value={on ? "0" : "1"} />
          <button className={on ? "btn" : "btn btn-primary"}>{on ? "Pause autopilot" : "Turn on autopilot"}</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value, href]) => (
          <Link key={label} href={href} className="card hover:border-[#3a4150]">
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </Link>
        ))}
      </div>

      <div className="card space-y-3">
        <div className="font-semibold">{oneClickMode ? "Get a post ready now" : "Post right now"}</div>
        <p className="text-sm text-muted">
          {oneClickMode ? "Takes" : "Publishes"} the next queued post, or writes a fresh one if the queue is empty.
        </p>
        <PostNowButton oneClick={oneClickMode} />
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Latest activity</h2>
        {recent.length ? (
          <div className="space-y-3">
            {recent.map((p) => (
              <div key={p.id} className="card">
                <div className="mb-1 text-xs text-muted">
                  {p.status === "posted" ? "Posted" : "Failed"} · {new Date(p.posted_at ?? p.created_at).toLocaleString("en-GB", { timeZone: user.timezone, dateStyle: "medium", timeStyle: "short" })}
                </div>
                <p className="whitespace-pre-wrap">{p.text || <span className="text-muted">(no text)</span>}</p>
                {p.error && <p className="mt-1 text-sm text-bad">{p.error}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing posted yet.</p>
        )}
      </div>
    </div>
  );
}
