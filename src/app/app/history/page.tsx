import { requireUser } from "@/lib/auth";
import { listHistory } from "@/lib/posts";

// Per-user page: render at request time.
export const instant = false;

export default async function HistoryPage() {
  const user = await requireUser();
  const posts = listHistory(user.id);
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-muted">Everything autopilot has posted, newest first.</p>
      </div>
      {posts.length ? (
        posts.map((p) => (
          <div key={p.id} className="card">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className={p.status === "posted" ? "text-ok" : "text-bad"}>{p.status === "posted" ? "Posted" : "Failed"}</span>
              <span>{new Date(p.posted_at ?? p.created_at).toLocaleString("en-GB", { timeZone: user.timezone, dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="tag">{p.topic}</span>
              {p.x_post_id && !p.x_post_id.startsWith("demo-") && (
                <a href={`https://x.com/i/status/${p.x_post_id}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">View on X ↗</a>
              )}
            </div>
            <p className="whitespace-pre-wrap">{p.text || <span className="text-muted">(no text)</span>}</p>
            {p.error && <p className="mt-2 text-sm text-bad">{p.error}</p>}
          </div>
        ))
      ) : (
        <div className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-muted">Nothing posted yet.</div>
      )}
    </div>
  );
}
