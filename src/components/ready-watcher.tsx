"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "./icons";

const POLL_MS = 60_000;
const noopSubscribe = () => () => {};

/** Checks for posts that became ready while this tab is open, and sends a browser notification. */
export function ReadyWatcher() {
  const router = useRouter();
  const lastCount = useRef<number | null>(null);
  // Server render assumes "granted" so no banner flashes; the browser reports the real value.
  const browserPermission = useSyncExternalStore(
    noopSubscribe,
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    () => "granted" as const,
  );
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const permission = asked ?? browserPermission;

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch("/api/ready", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { count, first } = (await res.json()) as { count: number; first: string | null };
        document.title = count ? `(${count}) Ready to post · X Studio` : "X Studio";
        if (lastCount.current !== null && count > lastCount.current) {
          router.refresh();
          if ("Notification" in window && Notification.permission === "granted") {
            const n = new Notification("Time to post on X", { body: first?.slice(0, 120) ?? "A post is ready.", tag: "x-studio-ready" });
            n.onclick = () => {
              window.focus();
              router.push("/app");
              n.close();
            };
          }
        }
        lastCount.current = count;
      } catch {
        // offline or server restarting; try again next tick
      }
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router]);

  if (permission !== "default") return null;
  return (
    <div className="mt-3 flex animate-pop items-center gap-3 rounded-2xl bg-panel px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-bad text-white"><IconBell width={20} height={20} /></span>
      <span className="flex-1 text-[15px] leading-tight">
        <span className="block font-semibold">Turn on reminders</span>
        <span className="text-muted">Get notified when a post is ready. Keep this tab open.</span>
      </span>
      <button className="btn btn-tinted btn-sm" onClick={async () => setAsked(await Notification.requestPermission())}>
        Allow
      </button>
    </div>
  );
}
