import { NextResponse, type NextRequest } from "next/server";
import { applySubscriptionEvent, verifySignature, webhookSecret, type SubscriptionPayload } from "@/lib/billing";

// Lemon Squeezy → Settings → Webhooks: point it at {APP_URL}/api/billing/webhook,
// set the signing secret to LEMONSQUEEZY_WEBHOOK_SECRET, and send the subscription_* events.
export async function POST(request: NextRequest) {
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: "webhook secret not configured" }, { status: 500 });

  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: SubscriptionPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const result = applySubscriptionEvent(payload, "lemonsqueezy");
  if (!result.applied) console.warn("[billing] webhook not applied:", result.reason);
  // 200 even when ignored, so Lemon Squeezy doesn't retry events we deliberately skip.
  return NextResponse.json(result);
}
