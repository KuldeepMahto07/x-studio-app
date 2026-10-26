import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPosts } from "@/lib/posts";
import { QueueCard } from "@/components/forms";

// Per-user page: render at request time.
export const instant = false;

export default async function QueuePage() {
  const user = await requireUser();
  const queue = listPosts(user.id, "queued");
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Queue</h1>
        <p className="mt-1 text-muted">
          Autopilot posts these in order, one per scheduled time. When the queue is empty it writes a new post in your niche.
        </p>
      </div>
      {queue.length ? (
        queue.map((p, i) => <QueueCard key={p.id} post={p} index={i} total={queue.length} />)
      ) : (
        <div className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-muted">
          Your queue is empty, so autopilot will write its own posts.
          <br />
          <Link href="/app/drafts" className="text-accent hover:underline">Review drafts</Link> to choose exactly what goes out.
        </div>
      )}
    </div>
  );
}
