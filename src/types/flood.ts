import type { Geometry } from "geojson";

/** Unified flood severity scale, aligned with NWS river/coastal flood categories. */
export type FloodCategory =
  | "none"
  | "action"
  | "minor"
  | "moderate"
  | "major"
  | "unknown";

export type AlertKind = "warning" | "watch" | "advisory" | "statement";

export interface FloodAlert {
  id: string;
  event: string;
  kind: AlertKind;
  severity: string;
  headline: string;
  description: string;
  instruction: string | null;
  areaDesc: string;
  onset: string | null;
  ends: string | null;
  sender: string;
  geometry: Geometry | null;
}

export interface TimePoint {
  /** ISO 8601 UTC timestamp */
  t: string;
  /** Value in feet */
  v: number;
}

export interface TideExtreme extends TimePoint {
  type: "H" | "L";
  /** Predicted value plus current surge (persistence estimate). */
  projected: number;
  category: FloodCategory;
}

export interface TideThresholds {
  action: number | null;
  minor: number | null;
  moderate: number | null;
  major: number | null;
}

export interface TideStationReport {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Latest observed water level, ft MLLW */
  observed: TimePoint | null;
  /** Observed minus predicted at the latest observation, ft */
  surge: number | null;
  thresholds: TideThresholds;
  predictions: TimePoint[];
  observations: TimePoint[];
  extremes: TideExtreme[];
  /** Worst projected category over the next 72h */
  outlook: FloodCategory;
}

export interface GaugeSummary {
  lid: string;
  name: string;
  lat: number;
  lon: number;
  unit: string;
  observed: { stage: number; time: string; category: FloodCategory } | null;
  forecast: { stage: number; time: string; category: FloodCategory } | null;
  /** Worst of observed and forecast categories */
  category: FloodCategory;
  /** Official NWS stage thresholds; null when the gauge has no flood stage. */
  thresholds: TideThresholds | null;
}

export interface GaugeDetail {
  lid: string;
  name: string;
  unit: string;
  thresholds: TideThresholds;
  observed: TimePoint[];
  forecast: TimePoint[];
  forecastIssued: string | null;
}

export type Selection =
  | { type: "alert"; id: string }
  | { type: "gauge"; id: string }
  | { type: "tide"; id: string };
