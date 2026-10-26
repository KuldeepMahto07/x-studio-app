"use client";

import { useActionState, useOptimistic, useRef, useState, useTransition, type PointerEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteAction, generateDrafts, moveDownAction, moveUpAction, postNowAction, queueAction, saveNicheAction,
  saveScheduleAction, saveTextAction, toggleAutopilot, type ActionState,
} from "@/app/actions";
import { Flash, PostTextarea, Segmented, SubmitButton, Switch } from "./ui";
import { IconArrowDown, IconArrowUp, IconBolt, IconChevron, IconPlus, IconSparkles, IconTrash } from "./icons";
import type { Niche, Post } from "@/lib/types";

// ---------- Niche ----------

export function NicheForm({ niche, firstTime }: { niche: Niche; firstTime: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveNicheAction, null);
  const v = state?.values; // after a validation error, show what the user typed
  return (
    <form action={action} className="space-y-7">
      <section className="animate-rise">
        <h2 className="section-header">About your account</h2>
        <div className="group-list">
          <label className="row">
            <span className="w-24 shrink-0 text-[17px]">Niche</span>
            <input name="niche" className="field-inset" defaultValue={v?.niche ?? niche.niche} placeholder="AI tools for indie developers" />
          </label>
          <label className="row">
            <span className="w-24 shrink-0 text-[17px]">Audience</span>
            <input name="audience" className="field-inset" defaultValue={v?.audience ?? niche.audience} placeholder="Developers who want to ship faster" />
          </label>
        </div>
      </section>

      <section className="animate-rise" style={{ animationDelay: "60ms" }}>
        <h2 className="section-header">Voice</h2>
        <div className="group-list px-4 py-3">
          <textarea name="voice" rows={2} className="field-inset resize-none" defaultValue={v?.voice ?? niche.voice} />
        </div>
        <p className="section-footer">How your posts should sound.</p>
      </section>

      <section className="animate-rise" style={{ animationDelay: "120ms" }}>
        <h2 className="section-header">Topics</h2>
        <div className="group-list px-4 py-3">
          <textarea
            name="topics" rows={6} className="field-inset resize-y" defaultValue={v?.topics ?? niche.topics.join("\n")}
            placeholder={"a lesser-known AI tool and what it's good for\na prompt-writing tip with an example\nautomating a boring task with AI"}
          />
        </div>
        <p className="section-footer">One per line, at least 3. Each post picks one at random.</p>
      </section>

      <section className="animate-rise" style={{ animationDelay: "180ms" }}>
        <h2 className="section-header">Post formats</h2>
        <div className="group-list px-4 py-3">
          <textarea name="formats" rows={6} className="field-inset resize-y" defaultValue={v?.formats ?? niche.formats.join("\n")} />
        </div>
      </section>

      <div className="space-y-3">
        <SubmitButton className="btn btn-filled w-full">{firstTime ? "Continue" : "Save"}</SubmitButton>
        <div className="text-center"><Flash state={state} /></div>
      </div>
    </form>
  );
}

// ---------- Drafts ----------

function GeneratingSkeletons({ count }: { count: number }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card animate-rise space-y-2.5" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex gap-2"><span className="skeleton h-5 w-28 rounded-full" /><span className="skeleton h-5 w-20 rounded-full" /></div>
          <span className="skeleton block h-4 w-full rounded" />
          <span className="skeleton block h-4 w-11/12 rounded" />
          <span className="skeleton block h-4 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function GenerateForm() {
  const [state, action] = useActionState<ActionState, FormData>(generateDrafts, null);
  const [count, setCount] = useState("3");
  return (
    <form action={action}>
      <div className="card flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <Segmented name="count" defaultValue="3" onChange={setCount} options={[{ value: "1", label: "1" }, { value: "3", label: "3" }, { value: "5", label: "5" }]} />
        </div>
        <SubmitButton className="btn btn-filled" pendingText="Writing…">
          <IconSparkles width={20} height={20} /> Generate
        </SubmitButton>
      </div>
      <div className="mt-2 px-1"><Flash state={state} /></div>
      <GeneratingSkeletons count={Number(count)} />
    </form>
  );
}

export function DraftCard({ post, index }: { post: Post; index: number }) {
  const [state, action] = useActionState<ActionState, FormData>(queueAction, null);
  return (
    <form action={action} className="card animate-rise" style={{ animationDelay: `${index * 70}ms` }}>
      <input type="hidden" name="id" value={post.id} />
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="chip">{post.topic}</span>
        <span className="chip">{post.format}</span>
      </div>
      <PostTextarea defaultValue={state?.values?.text ?? post.text} />
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <button formAction={deleteAction} className="btn btn-plain text-bad" onClick={() => navigator.vibrate?.(8)}>Discard</button>
        <div className="flex-1 text-right"><Flash state={state} /></div>
        <SubmitButton className="btn btn-tinted btn-sm" pendingText="Adding">
          <IconPlus width={16} height={16} /> Queue
        </SubmitButton>
      </div>
    </form>
  );
}

export function ComposeCard() {
  const [state, action] = useActionState<ActionState, FormData>(queueAction, null);
  return (
    <form action={action} className="card">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Write your own</p>
      <PostTextarea defaultValue={state?.values?.text ?? ""} placeholder="What's happening?" />
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <div className="flex-1"><Flash state={state} /></div>
        <SubmitButton className="btn btn-filled btn-sm" pendingText="Adding">Add to Queue</SubmitButton>
      </div>
    </form>
  );
}

// ---------- Queue ----------

const SWIPE_OPEN = -88;

/** Queue row: swipe left to reveal Delete, tap to expand the editor. */
export function QueueRow({ post, index, total }: { post: Post; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; base: number } | null>(null);
  const moved = useRef(false);
  const [state, action] = useActionState<ActionState, FormData>(saveTextAction, null);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, base: dx };
    moved.current = false;
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const d = e.clientX - start.current.x;
    if (!moved.current && Math.abs(d) < 6) return;
    if (!moved.current) e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = true;
    setDragging(true);
    setDx(Math.max(Math.min(start.current.base + d, 0), SWIPE_OPEN - 40));
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    setDx((x) => (x < SWIPE_OPEN / 2 ? SWIPE_OPEN : 0));
  };
  const onTap = () => {
    if (moved.current) return;
    if (dx !== 0) return setDx(0);
    setOpen((o) => !o);
  };

  return (
    <div className="relative overflow-hidden">
      <form action={deleteAction} className="absolute inset-y-0 right-0 flex">
        <input type="hidden" name="id" value={post.id} />
        <button className="flex w-[88px] flex-col items-center justify-center gap-0.5 bg-bad text-[13px] font-medium text-white" aria-label="Delete">
          <IconTrash width={20} height={20} /> Delete
        </button>
      </form>
      <div
        className={`relative bg-panel ${dragging ? "" : "transition-transform duration-300"}`}
        style={{ transform: `translateX(${dx}px)`, transitionTimingFunction: "var(--ease-spring)" }}
      >
        <div
          role="button"
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={onTap}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}
          className="flex cursor-pointer touch-pan-y select-none items-start gap-3 px-4 py-3 transition-colors active:bg-fill"
        >
          <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${index === 0 ? "bg-accent text-white" : "bg-fill text-muted"}`}>
            {index + 1}
          </span>
          <span className={`flex-1 text-[16px] leading-[1.35] ${open ? "" : "line-clamp-2"}`}>{post.text}</span>
          <IconChevron className={`mt-1 text-faint transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
        </div>
        <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} style={{ transitionTimingFunction: "var(--ease-spring)" }}>
          <div className="overflow-hidden">
            <form action={action} className="space-y-3 px-4 pb-4 pl-13">
              <input type="hidden" name="id" value={post.id} />
              <div className="rounded-xl bg-bg px-3 py-2"><PostTextarea defaultValue={state?.values?.text ?? post.text} /></div>
              <div className="flex items-center gap-2">
                <button formAction={moveUpAction} disabled={index === 0} className="btn btn-gray btn-sm" aria-label="Move up"><IconArrowUp width={16} height={16} /></button>
                <button formAction={moveDownAction} disabled={index === total - 1} className="btn btn-gray btn-sm" aria-label="Move down"><IconArrowDown width={16} height={16} /></button>
                <div className="flex-1 text-right"><Flash state={state} /></div>
                <SubmitButton className="btn btn-filled btn-sm">Save</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Home ----------

/** Autopilot toggle that flips instantly and saves in the background. */
export function AutopilotSwitch({ on }: { on: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, startTransition] = useTransition();
  return (
    <Switch
      checked={optimistic}
      label="Autopilot"
      onChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          const fd = new FormData();
          fd.set("on", next ? "1" : "0");
          await toggleAutopilot(fd);
        })
      }
    />
  );
}

export function PostNowButton({ oneClick }: { oneClick: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(postNowAction, null);
  return (
    <form action={action} className="space-y-2">
      <SubmitButton className="btn btn-filled w-full" pendingText={oneClick ? "Preparing…" : "Posting…"}>
        <IconBolt width={20} height={20} /> {oneClick ? "Get a Post Ready Now" : "Post Now"}
      </SubmitButton>
      <div className="text-center"><Flash state={state} /></div>
    </form>
  );
}

// ---------- Settings ----------

const TIMEZONES = [
  "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Sao_Paulo",
];

export function ScheduleForm({ timezone, slots, maxSlots }: { timezone: string; slots: string[]; maxSlots: number }) {
  const [state, action] = useActionState<ActionState, FormData>(saveScheduleAction, null);
  const zones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  const rows = Array.from({ length: maxSlots }, (_, i) => slots[i] ?? "");
  return (
    <form action={action}>
      <div className="group-list">
        <label className="row">
          <span className="flex-1">Time Zone</span>
          <select name="timezone" defaultValue={state?.values?.timezone ?? timezone} className="max-w-[55%] appearance-none bg-transparent text-right text-muted outline-none">
            {zones.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
          </select>
          <IconChevron className="text-faint" />
        </label>
        {rows.map((t, i) => (
          <label key={i} className="row">
            <span className="flex-1">{maxSlots > 1 ? `Post ${i + 1}` : "Post at"}</span>
            <input type="time" name="slot" defaultValue={t} className="rounded-lg bg-fill px-2.5 py-1 text-[17px] tabular-nums outline-none" aria-label={`Posting time ${i + 1}`} />
          </label>
        ))}
      </div>
      <p className="section-footer">Leave a time empty to skip it. Your plan allows {maxSlots} a day.</p>
      <div className="mt-3 flex items-center gap-3">
        <SubmitButton className="btn btn-tinted btn-sm">Save Schedule</SubmitButton>
        <Flash state={state} />
      </div>
    </form>
  );
}
