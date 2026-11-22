"use client";

import { useEffect, type RefObject } from "react";
import type { Map as MlMap } from "maplibre-gl";


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

/** Tell MapLibre how much of the map the bottom sheet covers, so centering and flyTo use the visible area. */
export function useMapPadding(map: RefObject<MlMap | null>, ready: boolean, bottom: number) {
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.easeTo({ padding: { top: 0, right: 0, left: 0, bottom }, duration: 250 });
  }, [map, ready, bottom]);
}
