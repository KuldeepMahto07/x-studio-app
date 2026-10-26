import { requireUser } from "@/lib/auth";
import { DEFAULT_NICHE, getNiche } from "@/lib/posts";
import { NicheForm } from "@/components/forms";
import { LargeTitle } from "@/components/ui";

// Per-user page: render at request time.
export const instant = false;

export default async function SetupPage() {
  const user = await requireUser();
  const niche = getNiche(user.id);
  return (
    <>
      <LargeTitle title={niche ? "Niche & Voice" : "Welcome"} subtitle="The AI follows this every time it writes for you." />
      <NicheForm niche={niche ?? DEFAULT_NICHE} firstTime={!niche} />
    </>
  );
}
