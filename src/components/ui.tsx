"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export const MAX_LEN = 280;

const tap = () => navigator.vibrate?.(8); // light haptic on devices that support it

export function SubmitButton({ children, pendingText, className = "btn btn-tinted" }: { children: ReactNode; pendingText?: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} onClick={tap}>
      {pending ? <><Spinner />{pendingText ?? "Saving…"}</> : children}
    </button>
  );
}

export function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}

/** Inline result message that springs in. */
export function Flash({ state }: { state: { ok?: string; error?: string } | null }) {
  if (!state?.ok && !state?.error) return null;
  return (
    <p key={state.ok ?? state.error} className={`animate-pop text-[15px] ${state.error ? "text-bad" : "text-ok"}`} role="status">
      {state.error ?? state.ok}
    </p>
  );
}

/** X-style circular character counter: fills up, turns orange near the limit, red past it. */
export function CharRing({ length, size = 26 }: { length: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const progress = Math.min(length / MAX_LEN, 1);
  const left = MAX_LEN - length;
  const color = left < 0 ? "var(--red)" : left <= 20 ? "var(--orange)" : "var(--blue)";
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} title={`${length} / ${MAX_LEN}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill-2)" strokeWidth={2.5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: "stroke-dashoffset .25s var(--ease-spring), stroke .2s" }}
        />
      </svg>
      {left <= 20 && <span className="absolute text-[10px] font-semibold tabular-nums" style={{ color }}>{left}</span>}
    </span>
  );
}

/** Auto-growing post editor with the character ring. */
export function PostTextarea({ name = "text", defaultValue = "", placeholder, autoFocus }: { name?: string; defaultValue?: string; placeholder?: string; autoFocus?: boolean }) {
  const [length, setLength] = useState(defaultValue.length);
  const ref = useRef<HTMLTextAreaElement>(null);
  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  // React resets a form after its action succeeds; keep the counter and height in sync with the reset value.
  useEffect(() => {
    grow();
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => { setLength(ref.current?.value.length ?? 0); grow(); });
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  return (
    <div className="flex items-end gap-3">
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={2}
        onChange={(e) => { setLength(e.target.value.length); grow(); }}
        className="field-inset min-h-12 flex-1 resize-none leading-[1.4]"
      />
      <CharRing length={length} />
    </div>
  );
}

/** UISwitch. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { tap(); onChange(!checked); }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${checked ? "bg-ok" : "bg-fill-2"}`}
    >
      <span
        className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-300"
        style={{ transform: `translateX(${checked ? 20 : 0}px)`, transitionTimingFunction: "var(--ease-spring)" }}
      />
    </button>
  );
}

/** UISegmentedControl with a sliding thumb. Submits its value under `name` when inside a form. */
export function Segmented<T extends string>({ name, options, defaultValue, onChange }: {
  name?: string; options: { value: T; label: ReactNode }[]; defaultValue: T; onChange?: (v: T) => void;
}) {
  const [value, setValue] = useState<T>(defaultValue);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="relative grid rounded-[9px] bg-fill p-[2px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {name && <input type="hidden" name={name} value={value} />}
      <span
        className="absolute bottom-[2px] top-[2px] rounded-[7px] bg-panel shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 dark:bg-[#636366]"
        style={{ left: 2, width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)`, transitionTimingFunction: "var(--ease-spring)" }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => { tap(); setValue(o.value); onChange?.(o.value); }}
          className={`relative z-10 h-7 px-3 text-[13px] transition-[font-weight] ${o.value === value ? "font-semibold" : "font-medium"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Activity-ring style progress (used/limit). */
export function Ring({ value, max, size = 64, color = "var(--purple)", children }: { value: number; max: number; size?: number; color?: string; children?: ReactNode }) {
  const stroke = size * 0.14;
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const progress = max ? Math.min(value / max, 1) : 0;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.2} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s var(--ease-spring)" }}
        />
      </svg>
      <span className="absolute text-[13px] font-semibold tabular-nums">{children}</span>
    </span>
  );
}

/**
 * Large title that collapses into a blurred navigation bar when scrolled away, like UINavigationBar.
 */
export function LargeTitle({ title, subtitle, trailing }: { title: string; subtitle?: ReactNode; trailing?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { rootMargin: "-52px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div
        className={`sticky top-0 z-30 -mx-4 flex h-[52px] items-center justify-center px-4 transition-[background-color,box-shadow] duration-200 md:-mx-10 md:px-10 ${compact ? "material shadow-[0_0.5px_0_var(--sep)]" : ""}`}
      >
        <span className={`text-[17px] font-semibold transition-all duration-200 ${compact ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>{title}</span>
        {trailing && <div className="absolute right-4 md:right-10">{trailing}</div>}
      </div>
      <div ref={ref} className="mb-6 animate-rise">
        <h1 className="large-title">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
    </>
  );
}
