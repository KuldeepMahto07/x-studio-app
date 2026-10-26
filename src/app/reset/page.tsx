import Link from "next/link";
import { connection } from "next/server";
import { isResetTokenValid } from "@/lib/accounts";
import { AuthShell, ResetForm } from "@/components/auth-forms";

export const instant = false;

export default async function ResetPage({ searchParams }: PageProps<"/reset">) {
  await connection(); // token validity depends on the current time
  const { token } = await searchParams;
  const valid = typeof token === "string" && isResetTokenValid(token);
  return (
    <AuthShell
      title={valid ? "Choose a new password" : "Link expired"}
      subtitle={valid ? "You'll be signed out on other devices." : "Reset links work once and expire after 30 minutes."}
      footer={<Link href={valid ? "/login" : "/forgot"} className="text-accent">{valid ? "Back to sign in" : "Request a new link"}</Link>}
    >
      {valid && <ResetForm token={token} />}
    </AuthShell>
  );
}
