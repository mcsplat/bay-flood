import type { FeatureCollection, Geometry } from "geojson";

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
  /** Recent direction and official crest; only for gauges with flood stages. */
  trend: GaugeTrend | null;
}

export type Direction = "rising" | "falling" | "steady";

export interface GaugeTrend {
  direction: Direction;
  /** Change over the last ~2 hours, ft per hour */
  ratePerHour: number;
  /** Highest point of the official NWS forecast, if one is current */
  crest: { stage: number; time: string; category: FloodCategory; stillRising: boolean } | null;
  /** Rough time to reach flood stage at the current rate (no official forecast) */
  floodStageEta: string | null;
  /** Rises and falls with the tide; excluded from runoff trends */
  tidal: boolean;
}

export interface RainPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Hourly rainfall rate, inches/hour, from NWS gridded forecast blocks */
  hourly: TimePoint[];
  next6h: number;
  next24h: number;
  last6h: number;
  peak: { start: string; end: string; rate: number } | null;
}

export type OutlookDirection = "worsening" | "steady" | "improving";

export interface OutlookMoment {
  time: string;
  kind: "rain" | "tide" | "crest" | "flood-stage" | "compound";
  severity: FloodCategory;
  title: string;
  detail: string;
  /** Where to focus the map */
  at?: [number, number];
}

export interface Outlook {
  direction: OutlookDirection;
  reasons: string[];
  rain: RainPoint[];
  /** Average hourly rain rate across points, for the timeline */
  bayRain: TimePoint[];
  moments: OutlookMoment[];
  generatedAt: string;
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

export interface PowerOutage {
  id: string;
  utility: string;
  customers: number;
  cause: string | null;
  county: string;
  /** ISO timestamps */
  started: string | null;
  estimatedRestore: string | null;
  lat: number;
  lon: number;
}

export interface OutageReport {
  outages: PowerOutage[];
  /** Outage footprints from the utility map, keyed by incident id in properties.id */
  areas: FeatureCollection;
  totalCustomers: number;
  byCounty: { county: string; outages: number; customers: number }[];
}

export interface TrafficCamera {
  id: string;
  name: string;
  route: string;
  direction: string;
  county: string;
  nearby: string;
  lat: number;
  lon: number;
  /** Latest still; Caltrans refreshes it every few minutes. */
  imageUrl: string;
  /** HLS playlist, when the camera has live video. */
  streamUrl: string | null;
}

/** A Caltrans highway closure that is in effect now. */
export interface RoadClosure {
  id: string;
  /** Caltrans lane closure, or a CHP incident report via 511 */
  source: "caltrans" | "chp";
  route: string;
  /** "North", "East / West", … */
  direction: string;
  from: string;
  to: string;
  nearby: string;
  county: string;
  /** Full closure (all lanes) vs. lanes, one-way traffic, alternating or moving. */
  full: boolean;
  /** Caltrans wording: "Full", "Lane", "One-Way Traffic", … */
  closureType: string;
  lanesClosed: string;
  totalLanes: string;
  /** Free-text lane info when the source gives no counts, e.g. "Right shoulder affected" */
  lanesNote: string | null;
  /** Caltrans "type of work", e.g. "Flooding", "Bridge Repair" */
  reason: string;
  /** Caused by flooding, washouts, slides or storm damage */
  stormRelated: boolean;
  /** "Mainline", "Off Ramp", "Toll Bridge", … */
  facility: string;
  started: string | null;
  ends: string | null;
  endIndefinite: boolean;
  delayMinutes: number | null;
  lat: number;
  lon: number;
  /** End of the closed stretch, when it differs from the start */
  endLat: number | null;
  endLon: number | null;
}

export type Selection =
  | { type: "alert"; id: string }
  | { type: "gauge"; id: string }
  | { type: "tide"; id: string }
  | { type: "outage"; id: string }
  | { type: "camera"; id: string }
  | { type: "closure"; id: string };
