"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap, Marker, MapMouseEvent } from "maplibre-gl";
import type { FloodAlert, GaugeSummary, OutageReport, PowerOutage, Selection, TideStationReport } from "@/types/flood";
import { CATEGORY_COLOR, rank } from "@/lib/categories";
import { gaugePopupHtml } from "./gaugePopup";
import { outagePopupHtml } from "./outagePopup";
import { wireInteractions } from "./interactions";
import { signedFeet } from "@/lib/format";
import {
  BASEMAP,
  BAY_CENTER,
  LAYER_IDS,
  OVERLAY_LAYERS,
  alertsGeoJson,
  gaugesGeoJson,
  outagesGeoJson,
  type LayerKey,
} from "./layers";

interface Props {
  alerts: FloodAlert[];
  gauges: GaugeSummary[];
  tides: TideStationReport[];
  outages: OutageReport | null;
  layers: Record<LayerKey, boolean>;
  selection: Selection | null;
  focus: [number, number] | null;
  onSelect: (s: Selection) => void;
}

export function FloodMap({ alerts, gauges, tides, outages, layers, selection, focus, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const selectRef = useRef(onSelect);
  const gaugeIndex = useRef(new Map<string, GaugeSummary>());
  const outageIndex = useRef(new Map<string, PowerOutage>());
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
      m.addControl(new ml.GeolocateControl({ trackUserLocation: false }), "top-right");

      m.on("load", () => {
        for (const src of ["alerts", "outage-areas", "outages", "gauges"]) {
          m.addSource(src, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        }
        for (const layer of OVERLAY_LAYERS) m.addLayer(layer as never);

        const popup = new ml.Popup({ closeButton: false, offset: 14, maxWidth: "280px" });
        wireInteractions(
          m,
          popup,
          [
            {
              layers: ["gauges-circle", "gauges-risk-ring"],
              describe: (id) => {
                const g = gaugeIndex.current.get(id);
                return g ? { html: gaugePopupHtml(g), lngLat: [g.lon, g.lat] } : null;
              },
              select: (id) => ({ type: "gauge", id }),
            },
            {
              layers: ["outages-circle", "outage-areas-fill"],
              describe: (id) => {
                const o = outageIndex.current.get(id);
                return o ? { html: outagePopupHtml(o), lngLat: [o.lon, o.lat] } : null;
              },
              select: (id) => ({ type: "outage", id }),
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

  useEffect(() => {
    if (ready) (map.current?.getSource("alerts") as GeoJSONSource)?.setData(alertsGeoJson(alerts));
  }, [ready, alerts]);

  useEffect(() => {
    outageIndex.current = new Map((outages?.outages ?? []).map((o) => [o.id, o]));
    if (!ready || !outages) return;
    (map.current?.getSource("outages") as GeoJSONSource)?.setData(outagesGeoJson(outages.outages));
    (map.current?.getSource("outage-areas") as GeoJSONSource)?.setData(outages.areas);
  }, [ready, outages]);

  useEffect(() => {
    gaugeIndex.current = new Map(gauges.map((g) => [g.lid, g]));
    if (ready) (map.current?.getSource("gauges") as GeoJSONSource)?.setData(gaugesGeoJson(gauges));
  }, [ready, gauges]);

  // Pulse the halo on at-risk gauges. Static halo when the user prefers reduced motion.
  const hasRisk = gauges.some((g) => rank(g.category) >= 1);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !hasRisk || !layers.gauges) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 33) return; // ~30fps is plenty for a soft pulse
      last = now;
      const phase = (now % 1800) / 1800;
      m.setPaintProperty("gauges-risk-pulse", "circle-radius", 10 + phase * 16);
      m.setPaintProperty("gauges-risk-pulse", "circle-opacity", 0.45 * (1 - phase));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, hasRisk, layers.gauges]);

  // Tide stations render as HTML markers so they read as labeled, focusable buttons.
  useEffect(() => {
    const m = map.current;
    const ml = mlRef.current;
    if (!ready || !m || !ml) return;
    markers.current.forEach((mk) => mk.remove());
    if (!layers.tides) return;
    markers.current = tides.map((s) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${s.name} tide station, ${s.observed?.v.toFixed(1) ?? "no"} feet`);
      el.className =
        "flex items-center gap-1.5 rounded-full border border-white/70 bg-slate-900/85 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-900";
      el.innerHTML = `<span style="background:${CATEGORY_COLOR[s.outlook]}" class="h-2 w-2 rounded-full"></span>${escapeHtml(s.name)} ${s.observed ? s.observed.v.toFixed(1) : "—"}′<span class="font-normal opacity-75">${escapeHtml(signedFeet(s.surge))}</span>`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectRef.current({ type: "tide", id: s.id });
      });
      return new ml.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(m);
    });
  }, [ready, tides, layers.tides]);

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

  return <div ref={container} className="h-full w-full" role="region" aria-label="Bay Area flood map" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
