import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { get, nowIso, run, transaction } from "./db";
import type { Plan } from "./types";

// Subscriptions through Lemon Squeezy (merchant of record: handles tax worldwide, pays out to India).
// Without Lemon Squeezy keys, local development uses a built-in test checkout that feeds the
// same applySubscriptionEvent() path as real webhooks.

export type PaidPlan = Exclude<Plan, "free">;

const ls = () => ({
  apiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
  storeId: process.env.LEMONSQUEEZY_STORE_ID ?? "",
  webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
  variants: { pro: process.env.LEMONSQUEEZY_VARIANT_PRO ?? "", creator: process.env.LEMONSQUEEZY_VARIANT_CREATOR ?? "" } as Record<PaidPlan, string>,
});

export type BillingMode = "lemonsqueezy" | "test" | "disabled";

export function billingMode(): BillingMode {
  const c = ls();
  if (c.apiKey && c.storeId && c.webhookSecret && c.variants.pro && c.variants.creator) return "lemonsqueezy";
  return process.env.NODE_ENV === "production" ? "disabled" : "test";
}

/** variant id -> plan, for whichever mode is active. */
function variantPlans(): Record<string, PaidPlan> {
  if (billingMode() === "test") return { "test-pro": "pro", "test-creator": "creator" };
  const { variants } = ls();
  return { [variants.pro]: "pro", [variants.creator]: "creator" };
}

// ---------- checkout ----------

export async function createCheckoutUrl(user: { id: string; email: string | null }, plan: PaidPlan, appUrl: string): Promise<string> {
  const mode = billingMode();
  if (mode === "test") return `/billing/test-checkout?plan=${plan}`;
  if (mode === "disabled") throw new Error("Billing isn't configured yet.");

  const c = ls();
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${c.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { ...(user.email ? { email: user.email } : {}), custom: { user_id: user.id } },
          product_options: { redirect_url: `${appUrl}/app/settings?upgraded=${plan}` },
        },
        relationships: {
          store: { data: { type: "stores", id: c.storeId } },
          variant: { data: { type: "variants", id: c.variants[plan] } },
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Checkout failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = json.data?.attributes?.url;
  if (!url) throw new Error("Checkout failed: no URL returned.");
  return url;
}

// ---------- webhooks ----------

/** Lemon Squeezy signs the raw body with HMAC-SHA256 (hex) in the X-Signature header. */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret || !rawBody) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const webhookSecret = () => ls().webhookSecret;

export type SubscriptionPayload = {
  meta: { event_name: string; custom_data?: { user_id?: string } };
  data: {
    id: string | number;
    type?: string;
    attributes: {
      status: string;
      variant_id: string | number;
      customer_id?: string | number;
      renews_at?: string | null;
      ends_at?: string | null;
      urls?: { customer_portal?: string | null };
    };
  };
};

/** Which plan a subscription status grants right now. */
export function effectivePlan(plan: PaidPlan, status: string, endsAt: string | null | undefined, now = new Date()): Plan {
  if (["active", "on_trial", "past_due"].includes(status)) return plan; // past_due: keep access while the card is retried
  if (status === "cancelled") return endsAt && new Date(endsAt) > now ? plan : "free"; // paid until the period ends
  return "free"; // expired, unpaid, paused
}

export type ApplyResult = { applied: true; userId: string; plan: Plan; status: string } | { applied: false; reason: string };

/** Records a subscription event and updates the user's plan. Safe to replay. */
export function applySubscriptionEvent(payload: SubscriptionPayload, provider = billingMode() === "test" ? "test" : "lemonsqueezy"): ApplyResult {
  const event = payload?.meta?.event_name ?? "";
  if (!event.startsWith("subscription_")) return { applied: false, reason: `ignored event ${event || "(none)"}` };
  const userId = payload.meta.custom_data?.user_id;
  if (!userId || !get("SELECT 1 FROM users WHERE id = ?", userId)) return { applied: false, reason: "unknown user" };

  const a = payload.data.attributes;
  const paid = variantPlans()[String(a.variant_id)];
  if (!paid) return { applied: false, reason: `unknown variant ${a.variant_id}` };

  const plan = effectivePlan(paid, a.status, a.ends_at);
  transaction(() => {
    run(
      `INSERT INTO subscriptions (user_id, provider, provider_sub_id, customer_id, plan, status, renews_at, ends_at, portal_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET provider = excluded.provider, provider_sub_id = excluded.provider_sub_id,
         customer_id = excluded.customer_id, plan = excluded.plan, status = excluded.status, renews_at = excluded.renews_at,
         ends_at = excluded.ends_at, portal_url = COALESCE(excluded.portal_url, subscriptions.portal_url), updated_at = excluded.updated_at`,
      userId, provider, String(payload.data.id), a.customer_id != null ? String(a.customer_id) : null, paid, a.status,
      a.renews_at ?? null, a.ends_at ?? null, a.urls?.customer_portal ?? null, nowIso(),
    );
    run("UPDATE users SET plan = ? WHERE id = ?", plan, userId);
  });
  return { applied: true, userId, plan, status: a.status };
}

export type Subscription = {
  provider: string; plan: PaidPlan; status: string; renews_at: string | null; ends_at: string | null; portal_url: string | null;
};

export const getSubscription = (userId: string) =>
  get<Subscription>("SELECT provider, plan, status, renews_at, ends_at, portal_url FROM subscriptions WHERE user_id = ?", userId) ?? null;

// ---------- test mode (local development only) ----------

function testPayload(userId: string, plan: PaidPlan, event: string, status: string, endsAt: string | null): SubscriptionPayload {
  const renews = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    meta: { event_name: event, custom_data: { user_id: userId } },
    data: {
      id: `test-sub-${userId}`,
      attributes: { status, variant_id: `test-${plan}`, customer_id: `test-cus-${userId}`, renews_at: status === "active" ? renews : null, ends_at: endsAt },
    },
  };
}

export function completeTestCheckout(userId: string, plan: PaidPlan): ApplyResult {
  if (billingMode() !== "test") throw new Error("Test checkout is only available in local development.");
  return applySubscriptionEvent(testPayload(userId, plan, "subscription_created", "active", null), "test");
}

/** Like cancelling in a customer portal: access continues until the period ends. */
export function cancelTestSubscription(userId: string, immediately = false): ApplyResult {
  if (billingMode() !== "test") throw new Error("Test billing is only available in local development.");
  const sub = getSubscription(userId);
  if (!sub) return { applied: false, reason: "no subscription" };
  return immediately
    ? applySubscriptionEvent(testPayload(userId, sub.plan, "subscription_expired", "expired", new Date().toISOString()), "test")
    : applySubscriptionEvent(testPayload(userId, sub.plan, "subscription_cancelled", "cancelled", sub.renews_at ?? new Date(Date.now() + 30 * 86_400_000).toISOString()), "test");
}
