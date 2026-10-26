"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export const MAX_LEN = 280;

export function SubmitButton({ children, pendingText, className = "btn" }: { children: ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

export function Flash({ state }: { state: { ok?: string; error?: string } | null }) {
  if (!state) return null;
  if (state.error) return <p className="text-sm text-bad">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-ok">{state.ok}</p>;
  return null;
}

/** Textarea with a live character counter that turns red past the X limit. */
export function PostTextarea({ name = "text", defaultValue = "", placeholder }: { name?: string; defaultValue?: string; placeholder?: string }) {
  const [length, setLength] = useState(defaultValue.length);
  const ref = useRef<HTMLTextAreaElement>(null);
  // React resets a form after its action succeeds; keep the counter in sync with the reset value.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => setLength(ref.current?.value.length ?? 0));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  return (
    <div>
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        onChange={(e) => setLength(e.target.value.length)}
        className="field min-h-24 resize-y"
      />
      <div className={`mt-1 text-right text-xs tabular-nums ${length > MAX_LEN ? "font-semibold text-bad" : "text-muted"}`}>
        {length} / {MAX_LEN}
      </div>
    </div>
  );
}
