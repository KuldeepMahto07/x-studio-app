"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction, type ActionState } from "@/app/actions";
import { Flash, SubmitButton } from "./ui";
import { AppIcon } from "./icons";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-rise">
        <Link href="/" className="mx-auto mb-6 block w-fit"><AppIcon size={64} /></Link>
        <h1 className="text-center text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-[15px] text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-6 text-center text-[15px] text-muted">{footer}</div>}
      </div>
    </div>
  );
}

function PasswordField({ name = "password", placeholder = "Password", autoComplete }: { name?: string; placeholder?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="row">
      <input name={name} type={show ? "text" : "password"} required minLength={8} placeholder={placeholder} autoComplete={autoComplete} className="field-inset" />
      <button type="button" onClick={() => setShow((s) => !s)} className="shrink-0 text-[15px] text-accent">{show ? "Hide" : "Show"}</button>
    </label>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<ActionState, FormData>(signUpAction, null);
  const v = state?.values;
  return (
    <form action={action} className="space-y-4">
      <div className="group-list">
        <label className="row">
          <input name="email" type="email" required placeholder="Email" autoComplete="email" defaultValue={v?.email} className="field-inset" />
        </label>
        <PasswordField autoComplete="new-password" placeholder="Password (8+ characters)" />
        <label className="row">
          <span className="text-muted">@</span>
          <input name="handle" required placeholder="your X handle" autoComplete="username" defaultValue={v?.handle} className="field-inset" />
        </label>
      </div>
      <SubmitButton className="btn btn-filled w-full" pendingText="Creating account…">Create Account</SubmitButton>
      <div className="text-center"><Flash state={state} /></div>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(signInAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="group-list">
        <label className="row">
          <input name="email" type="email" required placeholder="Email" autoComplete="email" defaultValue={state?.values?.email} className="field-inset" />
        </label>
        <PasswordField autoComplete="current-password" />
      </div>
      <SubmitButton className="btn btn-filled w-full" pendingText="Signing in…">Sign In</SubmitButton>
      <div className="text-center"><Flash state={state} /></div>
      <p className="text-center"><Link href="/forgot" className="text-[15px] text-accent">Forgot password?</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<ActionState, FormData>(forgotPasswordAction, null);
  if (state?.ok) {
    return <p className="animate-pop rounded-2xl bg-ok/12 px-4 py-3 text-center text-[15px] text-ok">{state.ok}</p>;
  }
  return (
    <form action={action} className="space-y-4">
      <div className="group-list">
        <label className="row">
          <input name="email" type="email" required placeholder="Email" autoComplete="email" defaultValue={state?.values?.email} className="field-inset" />
        </label>
      </div>
      <SubmitButton className="btn btn-filled w-full" pendingText="Sending…">Send Reset Link</SubmitButton>
      <div className="text-center"><Flash state={state} /></div>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="group-list">
        <PasswordField autoComplete="new-password" placeholder="New password" />
        <PasswordField name="confirm" autoComplete="new-password" placeholder="Confirm new password" />
      </div>
      <SubmitButton className="btn btn-filled w-full" pendingText="Saving…">Set New Password</SubmitButton>
      <div className="text-center"><Flash state={state} /></div>
    </form>
  );
}
