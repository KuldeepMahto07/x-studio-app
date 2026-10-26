import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAccount } from "@/lib/accounts";
import {
  applySubscriptionEvent, billingMode, cancelTestSubscription, completeTestCheckout, createCheckoutUrl,
  effectivePlan, getSubscription, verifySignature, type SubscriptionPayload,
} from "@/lib/billing";
import { get } from "@/lib/db";

async function newUser() {
  const res = await createAccount({ email: `b${Math.random().toString(36).slice(2, 8)}@example.com`, password: "password123", handle: "payer" });
  if (!res.ok) throw new Error(res.error);
  return res.userId;
}
const planOf = (id: string) => get<{ plan: string }>("SELECT plan FROM users WHERE id = ?", id)?.plan;

function event(userId: string, name: string, status: string, variant: string, extra: Partial<SubscriptionPayload["data"]["attributes"]> = {}): SubscriptionPayload {
  return {
    meta: { event_name: name, custom_data: { user_id: userId } },
    data: { id: 987, attributes: { status, variant_id: variant, customer_id: 55, renews_at: "2099-01-01T00:00:00Z", ends_at: null, urls: { customer_portal: "https://example.lemonsqueezy.com/billing" }, ...extra } },
  };
}

describe("webhook signatures", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ meta: { event_name: "subscription_created" } });
  const sign = (b: string) => createHmac("sha256", secret).update(b).digest("hex");

  it("accepts a correct signature", () => {
    expect(verifySignature(body, sign(body), secret)).toBe(true);
  });
  it("rejects a tampered body, wrong secret, missing or short signature", () => {
    expect(verifySignature(body + " ", sign(body), secret)).toBe(false);
    expect(verifySignature(body, createHmac("sha256", "other").update(body).digest("hex"), secret)).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, "abc", secret)).toBe(false);
    expect(verifySignature(body, sign(body), "")).toBe(false);
  });
});

describe("effectivePlan", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  it("grants the plan while active, trialing, or retrying payment", () => {
    for (const s of ["active", "on_trial", "past_due"]) expect(effectivePlan("pro", s, null, now)).toBe("pro");
  });
  it("keeps a cancelled plan until the paid period ends", () => {
    expect(effectivePlan("creator", "cancelled", "2026-11-01T00:00:00Z", now)).toBe("creator");
    expect(effectivePlan("creator", "cancelled", "2026-10-01T00:00:00Z", now)).toBe("free");
  });
  it("drops to free when expired, unpaid, or paused", () => {
    for (const s of ["expired", "unpaid", "paused"]) expect(effectivePlan("pro", s, null, now)).toBe("free");
  });
});

describe("subscription events (test billing mode)", () => {
  it("runs in test mode locally when no Lemon Squeezy keys are set", () => {
    expect(billingMode()).toBe("test");
  });

  it("upgrades on subscription_created and records the subscription", async () => {
    const id = await newUser();
    expect(planOf(id)).toBe("free");
    expect(applySubscriptionEvent(event(id, "subscription_created", "active", "test-pro"))).toMatchObject({ applied: true, plan: "pro" });
    expect(planOf(id)).toBe("pro");
    expect(getSubscription(id)).toMatchObject({ plan: "pro", status: "active", portal_url: "https://example.lemonsqueezy.com/billing" });
  });

  it("follows plan changes, cancellation, and expiry, and is safe to replay", async () => {
    const id = await newUser();
    applySubscriptionEvent(event(id, "subscription_created", "active", "test-pro"));
    applySubscriptionEvent(event(id, "subscription_updated", "active", "test-creator"));
    expect(planOf(id)).toBe("creator");

    const cancelled = event(id, "subscription_cancelled", "cancelled", "test-creator", { ends_at: "2099-01-01T00:00:00Z" });
    applySubscriptionEvent(cancelled);
    applySubscriptionEvent(cancelled); // replay
    expect(planOf(id)).toBe("creator");

    applySubscriptionEvent(event(id, "subscription_expired", "expired", "test-creator", { ends_at: "2020-01-01T00:00:00Z" }));
    expect(planOf(id)).toBe("free");
    expect(get<{ n: number }>("SELECT COUNT(*) n FROM subscriptions WHERE user_id = ?", id)?.n).toBe(1);
  });

  it("ignores non-subscription events, unknown users, and unknown variants", async () => {
    const id = await newUser();
    expect(applySubscriptionEvent(event(id, "order_created", "paid", "test-pro"))).toMatchObject({ applied: false });
    expect(applySubscriptionEvent(event("no-such-user", "subscription_created", "active", "test-pro"))).toMatchObject({ applied: false, reason: "unknown user" });
    expect(applySubscriptionEvent(event(id, "subscription_created", "active", "999999"))).toMatchObject({ applied: false });
    expect(planOf(id)).toBe("free");
  });

  it("test checkout upgrades; cancel keeps access; end-now downgrades", async () => {
    const id = await newUser();
    expect(await createCheckoutUrl({ id, email: null }, "pro", "http://localhost:3000")).toBe("/billing/test-checkout?plan=pro");
    completeTestCheckout(id, "pro");
    expect(planOf(id)).toBe("pro");
    cancelTestSubscription(id);
    expect(getSubscription(id)?.status).toBe("cancelled");
    expect(planOf(id)).toBe("pro");
    cancelTestSubscription(id, true);
    expect(planOf(id)).toBe("free");
  });
});
