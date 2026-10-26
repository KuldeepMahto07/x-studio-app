import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { oneClickMode } from "@/lib/env";
import { getNiche, getSlots } from "@/lib/posts";
import { PLANS } from "@/lib/types";
import { PlanPicker, ScheduleForm } from "@/components/forms";
import { LargeTitle } from "@/components/ui";
import { IconChevron, IconSparkles, IconX } from "@/components/icons";
import { signOut } from "../../actions";

// Per-user page: render at request time.
export const instant = false;

export default async function SettingsPage() {
  const user = await requireUser();
  const plan = PLANS[user.plan];
  const niche = getNiche(user.id);
  return (
    <>
      <LargeTitle title="Settings" />
      <div className="space-y-8">
        <section className="animate-rise">
          <div className="group-list">
            <div className="row py-3">
              <span className="grid size-[60px] place-items-center rounded-full bg-gradient-to-b from-[#a1a1aa] to-[#71717a] text-[26px] font-semibold text-white">
                {user.x_handle.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1">
                <span className="block text-[22px] font-semibold leading-tight">@{user.x_handle}</span>
                <span className="block text-[15px] text-muted">
                  {plan.label} plan · {oneClickMode ? "One-click posting" : "Connected to X"}
                </span>
              </span>
            </div>
          </div>
        </section>

        <section className="animate-rise" style={{ animationDelay: "50ms" }}>
          <h2 className="section-header">Content</h2>
          <div className="group-list" style={{ ["--sep-inset" as string]: "60px" }}>
            <Link href="/app/setup" className="row-link">
              <span className="grid size-[30px] place-items-center rounded-[7px] bg-warn text-white"><IconSparkles width={18} height={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block">Niche &amp; Voice</span>
                <span className="block truncate text-[13px] text-muted">{niche?.niche ?? "Not set up"}</span>
              </span>
              <IconChevron className="text-faint" />
            </Link>
            <div className="row">
              <span className="grid size-[30px] place-items-center rounded-[7px] bg-black text-white dark:bg-white dark:text-black"><IconX width={16} height={16} /></span>
              <span className="flex-1">Posting mode</span>
              <span className="text-muted">{oneClickMode ? "One-click" : "Autopilot (API)"}</span>
            </div>
          </div>
        </section>

        <section className="animate-rise" style={{ animationDelay: "100ms" }}>
          <h2 className="section-header">Schedule</h2>
          <ScheduleForm timezone={user.timezone} slots={getSlots(user.id)} maxSlots={plan.maxSlots} />
        </section>

        <section className="animate-rise" style={{ animationDelay: "150ms" }}>
          <h2 className="section-header">Plan</h2>
          <PlanPicker current={user.plan} canSwitch={oneClickMode} />
          <p className="section-footer">{oneClickMode ? "Billing isn't set up yet, so you can switch freely." : "Billing coming soon."}</p>
        </section>

        <section className="animate-rise" style={{ animationDelay: "200ms" }}>
          <form action={signOut} className="group-list">
            <button className="row-link w-full justify-center text-bad">Sign Out</button>
          </form>
        </section>
      </div>
    </>
  );
}
