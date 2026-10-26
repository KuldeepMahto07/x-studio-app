"use client";

import { useActionState } from "react";
import {
  deleteAction, generateDrafts, moveDownAction, moveUpAction, postNowAction, queueAction, saveNicheAction,
  saveScheduleAction, saveTextAction, type ActionState,
} from "@/app/actions";
import { Flash, PostTextarea, SubmitButton } from "./ui";
import type { Niche, Post } from "@/lib/types";

export function NicheForm({ niche, firstTime }: { niche: Niche; firstTime: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveNicheAction, null);
  const v = state?.values; // after a validation error, show what the user typed
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="niche">Your niche</label>
        <input id="niche" name="niche" className="field" defaultValue={v?.niche ?? niche.niche} placeholder="e.g. AI tools and coding with AI for indie developers" />
      </div>
      <div>
        <label className="label" htmlFor="audience">Who you&apos;re writing for</label>
        <input id="audience" name="audience" className="field" defaultValue={v?.audience ?? niche.audience} placeholder="e.g. Developers and creators who want to ship faster" />
      </div>
      <div>
        <label className="label" htmlFor="voice">Your voice</label>
        <textarea id="voice" name="voice" rows={2} className="field" defaultValue={v?.voice ?? niche.voice} />
      </div>
      <div>
        <label className="label" htmlFor="topics">
          Topics <span className="font-normal text-muted">(one per line, at least 3; each post picks one)</span>
        </label>
        <textarea
          id="topics" name="topics" rows={7} className="field" defaultValue={v?.topics ?? niche.topics.join("\n")}
          placeholder={"a lesser-known AI tool and what it's good for\na prompt-writing tip with an example\nautomating a boring task with AI"}
        />
      </div>
      <div>
        <label className="label" htmlFor="formats">
          Post formats <span className="font-normal text-muted">(one per line)</span>
        </label>
        <textarea id="formats" name="formats" rows={6} className="field" defaultValue={v?.formats ?? niche.formats.join("\n")} />
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton className="btn btn-primary">{firstTime ? "Save and write my first drafts" : "Save"}</SubmitButton>
        <Flash state={state} />
      </div>
    </form>
  );
}

export function GenerateForm() {
  const [state, action] = useActionState<ActionState, FormData>(generateDrafts, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <select name="count" defaultValue="3" className="field w-auto">
        <option value="1">1 draft</option>
        <option value="3">3 drafts</option>
        <option value="5">5 drafts</option>
      </select>
      <SubmitButton className="btn btn-primary" pendingText="Writing…">Generate drafts</SubmitButton>
      <Flash state={state} />
    </form>
  );
}

export function DraftCard({ post }: { post: Post }) {
  const [state, action] = useActionState<ActionState, FormData>(queueAction, null);
  return (
    <div className="card">
      <div className="mb-2 flex flex-wrap gap-2">
        <span className="tag">{post.topic}</span>
        <span className="tag">{post.format}</span>
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={post.id} />
        <PostTextarea defaultValue={state?.values?.text ?? post.text} />
        <div className="mt-2 flex items-center gap-2">
          <Flash state={state} />
          <div className="flex-1" />
          <button formAction={deleteAction} className="btn btn-ghost btn-danger">Discard</button>
          <SubmitButton pendingText="Adding…">Add to queue</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function ManualPostForm() {
  const [state, action] = useActionState<ActionState, FormData>(queueAction, null);
  return (
    <form action={action} className="card">
      <div className="mb-2"><span className="tag">Write your own</span></div>
      <PostTextarea defaultValue={state?.values?.text ?? ""} placeholder="Type a post…" />
      <div className="mt-2 flex items-center gap-2">
        <Flash state={state} />
        <div className="flex-1" />
        <SubmitButton pendingText="Adding…">Add to queue</SubmitButton>
      </div>
    </form>
  );
}

export function QueueCard({ post, index, total }: { post: Post; index: number; total: number }) {
  const [state, action] = useActionState<ActionState, FormData>(saveTextAction, null);
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
        <span className="font-bold text-accent">{index === 0 ? "Next up" : `#${index + 1}`}</span>
        <span className="tag">{post.topic}</span>
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={post.id} />
        <PostTextarea defaultValue={state?.values?.text ?? post.text} />
        <div className="mt-2 flex items-center gap-2">
          <Flash state={state} />
          <div className="flex-1" />
          <button formAction={moveUpAction} disabled={index === 0} className="btn btn-ghost" aria-label="Move up">↑</button>
          <button formAction={moveDownAction} disabled={index === total - 1} className="btn btn-ghost" aria-label="Move down">↓</button>
          <button formAction={deleteAction} className="btn btn-ghost btn-danger">Remove</button>
          <SubmitButton>Save</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function PostNowButton({ oneClick }: { oneClick: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(postNowAction, null);
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton pendingText={oneClick ? "Preparing…" : "Posting…"}>{oneClick ? "Get one ready" : "Post one now"}</SubmitButton>
      <Flash state={state} />
    </form>
  );
}

const TIMEZONES = [
  "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Sao_Paulo",
];

export function ScheduleForm({ timezone, slots, maxSlots }: { timezone: string; slots: string[]; maxSlots: number }) {
  const [state, action] = useActionState<ActionState, FormData>(saveScheduleAction, null);
  const zones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  const rows = Array.from({ length: maxSlots }, (_, i) => slots[i] ?? "");
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="timezone">Timezone</label>
        <select id="timezone" name="timezone" defaultValue={state?.values?.timezone ?? timezone} className="field w-auto">
          {zones.map((z) => <option key={z}>{z}</option>)}
        </select>
      </div>
      <div>
        <span className="label">Posting times <span className="font-normal text-muted">(up to {maxSlots} on your plan; leave blank to skip)</span></span>
        <div className="flex flex-wrap gap-2">
          {rows.map((t, i) => (
            <input key={i} type="time" name="slot" defaultValue={t} className="field w-auto" aria-label={`Posting time ${i + 1}`} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton className="btn btn-primary">Save schedule</SubmitButton>
        <Flash state={state} />
      </div>
    </form>
  );
}
