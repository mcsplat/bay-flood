"use client";

import { useCallback, useState, type CSSProperties } from "react";
import type { Selection } from "@/types/flood";
import { useFloodData } from "@/hooks/useFloodData";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatRelative } from "@/lib/format";
import { AppHeader } from "@/components/brand/AppHeader";
import { FloodMap } from "@/components/map/FloodMap";
import type { LayerKey } from "@/components/map/layers";
import { LayerToggles } from "@/components/map/LayerToggles";
import { PanelBody } from "@/components/panel/PanelBody";
import { BottomSheet, type Snap } from "@/components/sheet/BottomSheet";
import { SheetHeader } from "@/components/sheet/SheetHeader";

/**
 * Desktop: side panel + map. Phones: full-screen map with a draggable bottom sheet.
 * The map is always the first child so switching layouts never re-creates it.
 */
export function FloodDashboard() {
  const data = useFloodData();
  const isMobile = useIsMobile();
  const { gauges, tides, outages, cameras } = data;

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    alerts: true,
    gauges: true,
    tides: true,
    outages: true,
    cameras: true,
    radar: true,
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [snap, setSnap] = useState<Snap>("peek");
  const [sheetH, setSheetH] = useState(0);

  const select = useCallback(
    (s: Selection) => {
      setSelection(s);
      // On phones, open the sheet far enough to show the details.
      setSnap((current) => (current === "peek" ? "half" : current));
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

  const status = data.offline
    ? "Showing saved data"
    : data.updatedAt
      ? `Updated ${formatRelative(new Date(data.updatedAt).toISOString())}`
      : "Loading live data…";
  const bottomInset = isMobile ? sheetH : 0;

  const body = (
    <PanelBody data={data} selection={selection} onSelect={select} onBack={() => setSelection(null)} onFocus={setFocus} />
  );

  return (
    <div
      className="group relative h-dvh overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:flex md:flex-row"
      data-sheet={isMobile ? snap : undefined}
      style={{ "--sheet-h": `${bottomInset}px` } as CSSProperties}
    >
      <main className="absolute inset-0 md:relative md:order-2 md:flex-1">
        <FloodMap
          alerts={data.alerts}
          gauges={gauges}
          tides={tides}
          outages={outages}
          cameras={cameras}
          layers={layers}
          selection={selection}
          focus={focus}
          onSelect={select}
          bottomInset={bottomInset}
        />
        <LayerToggles layers={layers} onChange={setLayers} />
      </main>

      {isMobile ? (
        <BottomSheet
          snap={snap}
          onSnapChange={setSnap}
          onHeightChange={setSheetH}
          header={<SheetHeader alerts={data.alerts} outlook={data.outlook} status={status} offline={data.offline} />}
        >
          {body}
        </BottomSheet>
      ) : (
        <aside
          className="flex min-h-0 flex-col border-r border-border bg-background md:order-1 md:w-[400px] md:flex-none md:pt-[env(safe-area-inset-top)]"
          aria-label="Flood conditions"
        >
          <AppHeader offline={data.offline} status={status} />
          <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
        </aside>
      )}
    </div>
  );
}
