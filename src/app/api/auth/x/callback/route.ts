import { NextResponse, type NextRequest } from "next/server";
import { createSession, getUser, linkXAccount, upsertXUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getNiche } from "@/lib/posts";
import { consumeState, exchangeCode, fetchMe, saveTokens } from "@/lib/x";

const fail = (reason: string) => NextResponse.redirect(`${env.appUrl}/login?error=${encodeURIComponent(reason)}`);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return fail("X sign-in was cancelled.");
  const code = params.get("code");
  const verifier = consumeState(params.get("state") ?? "");
  if (!code || !verifier) return fail("Sign-in link expired. Please try again.");

  try {
    const tokens = await exchangeCode(code, verifier);
    const me = await fetchMe(tokens.access_token);
    const current = await getUser();
    if (current) {
      // Signed in with email: connect this X account to it.
      const linked = linkXAccount(current.id, me);
      if (!linked.ok) return NextResponse.redirect(`${env.appUrl}/app/settings?error=${encodeURIComponent(linked.error)}`);
      saveTokens(current.id, tokens);
      return NextResponse.redirect(`${env.appUrl}/app/settings?connected=1`);
    }
    const userId = upsertXUser(me);
    saveTokens(userId, tokens);
    await createSession(userId);
    return NextResponse.redirect(`${env.appUrl}${getNiche(userId) ? "/app" : "/app/setup"}`);
  } catch (err) {
    console.error("X callback failed", err);
    return fail("Couldn't connect your X account. Please try again.");
  }
}
