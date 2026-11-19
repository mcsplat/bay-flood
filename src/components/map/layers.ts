import type { FeatureCollection } from "geojson";
import type { FloodAlert, GaugeSummary, PowerOutage, TrafficCamera } from "@/types/flood";
import { ALERT_COLOR, ALERT_RANK, CATEGORY_COLOR, rank } from "@/lib/categories";

export const BAY_CENTER: [number, number] = [-122.25, 37.75];

export const BASEMAP = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

export type LayerKey = "alerts" | "gauges" | "tides" | "outages" | "cameras" | "radar";

export const CAMERA_COLOR = "#334155";

export function camerasGeoJson(cameras: TrafficCamera[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cameras.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lon, c.lat] },
      properties: { id: c.id, video: c.streamUrl ? 1 : 0 },
    })),
  };
}

/** Outages use indigo so they never read as a flood-severity color. */
export const OUTAGE_COLOR = "#6366f1";

export function outagesGeoJson(outages: PowerOutage[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: outages.map((o) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [o.lon, o.lat] },
      properties: { id: o.id, customers: o.customers },
    })),
  };
}

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
  // Cameras sit below outages and gauges: useful context, never the headline.
  {
    id: "cameras-cluster",
    type: "circle",
    source: "cameras",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": CAMERA_COLOR,
      "circle-opacity": 0.85,
      "circle-radius": ["step", ["get", "point_count"], 11, 10, 14, 50, 18],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  },
  {
    id: "cameras-cluster-count",
    type: "symbol",
    source: "cameras",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Open Sans Bold"],
      "text-size": 11,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff" },
  },
  {
    id: "cameras-point",
    type: "circle",
    source: "cameras",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": CAMERA_COLOR,
      "circle-radius": 5,
      "circle-stroke-color": ["case", ["==", ["get", "video"], 1], "#38bdf8", "#ffffff"],
      "circle-stroke-width": 2,
    },
  },
  {
    id: "outage-areas-fill",
    type: "fill",
    source: "outage-areas",
    paint: { "fill-color": OUTAGE_COLOR, "fill-opacity": 0.22 },
  },
  {
    id: "outage-areas-line",
    type: "line",
    source: "outage-areas",
    paint: { "line-color": OUTAGE_COLOR, "line-width": 1, "line-opacity": 0.6 },
  },
  {
    id: "outages-circle",
    type: "circle",
    source: "outages",
    layout: { "circle-sort-key": ["get", "customers"] },
    paint: {
      "circle-color": OUTAGE_COLOR,
      // Area-proportional sizing: 1 customer ≈ 3px, 100 ≈ 8px, 2,000+ ≈ 16px
      "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "customers"]], 1, 3, 10, 8, 45, 16],
      "circle-opacity": 0.8,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
    },
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
  outages: ["outage-areas-fill", "outage-areas-line", "outages-circle"],
  cameras: ["cameras-cluster", "cameras-cluster-count", "cameras-point"],
  radar: [], // managed by useRadar (frames swap by opacity)
};
