"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/app", "Overview"],
  ["/app/drafts", "Drafts"],
  ["/app/queue", "Queue"],
  ["/app/history", "History"],
  ["/app/setup", "Niche"],
  ["/app/settings", "Schedule & plan"],
] as const;

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(([href, label]) => {
        const active = href === "/app" ? path === "/app" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-panel-2 text-ink" : "text-muted hover:bg-panel hover:text-ink"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
