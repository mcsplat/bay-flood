import type { AlertKind, FloodCategory, TideThresholds } from "@/types/flood";

const RANK: Record<FloodCategory, number> = {
  unknown: -1,
  none: 0,
  action: 1,
  minor: 2,
  moderate: 3,
  major: 4,
};

export function worst(...cats: (FloodCategory | undefined)[]): FloodCategory {
  return cats.reduce<FloodCategory>(
    (acc, c) => (c && RANK[c] > RANK[acc] ? c : acc),
    "unknown",
  );
}

export function rank(cat: FloodCategory): number {
  return RANK[cat];
}

/** Classify a water level against NWS-style thresholds. */
export function classify(value: number, t: TideThresholds): FloodCategory {
  if (t.major != null && value >= t.major) return "major";
  if (t.moderate != null && value >= t.moderate) return "moderate";
  if (t.minor != null && value >= t.minor) return "minor";
  if (t.action != null && value >= t.action) return "action";
  if (t.action == null && t.minor != null && value >= t.minor - 0.5) return "action";
  if (t.action == null && t.minor == null) return "unknown";
  return "none";
}

export const CATEGORY_LABEL: Record<FloodCategory, string> = {
  none: "Normal",
  action: "Near flood stage",
  minor: "Minor flooding",
  moderate: "Moderate flooding",
  major: "Major flooding",
  unknown: "No flood stage",
};

/** Colors follow the NWS hydrograph convention (yellow → orange → red → purple). */
export const CATEGORY_COLOR: Record<FloodCategory, string> = {
  none: "#14b8a6",
  action: "#eab308",
  minor: "#f97316",
  moderate: "#dc2626",
  major: "#a21caf",
  unknown: "#64748b",
};

export const ALERT_COLOR: Record<AlertKind, string> = {
  warning: "#dc2626",
  watch: "#f97316",
  advisory: "#eab308",
  statement: "#64748b",
};

export const ALERT_RANK: Record<AlertKind, number> = {
  warning: 3,
  watch: 2,
  advisory: 1,
  statement: 0,
};
