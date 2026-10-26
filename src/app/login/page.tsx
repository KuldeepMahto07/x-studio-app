import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { oneClickMode } from "@/lib/env";
import { AuthShell, SignInForm } from "@/components/auth-forms";
import { IconX } from "@/components/icons";

export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUser()) redirect("/app");
  const { next, error } = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to X Studio."
      footer={<>New here? <Link href="/signup" className="text-accent">Create an account</Link></>}
    >
      {typeof error === "string" && <p className="mb-4 rounded-xl bg-bad/12 px-4 py-2.5 text-center text-[15px] text-bad">{error}</p>}
      <SignInForm next={typeof next === "string" ? next : undefined} />
      {!oneClickMode && (
        <>
          <div className="my-5 flex items-center gap-3 text-[13px] text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <Link href="/api/auth/x/start" prefetch={false} className="btn btn-gray w-full"><IconX width={16} height={16} /> Continue with X</Link>
        </>
      )}
    </AuthShell>
  );
}
