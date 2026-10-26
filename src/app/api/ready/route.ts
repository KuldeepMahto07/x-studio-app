import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { listReady } from "@/lib/posts";

// Polled by the dashboard so it can notify the user when a post becomes ready.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ready = listReady(user.id);
  return NextResponse.json({ count: ready.length, first: ready[0]?.text ?? null });
}
