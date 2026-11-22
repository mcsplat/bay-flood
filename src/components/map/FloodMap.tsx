"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { FloodAlert, GaugeSummary, OutageReport, PowerOutage, RoadClosure,
  Selection, TideStationReport, TrafficCamera } from "@/types/flood";
import { rank } from "@/lib/categories";
import { wireInteractions } from "./interactions";
import { mapTargets } from "./mapTargets";
import { addMapIcons } from "./mapIcons";
import { useMapPadding, useRiskPulse } from "./mapEffects";
import { useTideMarkers } from "./tideMarkers";
import { useIsMobile } from "@/hooks/useIsMobile";
import { addRadarLayers, useRadar } from "./radar";
import { RadarControl } from "./RadarControl";
import { LocateButton, useLocate } from "./LocateButton";
import { BASEMAP, BAY_CENTER, LAYER_IDS, OVERLAY_LAYERS, alertsGeoJson, camerasGeoJson,
  closureLinesGeoJson, closuresGeoJson, gaugesGeoJson, outagesGeoJson, type LayerKey } from "./layers";

interface Props {
  alerts: FloodAlert[];
  gauges: GaugeSummary[];
  tides: TideStationReport[];
  outages: OutageReport | null;
  cameras: TrafficCamera[];
  closures: RoadClosure[];
  layers: Record<LayerKey, boolean>;
  selection: Selection | null;
  focus: [number, number] | null;
  onSelect: (s: Selection) => void;
  /** Pixels covered by the phone bottom sheet */
  bottomInset?: number;
}

const EMPTY = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;

export function FloodMap({ alerts, gauges, tides, outages, cameras, closures, layers, selection, focus, onSelect, bottomInset = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const selectRef = useRef(onSelect);
  const gaugeIndex = useRef(new Map<string, GaugeSummary>());
  const outageIndex = useRef(new Map<string, PowerOutage>());
  const cameraIndex = useRef(new Map<string, TrafficCamera>());
  const alertIndex = useRef(new Map<string, FloodAlert>());
  const closureIndex = useRef(new Map<string, RoadClosure>());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once. maplibre-gl touches `window`, so load it client-side only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !container.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      mlRef.current = ml;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const m = new ml.Map({
        container: container.current,
        style: dark ? BASEMAP.dark : BASEMAP.light,
        center: BAY_CENTER,
        zoom: container.current.clientWidth < 600 ? 7.8 : 8.6,
        attributionControl: { compact: true },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");

      m.on("load", () => {
        for (const src of ["alerts", "outage-areas", "outages", "closures", "closure-lines", "gauges"]) {
          m.addSource(src, { type: "geojson", data: EMPTY });
        }
        // ~800 cameras: cluster until street-level zoom.
        m.addSource("cameras", { type: "geojson", data: EMPTY, cluster: true, clusterMaxZoom: 11, clusterRadius: 45 });
        addMapIcons(m);
        for (const layer of OVERLAY_LAYERS) m.addLayer(layer as never);
        addRadarLayers(m, "alerts-fill");
        // Keep credits collapsed behind the ⓘ button so they don't cover controls on phones.
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");

        const popup = new ml.Popup({ closeButton: false, offset: 14, maxWidth: "280px" });
        // Always above the marker; interactions.ts slides the card back on screen near the edges.
        const tapPopup = new ml.Popup({ closeButton: false, closeOnClick: false, anchor: "bottom", offset: 14, maxWidth: "min(300px, calc(100vw - 24px))", className: "tap-popup" });
        const indexes = { gauges: gaugeIndex, outages: outageIndex, cameras: cameraIndex, alerts: alertIndex, closures: closureIndex };
        wireInteractions(m, popup, tapPopup, mapTargets(m, indexes), (s) => selectRef.current(s));
        setReady(true);
      });
      map.current = m;
      // Dev only: lets the scripted browser tests find markers on screen.
      if (process.env.NODE_ENV === "development") (window as unknown as { __bfwMap?: MlMap }).__bfwMap = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const setData = (source: string, data: GeoJSON.FeatureCollection) =>
    (map.current?.getSource(source) as GeoJSONSource | undefined)?.setData(data);

  useEffect(() => {
    alertIndex.current = new Map(alerts.map((a) => [a.id, a]));
    if (ready) setData("alerts", alertsGeoJson(alerts));
  }, [ready, alerts]);

  useEffect(() => {
    outageIndex.current = new Map((outages?.outages ?? []).map((o) => [o.id, o]));
    if (!ready || !outages) return;
    setData("outages", outagesGeoJson(outages.outages));
    setData("outage-areas", outages.areas);
  }, [ready, outages]);

  useEffect(() => {
    gaugeIndex.current = new Map(gauges.map((g) => [g.lid, g]));
    if (ready) setData("gauges", gaugesGeoJson(gauges));
  }, [ready, gauges]);

  useEffect(() => {
    closureIndex.current = new Map(closures.map((c) => [c.id, c]));
    if (!ready) return;
    setData("closures", closuresGeoJson(closures));
    setData("closure-lines", closureLinesGeoJson(closures));
  }, [ready, closures]);

  useEffect(() => {
    cameraIndex.current = new Map(cameras.map((c) => [c.id, c]));
    if (ready) setData("cameras", camerasGeoJson(cameras));
  }, [ready, cameras]);

  useRiskPulse(map, ready && layers.gauges && gauges.some((g) => rank(g.category) >= 1));
  const phone = useIsMobile();
  useTideMarkers(map, mlRef, ready, tides, layers.tides, phone, selectRef);
  // Phones: lighter radar and alert shading so markers stay readable on a small screen.
  const radar = useRadar(map, ready, layers.radar, phone ? 0.45 : 0.65);
  useEffect(() => {
    if (ready) map.current?.setPaintProperty("alerts-fill", "fill-opacity", phone ? 0.08 : 0.16);
  }, [ready, phone]);
  const located = useLocate(map, mlRef, ready);
  useMapPadding(map, ready, bottomInset);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    for (const [key, ids] of Object.entries(LAYER_IDS)) {
      for (const id of ids) m.setLayoutProperty(id, "visibility", layers[key as LayerKey] ? "visible" : "none");
    }
  }, [ready, layers]);

  useEffect(() => {
    if (!ready) return;
    const id = selection?.type === "gauge" ? selection.id : "";
    map.current?.setFilter("gauges-selected", ["==", ["get", "id"], id]);
  }, [ready, selection]);

  useEffect(() => {
    if (ready && focus) map.current?.flyTo({ center: focus, zoom: Math.max(map.current.getZoom(), 10.5), speed: 1.4 });
  }, [ready, focus]);

  return (
    <>
      <div ref={container} className="h-full w-full" role="region" aria-label="Bay Area flood map" />
      {layers.radar && <RadarControl radar={radar} />}
      <LocateButton state={located} />
    </>
  );
}
