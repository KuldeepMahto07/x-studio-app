import { requireUser } from "@/lib/auth";
import { oneClickMode } from "@/lib/env";
import { getSlots } from "@/lib/posts";
import { PLANS, type Plan } from "@/lib/types";
import { ScheduleForm } from "@/components/forms";
import { setPlanAction } from "../../actions";

// Per-user page: render at request time.
export const instant = false;

export default async function SettingsPage() {
  const user = await requireUser();
  const plan = PLANS[user.plan];
  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="mb-5 mt-1 text-muted">When autopilot posts each day, in your timezone.</p>
        <ScheduleForm timezone={user.timezone} slots={getSlots(user.id)} maxSlots={plan.maxSlots} />
      </section>

      <section className="border-t border-line pt-8">
        <h2 className="text-xl font-bold tracking-tight">Plan</h2>
        <p className="mb-5 mt-1 text-muted">
          You&apos;re on <span className="text-ink">{plan.label}</span>: up to {plan.postsPerDay} post{plan.postsPerDay > 1 ? "s" : ""} a day,
          {" "}{plan.postsPerMonth} a month.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(PLANS) as Plan[]).map((key) => (
            <form key={key} action={setPlanAction} className={`card ${key === user.plan ? "border-accent" : ""}`}>
              <input type="hidden" name="plan" value={key} />
              <div className="font-semibold">{PLANS[key].label}</div>
              <div className="text-2xl font-bold">{PLANS[key].price}</div>
              <div className="mb-3 text-sm text-muted">{PLANS[key].postsPerDay}/day · {PLANS[key].maxSlots} time slot{PLANS[key].maxSlots > 1 ? "s" : ""}</div>
              {key === user.plan ? (
                <span className="tag">Current plan</span>
              ) : oneClickMode ? (
                <button className="btn">Switch</button>
              ) : (
                <span className="tag">Billing coming soon</span>
              )}
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
