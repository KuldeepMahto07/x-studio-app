import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { oneClickMode } from "@/lib/env";
import { billingMode, getSubscription } from "@/lib/billing";
import { getNiche, getSlots } from "@/lib/posts";
import { PLANS, type Plan } from "@/lib/types";
import { ScheduleForm } from "@/components/forms";
import { LargeTitle, SubmitButton } from "@/components/ui";
import { IconCheck, IconChevron, IconSparkles, IconX } from "@/components/icons";
import { cancelTestSubscriptionAction, signOut, startCheckoutAction } from "../../actions";

// Per-user page: render at request time.
export const instant = false;

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const user = await requireUser();
  const { upgraded, connected, error } = await searchParams;
  const plan = PLANS[user.plan];
  const niche = getNiche(user.id);
  const sub = getSubscription(user.id);
  const mode = billingMode();
  const xConnected = !user.x_user_id.startsWith("acct-") && !user.x_user_id.startsWith("local-");

  return (
    <>
      <LargeTitle title="Settings" />
      <div className="space-y-8">
        {typeof upgraded === "string" && upgraded in PLANS && (
          <div className="animate-pop rounded-2xl bg-ok/12 px-4 py-3 text-[15px] text-ok">
            You&apos;re on {PLANS[upgraded as Plan].label} now. Thanks for subscribing!
          </div>
        )}
        {connected === "1" && <div className="animate-pop rounded-2xl bg-ok/12 px-4 py-3 text-[15px] text-ok">X account connected.</div>}
        {typeof error === "string" && <div className="animate-pop rounded-2xl bg-bad/12 px-4 py-3 text-[15px] text-bad">{error}</div>}

        <section className="animate-rise">
          <div className="group-list">
            <div className="row py-3">
              <span className="grid size-[60px] place-items-center rounded-full bg-gradient-to-b from-[#a1a1aa] to-[#71717a] text-[26px] font-semibold text-white">
                {user.x_handle.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[22px] font-semibold leading-tight">@{user.x_handle}</span>
                <span className="block truncate text-[15px] text-muted">{user.email ?? "Signed in with X"} · {plan.label} plan</span>
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
            {oneClickMode ? (
              <div className="row">
                <span className="grid size-[30px] place-items-center rounded-[7px] bg-black text-white dark:bg-white dark:text-black"><IconX width={16} height={16} /></span>
                <span className="flex-1">Posting mode</span>
                <span className="text-muted">One-click</span>
              </div>
            ) : (
              <a href="/api/auth/x/start" className="row-link">
                <span className="grid size-[30px] place-items-center rounded-[7px] bg-black text-white dark:bg-white dark:text-black"><IconX width={16} height={16} /></span>
                <span className="flex-1">X account</span>
                <span className={xConnected ? "text-ok" : "text-accent"}>{xConnected ? "Connected" : "Connect"}</span>
                <IconChevron className="text-faint" />
              </a>
            )}
          </div>
        </section>

        <section className="animate-rise" style={{ animationDelay: "100ms" }}>
          <h2 className="section-header">Schedule</h2>
          <ScheduleForm timezone={user.timezone} slots={getSlots(user.id)} maxSlots={plan.maxSlots} />
        </section>

        <section className="animate-rise" style={{ animationDelay: "150ms" }}>
          <h2 className="section-header">Plan &amp; Billing</h2>
          <div className="group-list">
            {(Object.keys(PLANS) as Plan[]).map((key) => {
              const p = PLANS[key];
              const current = key === user.plan;
              return (
                <div key={key} className="row py-3">
                  <span className="flex-1">
                    <span className="block font-medium">{p.label} <span className="font-normal text-muted">· {p.price}</span></span>
                    <span className="block text-[13px] text-muted">{p.postsPerDay} a day · {p.postsPerMonth} a month · {p.maxSlots} time{p.maxSlots > 1 ? "s" : ""}</span>
                  </span>
                  {current ? (
                    <span className="flex items-center gap-1 text-[15px] font-medium text-accent"><IconCheck width={18} height={18} /> Current</span>
                  ) : key !== "free" && mode !== "disabled" && !sub?.status.match(/^(active|on_trial|past_due)$/) ? (
                    <form action={startCheckoutAction}>
                      <input type="hidden" name="plan" value={key} />
                      <SubmitButton className="btn btn-tinted btn-sm" pendingText="Opening…">Upgrade</SubmitButton>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="section-footer">
            {sub
              ? sub.status === "cancelled"
                ? `Cancelled. ${PLANS[sub.plan].label} stays active until ${fmtDate(sub.ends_at)}.`
                : sub.status === "expired"
                  ? "Your subscription has ended."
                  : `${PLANS[sub.plan].label} · ${sub.status.replace("_", " ")}${sub.renews_at ? ` · renews ${fmtDate(sub.renews_at)}` : ""}`
              : mode === "disabled"
                ? "Upgrades are coming soon."
                : "Payments are handled securely by Lemon Squeezy. Cancel anytime."}
          </p>

          {sub && sub.status !== "expired" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sub.portal_url && (
                <a href={sub.portal_url} target="_blank" rel="noreferrer" className="btn btn-gray btn-sm">Manage Subscription</a>
              )}
              {sub.provider === "test" && sub.status !== "cancelled" && (
                <form action={cancelTestSubscriptionAction}><SubmitButton className="btn btn-gray btn-sm">Cancel (test)</SubmitButton></form>
              )}
              {sub.provider === "test" && (
                <form action={cancelTestSubscriptionAction}>
                  <input type="hidden" name="immediately" value="1" />
                  <SubmitButton className="btn btn-destructive btn-sm">End now (test)</SubmitButton>
                </form>
              )}
            </div>
          )}
          {mode === "test" && <p className="section-footer text-warn">Test mode: add Lemon Squeezy keys to take real payments.</p>}
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
