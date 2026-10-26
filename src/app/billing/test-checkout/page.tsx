import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { billingMode } from "@/lib/billing";
import { PLANS } from "@/lib/types";
import { AppIcon, IconCheck } from "@/components/icons";
import { SubmitButton } from "@/components/ui";
import { completeTestCheckoutAction } from "../../actions";

export const instant = false;

/** Stand-in for the Lemon Squeezy checkout while developing locally. No money moves. */
export default async function TestCheckoutPage({ searchParams }: PageProps<"/billing/test-checkout">) {
  if (billingMode() !== "test") notFound();
  const user = await requireUser();
  const { plan } = await searchParams;
  if (plan !== "pro" && plan !== "creator") notFound();
  const p = PLANS[plan];
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-rise">
        <p className="mb-4 rounded-xl bg-warn/15 px-4 py-2.5 text-center text-[13px] font-medium text-warn">
          Test checkout · local development · no real payment
        </p>
        <div className="card space-y-5 p-6">
          <div className="flex items-center gap-3">
            <AppIcon size={44} />
            <div>
              <p className="text-[13px] text-muted">X Studio</p>
              <p className="text-[20px] font-bold">{p.label} plan</p>
            </div>
            <p className="ml-auto text-[22px] font-bold">{p.price}</p>
          </div>
          <ul className="space-y-2 text-[15px]">
            {[`${p.postsPerDay} posts a day`, `${p.postsPerMonth} posts a month`, `${p.maxSlots} posting times`, "Cancel anytime"].map((f) => (
              <li key={f} className="flex items-center gap-2"><IconCheck width={16} height={16} className="text-ok" /> {f}</li>
            ))}
          </ul>
          <div className="rounded-xl bg-bg px-4 py-3 text-[15px]">
            <p className="text-muted">Billed to</p>
            <p className="font-medium">{user.email ?? `@${user.x_handle}`}</p>
          </div>
          <form action={completeTestCheckoutAction}>
            <input type="hidden" name="plan" value={plan} />
            <SubmitButton className="btn btn-filled w-full" pendingText="Processing…">Pay {p.price} (test)</SubmitButton>
          </form>
        </div>
        <p className="mt-5 text-center"><Link href="/app/settings" className="text-[15px] text-accent">Cancel</Link></p>
      </div>
    </div>
  );
}
