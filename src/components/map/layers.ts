import type { FeatureCollection } from "geojson";
import type { FloodAlert, GaugeSummary } from "@/types/flood";
import { ALERT_COLOR, ALERT_RANK, CATEGORY_COLOR, rank } from "@/lib/categories";

export const BAY_CENTER: [number, number] = [-122.25, 37.75];

export const BASEMAP = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

export type LayerKey = "alerts" | "gauges" | "tides";

export function alertsGeoJson(alerts: FloodAlert[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [...alerts]
      .filter((a) => a.geometry)
      .sort((a, b) => ALERT_RANK[a.kind] - ALERT_RANK[b.kind])
      .map((a) => ({
        type: "Feature",
        id: a.id,
        geometry: a.geometry!,
        properties: {
          id: a.id,
          event: a.event,
          rank: ALERT_RANK[a.kind],
          color: ALERT_COLOR[a.kind],
        },
      })),
  };
}

export function gaugesGeoJson(gauges: GaugeSummary[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: gauges.map((g) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [g.lon, g.lat] },
      properties: {
        id: g.lid,
        name: g.name,
        stage: g.observed ? `${g.observed.stage.toFixed(1)} ${g.unit}` : "",
        rank: rank(g.category),
        color: CATEGORY_COLOR[g.category],
      },
    })),
  };
}

/** MapLibre style layers, added after the basemap loads. */
export const OVERLAY_LAYERS = [
  {
    id: "alerts-fill",
    type: "fill",
    source: "alerts",
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.16 },
  },
  {
    id: "alerts-line",
    type: "line",
    source: "alerts",
    paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-opacity": 0.85 },
  },
  // At-risk gauges (action stage or worse) get a pulsing halo plus a steady ring,
  // so they read as "pay attention" even when zoomed out among hundreds of dots.
  {
    id: "gauges-risk-pulse",
    type: "circle",
    source: "gauges",
    filter: [">=", ["get", "rank"], 1],
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": 12,
      "circle-opacity": 0.35,
      "circle-stroke-width": 0,
    },
  },
  {
    id: "gauges-risk-ring",
    type: "circle",
    source: "gauges",
    filter: [">=", ["get", "rank"], 1],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "rank"], 1, 11, 4, 14],
      "circle-color": "transparent",
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.9,
    },
  },
  {
    id: "gauges-circle",
    type: "circle",
    source: "gauges",
    layout: { "circle-sort-key": ["get", "rank"] },
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["interpolate", ["linear"], ["get", "rank"], -1, 3.5, 0, 4.5, 1, 7, 4, 9],
      "circle-opacity": ["case", ["<", ["get", "rank"], 0], 0.55, 0.95],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": ["case", ["<", ["get", "rank"], 1], 0.75, 1.5],
    },
  },
  {
    id: "gauges-selected",
    type: "circle",
    source: "gauges",
    filter: ["==", ["get", "id"], ""],
    paint: {
      "circle-radius": 13,
      "circle-color": "transparent",
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-width": 3,
    },
  },
] as const;

export const LAYER_IDS: Record<LayerKey, string[]> = {
  alerts: ["alerts-fill", "alerts-line"],
  gauges: ["gauges-risk-pulse", "gauges-risk-ring", "gauges-circle", "gauges-selected"],
  tides: [],
};
