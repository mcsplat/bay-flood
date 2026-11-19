"use client";

import type { GaugeDetail, GaugeSummary, Selection, TrafficCamera } from "@/types/flood";
import { NearbyCameras } from "@/components/camera/CameraPanel";
import { CATEGORY_COLOR, rank } from "@/lib/categories";
import { formatFeet, formatRelative, formatTime, trendLabel } from "@/lib/format";
import { usePolling } from "@/hooks/usePolling";
import { TimeSeriesChart, type ChartThreshold } from "@/components/charts/TimeSeriesChart";
import { BackButton } from "./AlertList";
import { Card, CategoryBadge, SectionTitle, Skeleton } from "@/components/ui/Badge";

export function GaugeList({ gauges, onSelect }: { gauges: GaugeSummary[]; onSelect: (s: Selection) => void }) {
  const elevated = gauges
    .filter((g) => rank(g.category) >= 1)
    .sort((a, b) => rank(b.category) - rank(a.category));
  const forecastPoints = gauges.filter((g) => g.forecast).length;

  return (
    <Card>
      <SectionTitle>Creeks &amp; rivers</SectionTitle>
      <p className="mb-2 text-xs text-muted">
        {gauges.length} live gauges · {forecastPoints} with official river forecasts
      </p>
      {elevated.length === 0 ? (
        <p className="text-sm text-muted">All gauges with flood stages are below action level.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {elevated.map((g) => (
            <li key={g.lid}>
              <button
                type="button"
                onClick={() => onSelect({ type: "gauge", id: g.lid })}
                className="w-full rounded-lg px-2 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 text-sm font-medium">{g.name}</span>
                  <CategoryBadge category={g.category} />
                </div>
                <p className="text-xs text-muted tabular-nums">
                  {formatFeet(g.observed?.stage)}
                  {g.observed && g.thresholds?.minor != null &&
                    ` · ${Math.abs(g.observed.stage - g.thresholds.minor).toFixed(1)} ft ${g.observed.stage >= g.thresholds.minor ? "above" : "below"} flood stage`}
                  {" · "}
                  {formatRelative(g.observed?.time)}
                  {trendLabel(g.trend) && <span className="block">{trendLabel(g.trend)}</span>}
                  {g.forecast && rank(g.forecast.category) > rank(g.observed?.category ?? "unknown") &&
                    ` · forecast ${formatFeet(g.forecast.stage)} ${formatTime(g.forecast.time)}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

interface DetailProps {
  summary: GaugeSummary;
  onBack: () => void;
  cameras: TrafficCamera[];
  onSelect: (s: Selection) => void;
}

export function GaugeDetailCard({ summary, onBack, cameras, onSelect }: DetailProps) {
  const { data, error, loading } = usePolling<GaugeDetail>(`/api/gauges/${summary.lid}`, 5 * 60_000);
  const t = data?.thresholds;
  const thresholds: ChartThreshold[] = t
    ? ([
        t.action != null && { label: "Action", value: t.action, color: CATEGORY_COLOR.action },
        t.minor != null && { label: "Minor flood", value: t.minor, color: CATEGORY_COLOR.minor },
        t.moderate != null && { label: "Moderate", value: t.moderate, color: CATEGORY_COLOR.moderate },
        t.major != null && { label: "Major", value: t.major, color: CATEGORY_COLOR.major },
      ].filter(Boolean) as ChartThreshold[])
    : [];

  return (
    <Card className="space-y-3">
      <BackButton onClick={onBack} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{summary.name}</h2>
          <p className="text-xs text-muted">NWPS gauge {summary.lid}</p>
        </div>
        <CategoryBadge category={summary.category} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[11px] text-muted">Stage now</p>
          <p className="font-semibold tabular-nums">{formatFeet(summary.observed?.stage, 2)}</p>
          <p className="text-[11px] text-muted">{formatRelative(summary.observed?.time)}</p>
          {trendLabel(summary.trend) && <p className="text-[11px] font-medium">{trendLabel(summary.trend)}</p>}
        </div>
        <div className="rounded-lg bg-surface-muted p-2">
          <p className="text-[11px] text-muted">Forecast</p>
          <p className="font-semibold tabular-nums">{summary.forecast ? formatFeet(summary.forecast.stage, 2) : "None issued"}</p>
          {summary.forecast && <p className="text-[11px] text-muted">{formatTime(summary.forecast.time)}</p>}
        </div>
      </div>
      {loading && !data && <Skeleton className="h-36 w-full" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <TimeSeriesChart
          ariaLabel={`Stage at ${summary.name}`}
          unit={data.unit}
          thresholds={thresholds}
          series={[
            { label: "Observed", points: data.observed, color: "#0284c7" },
            ...(data.forecast.length
              ? [{ label: `Forecast (issued ${formatTime(data.forecastIssued)})`, points: data.forecast, color: "#a855f7", dashed: true }]
              : []),
          ]}
        />
      )}
      {data && !thresholds.length && (
        <p className="text-[11px] text-muted">This gauge has no official flood stage. Watch for sharp rises.</p>
      )}
      <NearbyCameras cameras={cameras} lat={summary.lat} lon={summary.lon} onSelect={onSelect} />
    </Card>
  );
}
