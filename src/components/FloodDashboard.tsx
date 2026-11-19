"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FloodAlert, GaugeSummary, Outlook, OutageReport, Selection, TideStationReport, TrafficCamera } from "@/types/flood";
import { OutlookCard } from "@/components/outlook/OutlookCard";
import { InstallHint } from "@/components/pwa/InstallHint";
import { CameraDetail } from "@/components/camera/CameraPanel";
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
  const outlookQ = usePolling<Outlook>("/api/outlook", 10 * MINUTE);
  const outages = outagesQ.data;
  const camerasQ = usePolling<{ cameras: TrafficCamera[] }>("/api/cameras", 60 * MINUTE);
  const cameras = useMemo(() => camerasQ.data?.cameras ?? [], [camerasQ.data]);

  const alerts = useMemo(() => alertsQ.data?.alerts ?? [], [alertsQ.data]);
  const tides = useMemo(() => tidesQ.data?.stations ?? [], [tidesQ.data]);
  const gauges = useMemo(() => gaugesQ.data?.gauges ?? [], [gaugesQ.data]);

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    alerts: true,
    gauges: true,
    tides: true,
    outages: true,
    cameras: true,
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
              : s.type === "camera"
                ? cameras.find((c) => c.id === s.id)
                : null;
      if (point) setFocus([point.lon, point.lat]);
    },
    [gauges, tides, outages, cameras],
  );
  const back = () => setSelection(null);

  const loading = !alertsQ.data && !tidesQ.data && !gaugesQ.data;
  const errors = [alertsQ.error, tidesQ.error, gaugesQ.error, outagesQ.error, camerasQ.error].filter(Boolean);
  const offline = [alertsQ, tidesQ, gaugesQ, outagesQ, outlookQ].some((q) => q.offline);
  const updated = Math.max(alertsQ.updatedAt ?? 0, tidesQ.updatedAt ?? 0, gaugesQ.updatedAt ?? 0);

  const selectedAlert = selection?.type === "alert" ? alerts.find((a) => a.id === selection.id) : undefined;
  const selectedTide = selection?.type === "tide" ? tides.find((t) => t.id === selection.id) : undefined;
  const selectedGauge = selection?.type === "gauge" ? gauges.find((g) => g.lid === selection.id) : undefined;
  const selectedOutage = selection?.type === "outage" ? outages?.outages.find((o) => o.id === selection.id) : undefined;
  const selectedCamera = selection?.type === "camera" ? cameras.find((c) => c.id === selection.id) : undefined;

  return (
    <div className="flex h-dvh flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:flex-row">
      <aside
        className="order-2 flex min-h-0 flex-1 flex-col border-border bg-background md:order-1 md:w-[400px] md:flex-none md:border-r md:pt-[env(safe-area-inset-top)]"
        aria-label="Flood conditions"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/brand/avatar.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-lg" priority unoptimized />
            <div>
              <p className="text-sm font-semibold leading-none">Bay Flood Watch</p>
              <p className="mt-0.5 text-[11px] text-muted">
                {offline ? "Showing saved data" : updated ? `Updated ${formatRelative(new Date(updated).toISOString())}` : "Loading live data…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
          <Link href="/about" className="text-xs font-medium text-muted hover:text-foreground">
            About
          </Link>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="relative flex h-2 w-2">
              {!offline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${offline ? "bg-slate-400" : "bg-emerald-500"}`} />
            </span>
            {offline ? "Offline" : "Live"}
          </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <InstallHint />
          {offline && (
            <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
              <span className="font-semibold">You&apos;re offline.</span> Showing the last data this device received; it
              may be out of date.
            </p>
          )}
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
            <GaugeDetailCard summary={selectedGauge} onBack={back} cameras={cameras} onSelect={select} />
          ) : selectedOutage ? (
            <OutageDetail outage={selectedOutage} onBack={back} />
          ) : selectedCamera ? (
            <CameraDetail camera={selectedCamera} onBack={back} />
          ) : (
            <>
              <SummaryCard alerts={alerts} gauges={gauges} tides={tides} />
              <OutlookCard outlook={outlookQ.data} error={outlookQ.error} onFocus={setFocus} />
              <AlertList alerts={alerts} onSelect={select} />
              <TideList tides={tides} onSelect={select} />
              <GaugeList gauges={gauges} onSelect={select} />
              {outages && <OutageSummary report={outages} onSelect={select} />}
            </>
          )}
          <p className="px-1 pb-2 text-[11px] leading-snug text-muted">
            Not an official warning service. Follow evacuation orders from local officials and call 911 in an emergency.{" "}
            <Link href="/about" className="underline">About this app</Link>.
            Data: NWS, NOAA CO-OPS, NOAA NWPS/USGS, Cal OES, Caltrans.
          </p>
        </div>
      </aside>

      <main className="relative order-1 h-[45dvh] md:order-2 md:h-auto md:flex-1">
        <FloodMap alerts={alerts} gauges={gauges} tides={tides} outages={outages} cameras={cameras} layers={layers} selection={selection} focus={focus} onSelect={select} />
        <LayerToggles layers={layers} onChange={setLayers} />
      </main>
    </div>
  );
}
