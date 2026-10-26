import { requireUser } from "@/lib/auth";
import { oneClickMode, fakeAi } from "@/lib/env";
import { listPosts } from "@/lib/posts";
import { PLANS } from "@/lib/types";
import { Sidebar, TabBar } from "@/components/nav";
import { ReadyWatcher } from "@/components/ready-watcher";

// Every page here depends on the signed-in user, so let the segment wait for the session.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const queueCount = listPosts(user.id, "queued").length;
  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar handle={user.x_handle} plan={PLANS[user.plan].label} queueCount={queueCount} />
      <main className="min-w-0 flex-1 px-4 pb-28 md:px-10 md:pb-16">
        <div className="mx-auto w-full max-w-2xl">
          {fakeAi && (
            <div className="mt-3 rounded-xl bg-warn/15 px-4 py-2.5 text-[15px] text-warn">
              No GEMINI_API_KEY: drafts are placeholders.
            </div>
          )}
          {oneClickMode && <ReadyWatcher />}
          {children}
        </div>
      </main>
      <TabBar />
    </div>
  );
}
