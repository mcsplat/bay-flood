"use client";

import { useCallback, useMemo, useState } from "react";
import type { FloodAlert, GaugeSummary, OutageReport, Selection, TideStationReport } from "@/types/flood";
import { OutageDetail, OutageSummary } from "@/components/panel/OutagePanel";
import { usePolling } from "@/hooks/usePolling";
import { formatRelative } from "@/lib/format";
import { FloodMap } from "@/components/map/FloodMap";
import type { LayerKey } from "@/components/map/layers";
import { LayerToggles } from "@/components/map/LayerToggles";
import { SummaryCard } from "@/components/panel/SummaryCard";
import { AlertDetail, AlertList } from "@/components/panel/AlertList";
import { TideDetail, TideList } from "@/components/panel/TidePanel";
import { GaugeDetailCard, GaugeList } from "@/components/panel/GaugePanel";
import { Card, Skeleton } from "@/components/ui/Badge";

const MINUTE = 60_000;

export function FloodDashboard() {
  const alertsQ = usePolling<{ alerts: FloodAlert[] }>("/api/alerts", 2 * MINUTE);
  const tidesQ = usePolling<{ stations: TideStationReport[] }>("/api/tides", 6 * MINUTE);
  const gaugesQ = usePolling<{ gauges: GaugeSummary[] }>("/api/gauges", 5 * MINUTE);
  const outagesQ = usePolling<OutageReport>("/api/outages", 5 * MINUTE);
  const outages = outagesQ.data;

  const alerts = useMemo(() => alertsQ.data?.alerts ?? [], [alertsQ.data]);
  const tides = useMemo(() => tidesQ.data?.stations ?? [], [tidesQ.data]);
  const gauges = useMemo(() => gaugesQ.data?.gauges ?? [], [gaugesQ.data]);

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    alerts: true,
    gauges: true,
    tides: true,
    outages: true,
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);

  const select = useCallback(
    (s: Selection) => {
      setSelection(s);
      const point =
        s.type === "gauge"
          ? gauges.find((g) => g.lid === s.id)
          : s.type === "tide"
            ? tides.find((t) => t.id === s.id)
            : s.type === "outage"
              ? outages?.outages.find((o) => o.id === s.id)
              : null;
      if (point) setFocus([point.lon, point.lat]);
    },
    [gauges, tides, outages],
  );
  const back = () => setSelection(null);

  const loading = !alertsQ.data && !tidesQ.data && !gaugesQ.data;
  const errors = [alertsQ.error, tidesQ.error, gaugesQ.error, outagesQ.error].filter(Boolean);
  const updated = Math.max(alertsQ.updatedAt ?? 0, tidesQ.updatedAt ?? 0, gaugesQ.updatedAt ?? 0);

  const selectedAlert = selection?.type === "alert" ? alerts.find((a) => a.id === selection.id) : undefined;
  const selectedTide = selection?.type === "tide" ? tides.find((t) => t.id === selection.id) : undefined;
  const selectedGauge = selection?.type === "gauge" ? gauges.find((g) => g.lid === selection.id) : undefined;
  const selectedOutage = selection?.type === "outage" ? outages?.outages.find((o) => o.id === selection.id) : undefined;

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <aside
        className="order-2 flex min-h-0 flex-1 flex-col border-border bg-background md:order-1 md:w-[400px] md:flex-none md:border-r"
        aria-label="Flood conditions"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm text-white" aria-hidden>≋</span>
            <div>
              <p className="text-sm font-semibold leading-none">Bay Flood Watch</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {updated ? `Updated ${formatRelative(new Date(updated).toISOString())}` : "Loading live data…"}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {errors.length > 0 && (
            <p role="status" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {errors.join(" · ")}. Showing the latest data we have.
            </p>
          )}
          {loading ? (
            <Card className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ) : selectedAlert ? (
            <AlertDetail alert={selectedAlert} onBack={back} />
          ) : selectedTide ? (
            <TideDetail station={selectedTide} onBack={back} />
          ) : selectedGauge ? (
            <GaugeDetailCard summary={selectedGauge} onBack={back} />
          ) : selectedOutage ? (
            <OutageDetail outage={selectedOutage} onBack={back} />
          ) : (
            <>
              <SummaryCard alerts={alerts} gauges={gauges} tides={tides} />
              <AlertList alerts={alerts} onSelect={select} />
              <TideList tides={tides} onSelect={select} />
              <GaugeList gauges={gauges} onSelect={select} />
              {outages && <OutageSummary report={outages} onSelect={select} />}
            </>
          )}
          <p className="px-1 pb-2 text-[11px] leading-snug text-muted">
            Not an official warning service. Follow evacuation orders from local officials and call 911 in an emergency.
            Data: NWS, NOAA CO-OPS, NOAA NWPS/USGS, Cal OES.
          </p>
        </div>
      </aside>

      <main className="relative order-1 h-[45dvh] md:order-2 md:h-auto md:flex-1">
        <FloodMap alerts={alerts} gauges={gauges} tides={tides} outages={outages} layers={layers} selection={selection} focus={focus} onSelect={select} />
        <LayerToggles layers={layers} onChange={setLayers} />
      </main>
    </div>
  );
}
