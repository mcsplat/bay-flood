"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import type { Selection, TideStationReport } from "@/types/flood";
import { CATEGORY_COLOR } from "@/lib/categories";
import { signedFeet } from "@/lib/format";

type MapLib = typeof import("maplibre-gl");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Pulse the halo on at-risk gauges. Static halo when the user prefers reduced motion. */
export function useRiskPulse(map: RefObject<MlMap | null>, active: boolean) {
  useEffect(() => {
    const m = map.current;
    if (!active || !m) return;
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
  }, [map, active]);
}

/** Tide stations render as HTML markers so they read as labeled, focusable buttons. */
export function useTideMarkers(
  map: RefObject<MlMap | null>,
  ml: RefObject<MapLib | null>,
  ready: boolean,
  tides: TideStationReport[],
  visible: boolean,
  onSelect: RefObject<(s: Selection) => void>,
) {
  const markers = useRef<Marker[]>([]);
  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    if (!visible) return;
    markers.current = tides.map((s) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${s.name} tide station, ${s.observed?.v.toFixed(1) ?? "no"} feet`);
      el.className =
        "flex items-center gap-1.5 rounded-full border border-white/70 bg-slate-900/85 px-2 py-0.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-900";
      el.innerHTML = `<span style="background:${CATEGORY_COLOR[s.outlook]}" class="h-2 w-2 rounded-full"></span>${esc(s.name)} ${s.observed ? s.observed.v.toFixed(1) : "—"}′<span class="font-normal opacity-75">${esc(signedFeet(s.surge))}</span>`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelect.current({ type: "tide", id: s.id });
      });
      return new lib.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(m);
    });
  }, [map, ml, ready, tides, visible, onSelect]);
}
