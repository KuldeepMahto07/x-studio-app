import { requireUser } from "@/lib/auth";
import { DEFAULT_NICHE, getNiche } from "@/lib/posts";
import { NicheForm } from "@/components/forms";

// Per-user page: render at request time.
export const instant = false;

export default async function SetupPage() {
  const user = await requireUser();
  const niche = getNiche(user.id);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{niche ? "Your niche" : "Set up your niche"}</h1>
      <p className="mb-6 mt-1 text-muted">This is what the AI follows every time it writes a post for you.</p>
      <NicheForm niche={niche ?? DEFAULT_NICHE} firstTime={!niche} />
    </div>
  );
}
