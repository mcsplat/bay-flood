"use client";

import Image from "next/image";
import type { FloodAlert, Outlook } from "@/types/flood";
import { ALERT_RANK } from "@/lib/categories";

const DIRECTION = {
  worsening: { label: "Getting worse", arrow: "↗", className: "bg-red-500/20 text-red-200" },
  steady: { label: "Holding steady", arrow: "→", className: "bg-amber-400/20 text-amber-100" },
  improving: { label: "Improving", arrow: "↘", className: "bg-emerald-400/20 text-emerald-200" },
} as const;

interface Props {
  alerts: FloodAlert[];
  outlook: Outlook | null | undefined;
  status: string;
  offline: boolean;
}

/** The sheet's always-visible row: the one-line answer to "what's happening, and which way is it going?" */
export function SheetHeader({ alerts, outlook, status, offline }: Props) {
  const top = [...alerts].sort((a, b) => ALERT_RANK[b.kind] - ALERT_RANK[a.kind])[0];
  const headline = top ? `${top.event}${alerts.length > 1 ? ` +${alerts.length - 1} more` : ""}` : "No active flood alerts";
  const dir = outlook ? DIRECTION[outlook.direction] : null;

  return (
    <div className="flex items-center gap-3 px-4 pb-3">
      <Image src="/brand/avatar.svg" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-[10px] ring-1 ring-white/15" unoptimized />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">{headline}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-brand-foam/80">
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${offline ? "bg-slate-300" : "bg-emerald-300"}`}
            aria-hidden
          />
          {status}
        </p>
      </div>
      {dir && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${dir.className}`}
          aria-label={`48-hour outlook: ${dir.label}`}
        >
          {dir.arrow} {dir.label}
        </span>
      )}
    </div>
  );
}
