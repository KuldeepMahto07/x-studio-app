"use client";

import { useRef } from "react";
import { markPostedAction, skipReadyAction } from "@/app/actions";
import { xIntentUrl, type Post } from "@/lib/types";
import { AppIcon } from "./icons";

/** A prepared post shown as an iOS notification. One click opens X's composer with the text filled in. */
export function ReadyCard({ post, index }: { post: Post; index: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={markPostedAction}
      className="material animate-pop rounded-[22px] p-4 shadow-[var(--shadow)] ring-[0.5px] ring-line"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <input type="hidden" name="id" value={post.id} />
      <div className="mb-1.5 flex items-center gap-2 text-[13px] text-muted">
        <AppIcon size={20} />
        <span className="font-semibold uppercase tracking-wide">X Studio</span>
        <span className="ml-auto">now</span>
      </div>
      <p className="mb-0.5 text-[15px] font-semibold">Time to post</p>
      <p className="whitespace-pre-wrap text-[15px] leading-[1.35]">{post.text}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button formAction={skipReadyAction} className="btn btn-gray btn-sm h-10 rounded-xl">Skip</button>
        <a
          href={xIntentUrl(post.text)}
          target="_blank"
          rel="noreferrer"
          className="btn btn-filled btn-sm h-10 rounded-xl"
          onClick={() => {
            navigator.vibrate?.(10);
            setTimeout(() => formRef.current?.requestSubmit(), 300);
          }}
        >
          Post on X
        </a>
      </div>
    </form>
  );
}
