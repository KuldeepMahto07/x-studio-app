"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon, IconClock, IconGear, IconHome, IconList, IconSparkles } from "./icons";

const TABS = [
  { href: "/app", label: "Home", Icon: IconHome },
  { href: "/app/drafts", label: "Drafts", Icon: IconSparkles },
  { href: "/app/queue", label: "Queue", Icon: IconList },
  { href: "/app/history", label: "History", Icon: IconClock },
  { href: "/app/settings", label: "Settings", Icon: IconGear },
] as const;

function useActive() {
  const path = usePathname();
  return (href: string) =>
    href === "/app" ? path === "/app"
    : href === "/app/settings" ? path.startsWith("/app/settings") || path.startsWith("/app/setup")
    : path.startsWith(href);
}

/** iPadOS-style sidebar (desktop). */
export function Sidebar({ handle, plan, queueCount }: { handle: string; plan: string; queueCount: number }) {
  const isActive = useActive();
  return (
    <aside className="material sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
      <Link href="/app" className="mb-6 flex items-center gap-2.5 px-2">
        <AppIcon size={30} />
        <span className="text-[20px] font-bold tracking-tight">X Studio</span>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`pressable flex h-10 items-center gap-3 rounded-[10px] px-2.5 text-[17px] ${active ? "bg-accent font-semibold text-white" : "text-ink hover:bg-fill"}`}
            >
              <Icon width={22} height={22} className={active ? "text-white" : "text-accent"} />
              <span className="flex-1">{label}</span>
              {href === "/app/queue" && queueCount > 0 && (
                <span className={`text-[15px] tabular-nums ${active ? "text-white/80" : "text-muted"}`}>{queueCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <Link href="/app/settings" className="pressable mt-auto flex items-center gap-3 rounded-xl p-2 hover:bg-fill">
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-b from-[#a1a1aa] to-[#71717a] text-[15px] font-semibold text-white">
          {handle.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">@{handle}</span>
          <span className="block text-[13px] text-muted">{plan} plan</span>
        </span>
      </Link>
    </aside>
  );
}

/** iOS tab bar (phones). */
export function TabBar() {
  const isActive = useActive();
  return (
    <nav className="material fixed inset-x-0 bottom-0 z-40 flex border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-1 pt-1.5 text-[10px] font-medium transition-colors ${active ? "text-accent" : "text-faint"}`}
          >
            <Icon width={25} height={25} strokeWidth={active ? 2.2 : 1.8} className="transition-transform duration-200 active:scale-90" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
