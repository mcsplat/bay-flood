"use client";

import Link from "next/link";
import type { Selection } from "@/types/flood";
import type { FloodData } from "@/hooks/useFloodData";
import { OutlookCard } from "@/components/outlook/OutlookCard";
import { InstallHint } from "@/components/pwa/InstallHint";
import { CameraDetail } from "@/components/camera/CameraPanel";
import { OutageDetail, OutageSummary } from "@/components/panel/OutagePanel";
import { ClosureDetail, ClosureSummary } from "@/components/panel/ClosurePanel";
import { SummaryCard } from "@/components/panel/SummaryCard";
import { AlertDetail, AlertList } from "@/components/panel/AlertList";
import { TideDetail, TideList } from "@/components/panel/TidePanel";
import { GaugeDetailCard, GaugeList } from "@/components/panel/GaugePanel";
import { Card, Skeleton } from "@/components/ui/Badge";

interface Props {
  data: FloodData;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onBack: () => void;
  onFocus: (at: [number, number]) => void;
}

/** Everything in the side panel (desktop) or bottom sheet (phones): banners, overview or a detail view, footer. */
export function PanelBody({ data, selection, onSelect, onBack, onFocus }: Props) {
  const { alerts, tides, gauges, cameras, outages, closures } = data;
  const find = <T,>(type: Selection["type"], list: T[] | undefined, key: (x: T) => string) =>
    selection?.type === type ? list?.find((x) => key(x) === selection.id) : undefined;

  const alert = find("alert", alerts, (a) => a.id);
  const tide = find("tide", tides, (t) => t.id);
  const gauge = find("gauge", gauges, (g) => g.lid);
  const outage = find("outage", outages?.outages, (o) => o.id);
  const camera = find("camera", cameras, (c) => c.id);
  const closure = find("closure", closures, (c) => c.id);

  return (
    <div className="space-y-3 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <InstallHint />
      {data.offline && (
        <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          <span className="font-semibold">You&apos;re offline.</span> Showing the last data this device received; it may
          be out of date.
        </p>
      )}
      {data.errors.length > 0 && (
        <p role="status" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {data.errors.join(" · ")}. Showing the latest data we have.
        </p>
      )}
      {data.loading ? (
        <Card className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      ) : alert ? (
        <AlertDetail alert={alert} onBack={onBack} />
      ) : tide ? (
        <TideDetail station={tide} onBack={onBack} />
      ) : gauge ? (
        <GaugeDetailCard summary={gauge} onBack={onBack} cameras={cameras} onSelect={onSelect} />
      ) : outage ? (
        <OutageDetail outage={outage} onBack={onBack} />
      ) : camera ? (
        <CameraDetail camera={camera} onBack={onBack} />
      ) : closure ? (
        <ClosureDetail closure={closure} onBack={onBack} />
      ) : (
        <>
          <SummaryCard alerts={alerts} gauges={gauges} tides={tides} />
          <OutlookCard outlook={data.outlook ?? null} error={data.outlookError} onFocus={onFocus} />
          <AlertList alerts={alerts} onSelect={onSelect} />
          <TideList tides={tides} onSelect={onSelect} />
          <GaugeList gauges={gauges} onSelect={onSelect} />
          {data.closuresLoaded && <ClosureSummary closures={closures} onSelect={onSelect} />}
          {outages && <OutageSummary report={outages} onSelect={onSelect} />}
        </>
      )}
      <p className="px-1 pb-2 text-[11px] leading-snug text-muted">
        Not an official warning service. Follow evacuation orders from local officials and call 911 in an emergency.{" "}
        <Link href="/about" className="underline">About this app</Link>. Data: NWS, NOAA CO-OPS, NOAA NWPS/USGS, Cal OES,
        Caltrans.
      </p>
    </div>
  );
}
