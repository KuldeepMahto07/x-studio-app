import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { oneClickMode } from "@/lib/env";
import { getNiche, getSlots, listHistory, listPosts, listReady, postedCountSince } from "@/lib/posts";
import { localNow } from "@/lib/autopilot";
import { PLANS } from "@/lib/types";
import { AutopilotSwitch, PostNowButton } from "@/components/forms";
import { ReadyCard } from "@/components/ready";
import { LargeTitle, Ring } from "@/components/ui";
import { IconCheck, IconChevron, IconExclaim, IconList, IconSparkles } from "@/components/icons";

function nextSlot(slots: string[], timezone: string) {
  const { minutes } = localNow(timezone);
  const upcoming = slots.find((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) > minutes);
  return upcoming ? `Today at ${upcoming}` : slots[0] ? `Tomorrow at ${slots[0]}` : "No times set";
}

function greeting(timezone: string) {
  const h = Math.floor(localNow(timezone).minutes / 60);
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// Per-user page: render at request time.
export const instant = false;

export default async function Home() {
  const user = await requireUser();
  if (!getNiche(user.id)) redirect("/app/setup");

  const plan = PLANS[user.plan];
  const queued = listPosts(user.id, "queued");
  const drafts = listPosts(user.id, "draft");
  const ready = listReady(user.id);
  const slots = getSlots(user.id);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const used = postedCountSince(user.id, monthStart);
  const recent = listHistory(user.id, 4);
  const on = user.autopilot === 1;
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: user.timezone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <LargeTitle title="Home" subtitle={`${greeting(user.timezone)}, @${user.x_handle}`} />

      <div className="space-y-7">
        {ready.length > 0 && (
          <section className="space-y-3">
            {ready.map((p, i) => <ReadyCard key={p.id} post={p} index={i} />)}
          </section>
        )}

        <section className="animate-rise">
          <div className="group-list">
            <div className="row py-3">
              <span className={`grid size-9 place-items-center rounded-[9px] text-white transition-colors ${on ? "bg-ok" : "bg-[#8e8e93]"}`}>
                <IconSparkles width={20} height={20} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">Autopilot</span>
                <span className="block text-[13px] text-muted">{on ? `Next: ${nextSlot(slots, user.timezone)}` : "Paused"}</span>
              </span>
              <AutopilotSwitch on={on} />
            </div>
          </div>
          <p className="section-footer">
            {on
              ? `${queued.length ? "Uses your queue first, then writes in your niche." : "Queue is empty, so it will write a post in your niche."}${oneClickMode ? " You'll get a reminder to post it with one tap." : ""}`
              : "Turn on to get a post ready at each of your scheduled times."}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Link href="/app/history" className="card pressable col-span-2 flex animate-rise items-center gap-4 sm:col-span-1 sm:flex-col sm:items-start" style={{ animationDelay: "60ms" }}>
            <Ring value={used} max={plan.postsPerMonth} size={58}>{used}</Ring>
            <span>
              <span className="block text-[13px] font-semibold uppercase tracking-wide text-purple">This month</span>
              <span className="block text-[15px] text-muted">{used} of {plan.postsPerMonth} posts</span>
            </span>
          </Link>
          <Link href="/app/queue" className="card pressable animate-rise" style={{ animationDelay: "120ms" }}>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-accent"><IconList width={16} height={16} /> Queue</span>
            <span className="mt-1 block text-[34px] font-bold leading-none tabular-nums">{queued.length}</span>
            <span className="text-[13px] text-muted">waiting</span>
          </Link>
          <Link href="/app/drafts" className="card pressable animate-rise" style={{ animationDelay: "180ms" }}>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-warn"><IconSparkles width={16} height={16} /> Drafts</span>
            <span className="mt-1 block text-[34px] font-bold leading-none tabular-nums">{drafts.length}</span>
            <span className="text-[13px] text-muted">to review</span>
          </Link>
        </section>

        <section className="animate-rise" style={{ animationDelay: "220ms" }}>
          <PostNowButton oneClick={oneClickMode} />
          <p className="section-footer text-center">Takes the next queued post, or writes a fresh one.</p>
        </section>

        <section className="animate-rise" style={{ animationDelay: "260ms" }}>
          <div className="mb-1.5 flex items-baseline justify-between px-4">
            <h2 className="text-[13px] uppercase tracking-wide text-muted">Recent</h2>
            <Link href="/app/history" className="text-[15px] text-accent">See All</Link>
          </div>
          {recent.length ? (
            <div className="group-list" style={{ ["--sep-inset" as string]: "56px" }}>
              {recent.map((p) => (
                <Link key={p.id} href="/app/history" className="row-link">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-white ${p.status === "posted" ? "bg-ok" : "bg-bad"}`}>
                    {p.status === "posted" ? <IconCheck width={15} height={15} /> : <IconExclaim width={15} height={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px]">{p.text || "(no text)"}</span>
                    <span className="block text-[13px] text-muted">{p.status === "posted" ? "Posted" : "Failed"} · {fmt(p.posted_at ?? p.created_at)}</span>
                  </span>
                  <IconChevron className="text-faint" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center text-[15px] text-muted">Nothing posted yet.</div>
          )}
        </section>
      </div>
    </>
  );
}
