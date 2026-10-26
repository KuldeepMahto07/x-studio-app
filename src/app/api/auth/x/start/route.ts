import { connection, NextResponse } from "next/server";
import { oneClickMode, env } from "@/lib/env";
import { buildAuthorizeUrl } from "@/lib/x";

export async function GET() {
  // Each sign-in needs a fresh state + PKCE verifier, so this must never be prerendered.
  await connection();
  if (oneClickMode) return NextResponse.redirect(`${env.appUrl}/?signin=1`);
  return NextResponse.redirect(buildAuthorizeUrl());
}
