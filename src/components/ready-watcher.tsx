"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

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
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 px-4 py-2.5 text-sm">
      <span className="flex-1">Get a notification when a post is ready (keep this tab open).</span>
      <button className="btn" onClick={async () => setAsked(await Notification.requestPermission())}>
        Turn on reminders
      </button>
    </div>
  );
}
