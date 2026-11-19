"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap, MapMouseEvent } from "maplibre-gl";
import type { FloodAlert, GaugeSummary, OutageReport, PowerOutage,
  Selection, TideStationReport, TrafficCamera } from "@/types/flood";
import { rank } from "@/lib/categories";
import { gaugePopupHtml } from "./gaugePopup";
import { outagePopupHtml } from "./outagePopup";
import { cameraPopupHtml, clusterPopupHtml } from "./cameraPopup";
import { wireInteractions } from "./interactions";
import { useMapPadding, useRiskPulse, useTideMarkers } from "./mapEffects";
import { addRadarLayers, useRadar } from "./radar";
import { RadarControl } from "./RadarControl";
import { LocateButton, useLocate } from "./LocateButton";
import { BASEMAP, BAY_CENTER, LAYER_IDS, OVERLAY_LAYERS, alertsGeoJson,
  camerasGeoJson, gaugesGeoJson, outagesGeoJson, type LayerKey } from "./layers";

interface Props {
  alerts: FloodAlert[];
  gauges: GaugeSummary[];
  tides: TideStationReport[];
  outages: OutageReport | null;
  cameras: TrafficCamera[];
  layers: Record<LayerKey, boolean>;
  selection: Selection | null;
  focus: [number, number] | null;
  onSelect: (s: Selection) => void;
  /** Pixels covered by the phone bottom sheet */
  bottomInset?: number;
}

const EMPTY = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;

export function FloodMap({ alerts, gauges, tides, outages, cameras, layers, selection, focus, onSelect, bottomInset = 0 }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const selectRef = useRef(onSelect);
  const gaugeIndex = useRef(new Map<string, GaugeSummary>());
  const outageIndex = useRef(new Map<string, PowerOutage>());
  const cameraIndex = useRef(new Map<string, TrafficCamera>());
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
        for (const src of ["alerts", "outage-areas", "outages", "gauges"]) {
          m.addSource(src, { type: "geojson", data: EMPTY });
        }
        // ~800 cameras: cluster until street-level zoom.
        m.addSource("cameras", { type: "geojson", data: EMPTY, cluster: true, clusterMaxZoom: 11, clusterRadius: 45 });
        for (const layer of OVERLAY_LAYERS) m.addLayer(layer as never);
        addRadarLayers(m, "alerts-fill");
        // Keep credits collapsed behind the ⓘ button so they don't cover controls on phones.
        m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");

        const popup = new ml.Popup({ closeButton: false, offset: 14, maxWidth: "280px" });
        const point = (id: string, index: Map<string, { lat: number; lon: number }>, html: (x: never) => string) => {
          const item = index.get(id);
          return item ? { html: html(item as never), lngLat: [item.lon, item.lat] as [number, number] } : null;
        };
        wireInteractions(
          m,
          popup,
          [
            {
              layers: ["gauges-circle", "gauges-risk-ring"],
              describe: (id) => point(id, gaugeIndex.current, gaugePopupHtml),
              select: (id) => ({ type: "gauge", id }),
            },
            {
              layers: ["outages-circle", "outage-areas-fill"],
              describe: (id) => point(id, outageIndex.current, outagePopupHtml),
              select: (id) => ({ type: "outage", id }),
            },
            {
              layers: ["cameras-point"],
              describe: (id) => point(id, cameraIndex.current, cameraPopupHtml),
              select: (id) => ({ type: "camera", id }),
            },
            {
              layers: ["cameras-cluster"],
              idKey: "cluster_id",
              describe: (_id, p, at) => ({ html: clusterPopupHtml(Number(p.point_count)), lngLat: at }),
              select: (id, _p, at) => {
                (m.getSource("cameras") as GeoJSONSource)
                  .getClusterExpansionZoom(Number(id))
                  .then((zoom) => m.easeTo({ center: at, zoom: zoom + 0.5 }));
                return null;
              },
            },
          ],
          (s) => selectRef.current(s),
          (e: MapMouseEvent) => {
            const hits = m.queryRenderedFeatures(e.point, { layers: ["alerts-fill"] });
            const top = hits.sort((a, b) => b.properties.rank - a.properties.rank)[0];
            if (top) selectRef.current({ type: "alert", id: top.properties.id });
          },
        );
        setReady(true);
      });
      map.current = m;
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
    cameraIndex.current = new Map(cameras.map((c) => [c.id, c]));
    if (ready) setData("cameras", camerasGeoJson(cameras));
  }, [ready, cameras]);

  useRiskPulse(map, ready && layers.gauges && gauges.some((g) => rank(g.category) >= 1));
  useTideMarkers(map, mlRef, ready, tides, layers.tides, selectRef);
  const radar = useRadar(map, ready, layers.radar);
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
