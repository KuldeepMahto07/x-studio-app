"use client";

import { useRef } from "react";
import { markPostedAction, skipReadyAction } from "@/app/actions";
import { xIntentUrl, type Post } from "@/lib/types";

/** A prepared post: one click opens X's composer with the text filled in, then it moves to History. */
export function ReadyCard({ post }: { post: Post }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <div className="card border-accent/60">
      <p className="whitespace-pre-wrap">{post.text}</p>
      <form ref={formRef} action={markPostedAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={post.id} />
        <a
          href={xIntentUrl(post.text)}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
          onClick={() => setTimeout(() => formRef.current?.requestSubmit(), 300)}
        >
          Post on X ↗
        </a>
        <button formAction={skipReadyAction} className="btn btn-ghost">Skip (back to queue)</button>
        <span className="text-xs text-muted">{post.text.length} / 280 · opens X with the post typed, you press Post</span>
      </form>
    </div>
  );
}
