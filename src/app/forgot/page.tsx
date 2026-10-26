import Link from "next/link";
import { AuthShell, ForgotForm } from "@/components/auth-forms";

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a link to choose a new one."
      footer={<Link href="/login" className="text-accent">Back to sign in</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
