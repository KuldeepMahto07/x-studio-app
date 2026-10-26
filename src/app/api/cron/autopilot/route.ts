import { NextResponse, type NextRequest } from "next/server";
import { runAutopilot } from "@/lib/autopilot";
import { env } from "@/lib/env";

// Call every 5 minutes (Vercel Cron, Supabase cron, cron-job.org, or the local timer in instrumentation.ts).
export async function GET(request: NextRequest) {
  if (env.cronSecret && request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!env.cronSecret && env.isProd) {
    return NextResponse.json({ error: "CRON_SECRET must be set in production" }, { status: 500 });
  }
  const results = await runAutopilot();
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
