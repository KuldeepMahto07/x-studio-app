import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getNiche, listPosts } from "@/lib/posts";
import { ComposeCard, DraftCard, GenerateForm } from "@/components/forms";
import { LargeTitle } from "@/components/ui";

// Per-user page: render at request time.
export const instant = false;

export default async function DraftsPage({ searchParams }: PageProps<"/app/drafts">) {
  const user = await requireUser();
  if (!getNiche(user.id)) redirect("/app/setup");
  const welcome = (await searchParams).welcome === "1";
  const drafts = listPosts(user.id, "draft");
  return (
    <>
      <LargeTitle title="Drafts" subtitle="AI writes in your niche. Keep the good ones." />
      <div className="space-y-4">
        {welcome && !drafts.length && (
          <div className="animate-pop rounded-2xl bg-accent/12 px-4 py-3 text-[15px] text-accent">
            You&apos;re all set. Generate your first drafts.
          </div>
        )}
        <GenerateForm />
        <div className="space-y-3">
          {drafts.map((d, i) => <DraftCard key={d.id} post={d} index={i} />)}
        </div>
        <ComposeCard />
      </div>
    </>
  );
}
