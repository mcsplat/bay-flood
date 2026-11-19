"use client";

import type { Outlook, OutlookDirection, OutlookMoment } from "@/types/flood";
import { CATEGORY_COLOR } from "@/lib/categories";
import { formatRelative, formatTime } from "@/lib/format";
import { Card, SectionTitle, Skeleton } from "@/components/ui/Badge";
import { RainTimeline } from "./RainTimeline";

const DIRECTION: Record<OutlookDirection, { label: string; arrow: string; color: string; blurb: string }> = {
  worsening: { label: "Getting worse", arrow: "↗", color: "#dc2626", blurb: "Conditions are likely to deteriorate over the next several hours." },
  steady: { label: "Holding steady", arrow: "→", color: "#d97706", blurb: "No clear shift either way right now; keep an eye on the moments below." },
  improving: { label: "Improving", arrow: "↘", color: "#059669", blurb: "Rain is easing and water levels are generally dropping." },
};

const KIND_ICON: Record<OutlookMoment["kind"], string> = {
  rain: "🌧",
  tide: "🌊",
  crest: "📈",
  "flood-stage": "⚠️",
  compound: "⛈",
};

interface Props {
  outlook: Outlook | null;
  error: string | null;
  onFocus: (at: [number, number]) => void;
}

export function OutlookCard({ outlook, error, onFocus }: Props) {
  if (!outlook) {
    return (
      <Card className="space-y-3">
        <SectionTitle>Outlook · next 48 hours</SectionTitle>
        {error ? <p className="text-sm text-muted">{error}</p> : <Skeleton className="h-28 w-full" />}
      </Card>
    );
  }

  const d = DIRECTION[outlook.direction];
  return (
    <Card className="space-y-3">
      <SectionTitle>Outlook · next 48 hours</SectionTitle>

      <div className="flex items-start gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl font-bold"
          style={{ color: d.color, background: `${d.color}1f` }}
          aria-hidden
        >
          {d.arrow}
        </span>
        <div>
          <p className="text-base font-semibold" style={{ color: d.color }}>{d.label}</p>
          <p className="text-xs text-muted">{d.blurb}</p>
        </div>
      </div>

      <ul className="space-y-1 text-[13px] leading-snug">
        {outlook.reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-muted" aria-hidden>•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      <RainTimeline rain={outlook.bayRain} moments={outlook.moments} />

      {outlook.moments.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Key moments</p>
          <ul className="-mx-2 divide-y divide-border">
            {outlook.moments.map((m, i) => (
              <li key={`${m.kind}-${m.time}-${i}`}>
                <button
                  type="button"
                  disabled={!m.at}
                  onClick={() => m.at && onFocus(m.at)}
                  className="flex w-full gap-2.5 rounded-lg px-2 py-2 text-left enabled:hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="mt-0.5 text-sm" aria-hidden>{KIND_ICON[m.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium leading-snug">{m.title}</span>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[m.severity] }} aria-hidden />
                    </span>
                    <span className="block text-xs text-muted">
                      {formatTime(m.time)} ({formatRelative(m.time)}) · {m.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] leading-snug text-muted">
        Estimates built from NWS rain forecasts, official river forecasts, recent gauge trends, and tide predictions.
        Not an official forecast.
      </p>
    </Card>
  );
}
