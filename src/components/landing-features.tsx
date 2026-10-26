"use client";

import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { CharRing } from "./ui";
import { AppIcon, IconBell, IconBolt, IconList, IconSparkles, IconTrash, IconX } from "./icons";

const SAMPLES = [
  "Swapped Copilot ($10/mo) for Qwen 2.5 Coder on Ollama. Unlimited completions, zero API costs, fully offline.",
  "Stop writing PR descriptions by hand.\ngit diff main | llm \"3-bullet summary\"\nDone in 5 seconds.",
  "Before: 2 hours turning a Figma frame into Tailwind.\nAfter: screenshot → Claude → working component in 15s.",
];

/** Card with a cursor-following spotlight and a soft lift on hover. */
function Tile({ className = "", children, glow = "rgba(10,132,255,0.18)" }: { className?: string; children: ReactNode; glow?: string }) {
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      onPointerMove={onMove}
      className={`tile group relative overflow-hidden rounded-[28px] bg-panel p-6 ring-[0.5px] ring-line transition-transform duration-500 hover:-translate-y-1 ${className}`}
      style={{ ["--glow" as string]: glow }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), var(--glow), transparent 60%)" }} />
      <div className="relative">{children}</div>
    </div>
  );
}

function TileHeading({ icon, color, eyebrow, title, body }: { icon: ReactNode; color: string; eyebrow: string; title: string; body: string }) {
  return (
    <div className="mb-5">
      <span className={`mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide ${color}`}>{icon}{eyebrow}</span>
      <h3 className="text-[24px] font-bold leading-tight tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-md text-[15px] text-muted">{body}</p>
    </div>
  );
}

/** Types sample posts out letter by letter, then moves to the next one. */
function Typewriter() {
  const [sample, setSample] = useState(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const full = SAMPLES[sample];
    const done = shown >= full.length;
    const t = setTimeout(
      () => {
        if (done) {
          setShown(0);
          setSample((s) => (s + 1) % SAMPLES.length);
        } else {
          setShown((n) => Math.min(n + 2, full.length));
        }
      },
      done ? 2200 : 28,
    );
    return () => clearTimeout(t);
  }, [sample, shown]);
  const text = SAMPLES[sample].slice(0, shown);
  return (
    <div className="rounded-2xl bg-bg p-4">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {["AI tools", "coding with AI", "productivity"].map((c) => <span key={c} className="chip">{c}</span>)}
      </div>
      <p className="min-h-[96px] whitespace-pre-wrap text-[16px] leading-[1.45]">
        {text}
        <span className="caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent" />
      </p>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5 text-[13px] text-muted">
        <span className="flex items-center gap-1.5"><IconSparkles width={15} height={15} className="text-warn" /> Writing in your voice…</span>
        <CharRing length={text.length} size={24} />
      </div>
    </div>
  );
}

function NotificationStack() {
  return (
    <div className="relative h-[220px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#1e3a8a] via-[#6d28d9] to-[#0f172a] p-3">
      <p className="text-center text-[44px] font-light leading-none text-white/90">9:00</p>
      <p className="mb-3 text-center text-[12px] text-white/70">Monday</p>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="notif-drop absolute inset-x-3 rounded-2xl bg-white/80 p-2.5 text-black shadow-lg backdrop-blur-xl"
          style={{ top: 92 + i * 14, animationDelay: `${i * 3}s`, zIndex: 2 - i }}
        >
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-black/50">
            <AppIcon size={15} /><span className="font-semibold uppercase">X Studio</span><span className="ml-auto">now</span>
          </div>
          <p className="text-[13px] font-semibold">Time to post</p>
          <p className="truncate text-[13px]">{SAMPLES[i]}</p>
        </div>
      ))}
    </div>
  );
}

function MiniQueue() {
  const rows = ["Qwen 2.5 Coder on Ollama…", "Pipe your diff to llm…", "Figma → Tailwind in 15s…"];
  return (
    <div className="overflow-hidden rounded-2xl bg-bg">
      {rows.map((r, i) => (
        <div key={r} className="relative overflow-hidden border-b border-line last:border-0">
          {i === 2 && (
            <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-bad text-white"><IconTrash width={18} height={18} /></div>
          )}
          <div className={`relative flex items-center gap-3 bg-panel px-3 py-3 ${i === 0 ? "queue-bump" : ""} ${i === 2 ? "queue-swipe" : ""}`}>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${i === 0 ? "bg-accent text-white" : "bg-fill text-muted"}`}>{i + 1}</span>
            <span className="truncate text-[14px]">{r}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OneTapComposer() {
  return (
    <div className="relative rounded-2xl bg-bg p-4">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#a1a1aa] to-[#71717a] font-semibold text-white">K</span>
        <p className="pt-1.5 text-[16px] leading-[1.45]">{SAMPLES[0]}</p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] text-muted">Opened in X with your post typed</span>
        <span className="post-pulse relative rounded-full bg-ink px-4 py-1.5 text-[15px] font-bold text-bg">Post</span>
      </div>
      {/* animated cursor tapping the Post button */}
      <svg className="tap-cursor pointer-events-none absolute bottom-2 right-6" width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path d="M5 3l14 7-6 2-2 6z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section className="py-16">
      <div className="mb-10 text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.15em] text-accent">Features</p>
        <h2 className="text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">
          Your daily posting, <span className="text-muted">handled.</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Tile className="md:col-span-2" glow="rgba(255,159,10,0.16)">
          <TileHeading
            icon={<IconSparkles width={16} height={16} />} color="text-warn" eyebrow="AI writer"
            title="Writes in your niche." body="Set your topics and voice once. Every post is specific, on-brand, and under 280 characters."
          />
          <Typewriter />
        </Tile>

        <Tile glow="rgba(191,90,242,0.18)">
          <TileHeading
            icon={<IconBell width={16} height={16} />} color="text-purple" eyebrow="Reminders"
            title="Ready on time." body="A notification at each of your posting times."
          />
          <NotificationStack />
        </Tile>

        <Tile glow="rgba(10,132,255,0.18)">
          <TileHeading
            icon={<IconList width={16} height={16} />} color="text-accent" eyebrow="Queue"
            title="Your queue, your rules." body="Reorder, edit, or swipe away. Autopilot posts from the top."
          />
          <MiniQueue />
        </Tile>

        <Tile className="md:col-span-2" glow="rgba(48,209,88,0.16)">
          <TileHeading
            icon={<IconX width={14} height={14} />} color="text-ink" eyebrow="One tap"
            title="Publish with one tap. Free." body="X opens with the post already typed. No API fees, no bots, no risk to your account. Add API keys anytime for full autopilot."
          />
          <OneTapComposer />
        </Tile>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["$0", "to post with one tap", "rgba(48,209,88,.18)"],
          ["~6s", "to write a post", "rgba(255,159,10,.18)"],
          ["280", "characters, always", "rgba(10,132,255,.18)"],
          ["24/7", "schedule in your timezone", "rgba(191,90,242,.18)"],
        ].map(([big, small, glow]) => (
          <Tile key={big} className="p-5 text-center" glow={glow}>
            <p className="bg-gradient-to-b from-ink to-muted bg-clip-text text-[34px] font-bold tracking-tight text-transparent">{big}</p>
            <p className="text-[13px] text-muted">{small}</p>
          </Tile>
        ))}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[13px] text-muted">
        <IconBolt width={14} height={14} /> Hover the cards. They&apos;re live.
      </p>
    </section>
  );
}
