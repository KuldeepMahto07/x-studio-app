import { requireUser } from "@/lib/auth";
import { listHistory } from "@/lib/posts";
import { LargeTitle } from "@/components/ui";
import { IconCheck, IconClock, IconExclaim } from "@/components/icons";
import type { Post } from "@/lib/types";

// Per-user page: render at request time.
export const instant = false;

/** Groups posts into Today / Yesterday / dated sections in the user's timezone. */
function groupByDay(posts: Post[], timezone: string) {
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: timezone });
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const groups = new Map<string, Post[]>();
  for (const p of posts) {
    const d = new Date(p.posted_at ?? p.created_at);
    const key = dayKey(d);
    const label = key === today ? "Today" : key === yesterday ? "Yesterday" : d.toLocaleDateString("en-GB", { timeZone: timezone, weekday: "long", day: "numeric", month: "long" });
    groups.set(label, [...(groups.get(label) ?? []), p]);
  }
  return [...groups.entries()];
}

export default async function HistoryPage() {
  const user = await requireUser();
  const posts = listHistory(user.id);
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: user.timezone, hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <LargeTitle title="History" />
      {posts.length ? (
        <div className="space-y-7">
          {groupByDay(posts, user.timezone).map(([label, items], gi) => (
            <section key={label} className="animate-rise" style={{ animationDelay: `${gi * 60}ms` }}>
              <h2 className="section-header">{label}</h2>
              <div className="group-list" style={{ ["--sep-inset" as string]: "56px" }}>
                {items.map((p) => (
                  <div key={p.id} className="row items-start py-3">
                    <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-white ${p.status === "posted" ? "bg-ok" : "bg-bad"}`}>
                      {p.status === "posted" ? <IconCheck width={15} height={15} /> : <IconExclaim width={15} height={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-pre-wrap text-[16px] leading-[1.35]">{p.text || "(no text)"}</span>
                      {p.error && <span className="mt-1 block text-[13px] text-bad">{p.error}</span>}
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                        {time(p.posted_at ?? p.created_at)}
                        <span className="chip">{p.topic}</span>
                        {p.x_post_id && (
                          <a href={`https://x.com/i/status/${p.x_post_id}`} target="_blank" rel="noreferrer" className="text-accent">View on X</a>
                        )}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex animate-rise flex-col items-center px-6 py-16 text-center">
          <span className="mb-4 grid size-16 place-items-center rounded-2xl bg-fill text-muted"><IconClock width={32} height={32} /></span>
          <p className="text-[20px] font-semibold">No Posts Yet</p>
          <p className="mt-1 max-w-xs text-[15px] text-muted">Everything you publish shows up here.</p>
        </div>
      )}
    </>
  );
}
