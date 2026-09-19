"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LiveCallState } from "@/lib/live-call-state";

const TABS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/incidents", label: "Incidents", match: (path: string) => path.startsWith("/incidents") },
  { href: "/calls", label: "Calls", match: (path: string) => path.startsWith("/calls") },
  { href: "/live", label: "Live Call", match: (path: string) => path.startsWith("/live") },
];

export default function TopNav() {
  const pathname = usePathname();
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/live-call", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { call: LiveCallState | null };
        setLiveCount(data.call && data.call.status !== "ended" ? 1 : 0);
      } catch {
        // transient network error while polling; keep the last known count
      }
    }

    void poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 flex items-center justify-between border-b border-hairline bg-paper px-8">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 text-ink no-underline">
          <span className="grid h-7 w-7 place-items-center rounded-[5px] bg-ink font-mono text-[11px] font-bold text-mint">
            R3
          </span>
          <span className="text-base font-bold tracking-tight">Relay311</span>
        </Link>
        <nav className="flex items-center gap-6">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 py-5 text-sm font-medium no-underline transition-colors ${
                  active ? "border-signal text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-green-text">
          <span className="h-2 w-2 rounded-full bg-green-text shadow-[0_0_0_4px_rgba(57,117,84,0.14)]" />
          {liveCount} LIVE
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-bold text-paper">
          OP
        </span>
      </div>
    </header>
  );
}
