"use client";

import type { Selection, TideStationReport } from "@/types/flood";
import { useNow } from "@/hooks/useNow";
import { CATEGORY_COLOR } from "@/lib/categories";
import { formatFeet, formatTime, signedFeet } from "@/lib/format";
import { TimeSeriesChart, type ChartThreshold } from "@/components/charts/TimeSeriesChart";
import { BackButton } from "./AlertList";
import { Card, CategoryBadge, SectionTitle } from "@/components/ui/Badge";

export function TideList({ tides, onSelect }: { tides: TideStationReport[]; onSelect: (s: Selection) => void }) {
  return (
    <Card>
      <SectionTitle>Bay water levels</SectionTitle>
      <ul className="-mx-2 divide-y divide-border">
        {tides.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect({ type: "tide", id: s.id })}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[s.outlook] }} aria-hidden />
                {s.name}
              </span>
              <span className="text-right text-xs tabular-nums text-muted">
                <span className="font-semibold text-foreground">{formatFeet(s.observed?.v)}</span> · surge {signedFeet(s.surge)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-muted">
        Surge is how far the water is running above the astronomical tide. Storms and low pressure push it up, and it
        stacks on top of each high tide.
      </p>
    </Card>
  );
}

export function TideDetail({ station, onBack }: { station: TideStationReport; onBack: () => void }) {
  const t = station.thresholds;
  const thresholds: ChartThreshold[] = [
    t.action != null && { label: "Action", value: t.action, color: CATEGORY_COLOR.action },
    t.minor != null && { label: "Minor flood", value: t.minor, color: CATEGORY_COLOR.minor },
    t.moderate != null && { label: "Moderate", value: t.moderate, color: CATEGORY_COLOR.moderate },
    t.major != null && { label: "Major", value: t.major, color: CATEGORY_COLOR.major },
  ].filter(Boolean) as ChartThreshold[];

  const now = useNow();
  const surge = station.surge ?? 0;
  const projected = station.predictions
    .filter((p) => Date.parse(p.t) >= now)
    .map((p) => ({ t: p.t, v: p.v + surge }));
  const highs = station.extremes.filter((e) => e.type === "H");

  return (
    <Card className="space-y-3">
      <BackButton onClick={onBack} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{station.name}</h2>
          <p className="text-xs text-muted">NOAA tide station {station.id} · feet above MLLW</p>
        </div>
        <CategoryBadge category={station.outlook} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[11px] text-muted">Observed</p>
          <p className="font-semibold tabular-nums">{formatFeet(station.observed?.v, 2)}</p>
        </div>
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[11px] text-muted">Surge vs. forecast tide</p>
          <p className="font-semibold tabular-nums">{signedFeet(station.surge)}</p>
        </div>
      </div>
      <TimeSeriesChart
        ariaLabel={`Water level at ${station.name}, past 12 hours and next 72 hours`}
        thresholds={thresholds}
        series={[
          { label: "Predicted tide", points: station.predictions, color: "#94a3b8", dashed: true },
          { label: "With current surge", points: projected, color: "#0ea5e9", dashed: true },
          { label: "Observed", points: station.observations, color: "#0284c7" },
        ]}
      />
      <div>
        <SectionTitle>Upcoming high tides</SectionTitle>
        <ul className="space-y-1 text-[13px]">
          {highs.map((h) => (
            <li key={h.t} className="flex items-center justify-between gap-2">
              <span className="text-muted">{formatTime(h.t)}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {h.v.toFixed(1)} → <span className="font-semibold">{h.projected.toFixed(1)} ft</span>
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[h.category] }} aria-label={h.category} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Projection assumes today&apos;s surge persists. It is a rough estimate, not an official forecast.
        </p>
      </div>
    </Card>
  );
}
