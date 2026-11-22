"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import type { Selection, TideStationReport } from "@/types/flood";
import { CATEGORY_COLOR, rank } from "@/lib/categories";
import { signedFeet } from "@/lib/format";

type MapLib = typeof import("maplibre-gl");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Below this zoom, phones show compact tide pills (wave + level) instead of full labels. */
const COMPACT_BELOW_ZOOM = 10.5;
const GAP = 4; // px kept clear between labels

const WAVE = `<svg class="tide-wave" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 5c1.2-2 2.5-2 3.7 0s2.5 2 3.6 0S10.8 3 11 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

interface TideMarker {
  marker: Marker;
  el: HTMLButtonElement;
  priority: number;
}

/**
 * Tide stations render as HTML markers so they read as labeled, focusable buttons.
 * Overlapping labels are hidden (the most at-risk station wins), and on phones they
 * shrink to a compact pill until zoomed in. Tapping a compact pill expands it first.
 */
export function useTideMarkers(
  map: RefObject<MlMap | null>,
  ml: RefObject<MapLib | null>,
  ready: boolean,
  tides: TideStationReport[],
  visible: boolean,
  compactAllowed: boolean,
  onSelect: RefObject<(s: Selection) => void>,
) {
  const markers = useRef<TideMarker[]>([]);
  const expanded = useRef<string | null>(null);

  useEffect(() => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib) return;
    markers.current.forEach((t) => t.marker.remove());
    markers.current = [];
    if (!visible) return;

    const compactNow = () => compactAllowed && m.getZoom() < COMPACT_BELOW_ZOOM;

    // Hide labels that collide with a higher-priority one. Runs after MapLibre repositions markers.
    const declutter = () => {
      const compact = compactNow();
      const placed: DOMRect[] = [];
      const order = [...markers.current].sort(
        (a, b) => Number(b.el.dataset.id === expanded.current) - Number(a.el.dataset.id === expanded.current) || b.priority - a.priority,
      );
      for (const t of order) {
        t.el.classList.toggle("is-compact", compact && t.el.dataset.id !== expanded.current);
        t.el.style.visibility = "";
        const r = t.el.getBoundingClientRect();
        const hit = placed.some(
          (p) => r.left < p.right + GAP && r.right > p.left - GAP && r.top < p.bottom + GAP && r.bottom > p.top - GAP,
        );
        if (hit) t.el.style.visibility = "hidden";
        else placed.push(r);
      }
    };

    markers.current = tides.map((s) => {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.id = s.id;
      el.setAttribute("aria-label", `${s.name} tide station, ${s.observed?.v.toFixed(1) ?? "no"} feet`);
      el.className = "tide-pill";
      el.innerHTML =
        `<span class="tide-dot" style="background:${CATEGORY_COLOR[s.outlook]}"></span>${WAVE}` +
        `<span class="tide-name">${esc(s.name)}&nbsp;</span>` +
        `<span>${s.observed ? s.observed.v.toFixed(1) : "—"}′</span>` +
        `<span class="tide-surge">${esc(signedFeet(s.surge))}</span>`;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        // Phones: the first tap on a compact pill shows its full label; the next opens details.
        if (el.classList.contains("is-compact")) {
          expanded.current = s.id;
          declutter();
          return;
        }
        expanded.current = null;
        onSelect.current({ type: "tide", id: s.id });
      });
      return { marker: new lib.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(m), el, priority: rank(s.outlook) };
    });

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(declutter);
    };
    // Tapping the map elsewhere collapses an expanded pill.
    const collapse = () => {
      if (!expanded.current) return;
      expanded.current = null;
      schedule();
    };
    m.on("move", schedule);
    m.on("click", collapse);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      m.off("move", schedule);
      m.off("click", collapse);
    };
  }, [map, ml, ready, tides, visible, compactAllowed, onSelect]);

  // Remove markers when the map goes away.
  useEffect(() => () => markers.current.forEach((t) => t.marker.remove()), []);
}
