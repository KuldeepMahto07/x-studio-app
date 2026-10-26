import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPosts } from "@/lib/posts";
import { QueueRow } from "@/components/forms";
import { LargeTitle } from "@/components/ui";
import { IconList } from "@/components/icons";

// Per-user page: render at request time.
export const instant = false;

export default async function QueuePage() {
  const user = await requireUser();
  const queue = listPosts(user.id, "queued");
  return (
    <>
      <LargeTitle title="Queue" subtitle={queue.length ? `${queue.length} post${queue.length === 1 ? "" : "s"} waiting` : undefined} />
      {queue.length ? (
        <section className="animate-rise">
          <div className="group-list" style={{ ["--sep-inset" as string]: "52px" }}>
            {queue.map((p, i) => <QueueRow key={p.id} post={p} index={i} total={queue.length} />)}
          </div>
          <p className="section-footer">Tap to edit or reorder. Swipe left to delete. Autopilot posts from the top.</p>
        </section>
      ) : (
        <div className="flex animate-rise flex-col items-center px-6 py-16 text-center">
          <span className="mb-4 grid size-16 place-items-center rounded-2xl bg-fill text-muted"><IconList width={32} height={32} /></span>
          <p className="text-[20px] font-semibold">No Posts in Queue</p>
          <p className="mt-1 max-w-xs text-[15px] text-muted">Autopilot will write its own posts. Add drafts to choose exactly what goes out.</p>
          <Link href="/app/drafts" className="btn btn-tinted btn-sm mt-5">Review Drafts</Link>
        </div>
      )}
    </>
  );
}
