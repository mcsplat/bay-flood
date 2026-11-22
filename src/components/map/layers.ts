import type { FeatureCollection } from "geojson";
import type { FloodAlert, GaugeSummary, PowerOutage, RoadClosure, TrafficCamera } from "@/types/flood";
import { CLOSURE_FILL, CLOSURE_STORM_FILL } from "./mapIcons";
import { ALERT_COLOR, ALERT_RANK, CATEGORY_COLOR, rank } from "@/lib/categories";

export const BAY_CENTER: [number, number] = [-122.25, 37.75];

export const BASEMAP = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

export type LayerKey = "alerts" | "gauges" | "tides" | "closures" | "outages" | "cameras" | "radar";

export const CAMERA_COLOR = "#334155";
/** Cameras appear at neighborhood zoom; the regional view is about water. */
export const CAMERA_MIN_ZOOM = 10;

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

/** Closure markers at the start of each closed stretch. */
export function closuresGeoJson(closures: RoadClosure[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: closures.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lon, c.lat] },
      properties: { id: c.id, full: c.full ? 1 : 0, storm: c.stormRelated ? 1 : 0 },
    })),
  };
}

/** The closed stretch itself, when Caltrans gives both ends. */
export function closureLinesGeoJson(closures: RoadClosure[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: closures
      .filter((c) => c.endLat != null && c.endLon != null)
      .map((c) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[c.lon, c.lat], [c.endLon!, c.endLat!]] },
        properties: { id: c.id, full: c.full ? 1 : 0, storm: c.stormRelated ? 1 : 0 },
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
  // Square camera icons (never round, so they can't be mistaken for gauges), hidden
  // until neighborhood zoom where a camera is actually worth opening.
  {
    id: "cameras-cluster",
    type: "symbol",
    source: "cameras",
    minzoom: CAMERA_MIN_ZOOM,
    filter: ["has", "point_count"],
    layout: {
      "icon-image": "camera-cluster",
      "icon-allow-overlap": true,
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Open Sans Bold"],
      "text-size": 10,
      "text-anchor": "left",
      "text-offset": [0.9, -1.1],
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff", "text-halo-color": CAMERA_COLOR, "text-halo-width": 3 },
  },
  {
    id: "cameras-point",
    type: "symbol",
    source: "cameras",
    minzoom: CAMERA_MIN_ZOOM,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["case", ["==", ["get", "video"], 1], "camera-video", "camera"],
      "icon-allow-overlap": true,
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
    id: "outages-point",
    type: "symbol",
    source: "outages",
    layout: {
      "icon-image": "outage",
      // Area-proportional sizing, big enough to read the bolt: 1 customer ≈ 17px, 100 ≈ 20px, 2,000+ ≈ 28px
      "icon-size": ["interpolate", ["linear"], ["sqrt", ["get", "customers"]], 1, 0.7, 10, 0.85, 45, 1.15],
      "icon-allow-overlap": true,
      "symbol-sort-key": ["get", "customers"],
    },
  },
  // Road closures: diamonds (road-sign shape). Blue = flooding/storm, orange = roadwork.
  // Full closures are larger with a solid line; lane closures smaller and dashed.
  {
    id: "closures-line",
    type: "line",
    source: "closure-lines",
    minzoom: 9,
    filter: ["==", ["get", "full"], 1],
    layout: { "line-cap": "round" },
    paint: {
      "line-color": ["case", ["==", ["get", "storm"], 1], CLOSURE_STORM_FILL, CLOSURE_FILL],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 6],
      "line-opacity": 0.85,
    },
  },
  {
    id: "closures-line-partial",
    type: "line",
    source: "closure-lines",
    minzoom: 9,
    filter: ["==", ["get", "full"], 0],
    paint: {
      "line-color": ["case", ["==", ["get", "storm"], 1], CLOSURE_STORM_FILL, CLOSURE_FILL],
      "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2, 14, 4],
      "line-dasharray": [1.5, 1.2],
      "line-opacity": 0.8,
    },
  },
  {
    id: "closures-point",
    type: "symbol",
    source: "closures",
    layout: {
      "icon-image": ["case", ["==", ["get", "storm"], 1], "closure-storm", "closure"],
      "icon-size": ["case", ["==", ["get", "full"], 1], 0.95, 0.72],
      "icon-allow-overlap": true,
      "symbol-sort-key": ["+", ["*", ["get", "storm"], 2], ["get", "full"]],
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
      // Zoomed out, normal gauges shrink to faint specks so elevated ones stand out.
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        8, ["interpolate", ["linear"], ["get", "rank"], -1, 2, 0, 2.5, 1, 7, 4, 9],
        11, ["interpolate", ["linear"], ["get", "rank"], -1, 4, 0, 5.5, 1, 8, 4, 10],
      ],
      "circle-opacity": [
        "interpolate", ["linear"], ["zoom"],
        8, ["case", ["<", ["get", "rank"], 0], 0.35, ["<", ["get", "rank"], 1], 0.6, 0.95],
        11, ["case", ["<", ["get", "rank"], 0], 0.6, 0.95],
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, ["case", ["<", ["get", "rank"], 1], 0.5, 1.5], 11, 1.5],
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
  closures: ["closures-line", "closures-line-partial", "closures-point"],
  outages: ["outage-areas-fill", "outage-areas-line", "outages-point"],
  cameras: ["cameras-cluster", "cameras-point"],
  radar: [], // managed by useRadar (frames swap by opacity)
};
