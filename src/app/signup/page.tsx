import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthShell, SignUpForm } from "@/components/auth-forms";

export const instant = false;

export default async function SignUpPage() {
  if (await getUser()) redirect("/app");
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free plan included. No card needed."
      footer={<>Already have an account? <Link href="/login" className="text-accent">Sign in</Link></>}
    >
      <SignUpForm />
    </AuthShell>
  );
}
