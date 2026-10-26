import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Real Lemon Squeezy mode: all keys present (values are fake; no network calls are made here).
const SECRET = "whsec_route_test";
beforeAll(() => {
  vi.stubEnv("LEMONSQUEEZY_API_KEY", "fake");
  vi.stubEnv("LEMONSQUEEZY_STORE_ID", "1");
  vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("LEMONSQUEEZY_VARIANT_PRO", "111");
  vi.stubEnv("LEMONSQUEEZY_VARIANT_CREATOR", "222");
});

async function setup() {
  const { createAccount } = await import("@/lib/accounts");
  const { POST } = await import("@/app/api/billing/webhook/route");
  const { get } = await import("@/lib/db");
  const res = await createAccount({ email: `w${Math.random().toString(36).slice(2, 8)}@example.com`, password: "password123", handle: "hook" });
  if (!res.ok) throw new Error(res.error);
  return { POST, get, userId: res.userId };
}

function request(body: string, signature: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("x-signature", signature);
  return new Request("http://localhost/api/billing/webhook", { method: "POST", body, headers });
}

describe("POST /api/billing/webhook", () => {
  it("applies a correctly signed subscription_created for the Pro variant", async () => {
    const { POST, get, userId } = await setup();
    const body = JSON.stringify({
      meta: { event_name: "subscription_created", custom_data: { user_id: userId } },
      data: { id: "sub_1", attributes: { status: "active", variant_id: 111, customer_id: 9, renews_at: "2099-01-01T00:00:00Z", ends_at: null, urls: { customer_portal: "https://x.lemonsqueezy.com/p" } } },
    });
    const res = await POST(request(body, createHmac("sha256", SECRET).update(body).digest("hex")) as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: true, plan: "pro" });
    expect(get<{ plan: string }>("SELECT plan FROM users WHERE id = ?", userId)?.plan).toBe("pro");
  });

  it("rejects unsigned and forged requests without changing anything", async () => {
    const { POST, get, userId } = await setup();
    const body = JSON.stringify({
      meta: { event_name: "subscription_created", custom_data: { user_id: userId } },
      data: { id: "sub_2", attributes: { status: "active", variant_id: 222 } },
    });
    expect((await POST(request(body, null) as never)).status).toBe(401);
    expect((await POST(request(body, createHmac("sha256", "attacker").update(body).digest("hex")) as never)).status).toBe(401);
    expect(get<{ plan: string }>("SELECT plan FROM users WHERE id = ?", userId)?.plan).toBe("free");
  });

  it("returns 400 for a signed body that isn't JSON", async () => {
    const { POST } = await setup();
    const body = "not json";
    expect((await POST(request(body, createHmac("sha256", SECRET).update(body).digest("hex")) as never)).status).toBe(400);
  });
});
