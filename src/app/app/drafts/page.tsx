import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getNiche, listPosts } from "@/lib/posts";
import { DraftCard, GenerateForm, ManualPostForm } from "@/components/forms";

// Per-user page: render at request time.
export const instant = false;

export default async function DraftsPage({ searchParams }: PageProps<"/app/drafts">) {
  const user = await requireUser();
  if (!getNiche(user.id)) redirect("/app/setup");
  const welcome = (await searchParams).welcome === "1";
  const drafts = listPosts(user.id, "draft");
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Drafts</h1>
        <p className="mt-1 text-muted">AI writes posts in your niche. Edit them, then add the good ones to your queue.</p>
      </div>
      {welcome && !drafts.length && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
          Niche saved. Generate your first drafts below.
        </div>
      )}
      <GenerateForm />
      {drafts.map((d) => <DraftCard key={d.id} post={d} />)}
      <ManualPostForm />
    </div>
  );
}
