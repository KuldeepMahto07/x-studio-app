import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { demoMode, fakeAi } from "@/lib/env";
import { PLANS } from "@/lib/types";
import { NavLinks } from "@/components/nav";
import { signOut } from "../actions";

// Every page here depends on the signed-in user, so let the segment wait for the session.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
      <aside className="md:w-56 md:shrink-0">
        <Link href="/app" className="mb-5 block text-lg font-extrabold">
          X <span className="text-accent">Studio</span>
        </Link>
        <NavLinks />
        <div className="mt-6 hidden border-t border-line pt-4 text-sm md:block">
          <div className="font-semibold">@{user.x_handle}</div>
          <div className="text-muted">{PLANS[user.plan].label} plan</div>
          <form action={signOut} className="mt-3">
            <button className="text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {(demoMode || fakeAi) && (
          <div className="mb-5 rounded-lg border border-warn/40 bg-warn/5 px-4 py-2.5 text-sm text-warn">
            {demoMode && "Demo mode: posts are recorded here, not sent to X. "}
            {fakeAi && "No GEMINI_API_KEY: drafts are placeholders."}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
