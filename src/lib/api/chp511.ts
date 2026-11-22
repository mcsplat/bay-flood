import type { RoadClosure } from "@/types/flood";

/**
 * 511 SF Bay traffic events (Open511). In practice this carries Caltrans work and CHP
 * incidents on highways. We keep only reports of water on or over the road (flooding,
 * mud, slides, washouts), which CHP often logs before Caltrans posts a formal closure.
 * Pure parsing, no I/O, so it can be tested on sample events.
 */

export interface Open511Event {
  id: string;
  status: string;
  headline: string;
  event_type: string;
  event_subtypes?: string[] | null;
  created?: string;
  updated?: string;
  areas?: { name: string }[];
  geography?: { type: string; coordinates: unknown };
  "+source_type"?: string;
  roads?: {
    name?: string;
    from?: string;
    to?: string;
    direction?: string;
    state?: string;
    "+lane_type"?: string | null;
    "+lane_status"?: string | null;
  }[];
  schedule?: { intervals?: string[] };
}

const FLOODING = /flood|standing water|water (on|over|across) (the )?road|under ?water|mud|slide|wash ?out|sink ?hole/i;

/** "CA-128 E" → "SR-128"; "US-101 S" → "US-101". Local street names pass through. */
export function routeName(raw: string): string {
  return raw.replace(/\s+[NSEW]$/, "").replace(/^CA-/, "SR-").trim();
}

/** "Eastbound and Westbound" → "East / West"; "Southbound" → "South". */
function direction(raw: string | undefined): string {
  if (!raw) return "";
  const parts = raw.replace(/bound/gi, "").split(/\s+and\s+|\s*\/\s*/i).map((s) => s.trim()).filter(Boolean);
  if (/both/i.test(raw)) return "Both / ways";
  return parts.join(" / ");
}

/** First point (and last, for a line) of the event geometry. */
function ends(g: Open511Event["geography"]): { start: [number, number]; end: [number, number] | null } | null {
  if (!g) return null;
  const c = g.coordinates as number[] | number[][];
  if (g.type === "Point" && Array.isArray(c) && typeof c[0] === "number") return { start: c as [number, number], end: null };
  if (g.type === "LineString" && Array.isArray(c[0])) {
    const line = c as [number, number][];
    return { start: line[0], end: line.length > 1 ? line[line.length - 1] : null };
  }
  return null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Name the hazard from the headline when no subtype says it ("Mud slide", not "Flooding"). */
function hazard(text: string): string {
  if (/mud|slide/i.test(text)) return "Mud or rock slide";
  if (/wash ?out/i.test(text)) return "Washout";
  if (/sink ?hole/i.test(text)) return "Sinkhole";
  if (/standing water|water (on|over|across)/i.test(text)) return "Standing water";
  return "Flooding";
}

export function floodReport(e: Open511Event): RoadClosure | null {
  const subtype = e.event_subtypes?.find((s) => FLOODING.test(s));
  if (e.status !== "ACTIVE" || !(subtype || FLOODING.test(e.headline))) return null;
  const at = ends(e.geography);
  if (!at) return null;
  const road = e.roads?.[0] ?? {};
  const state = road.state ?? "";
  const full = /ALL_LANES_CLOSED|^CLOSED$/.test(state);
  const lanes = [road["+lane_type"], road["+lane_status"]].filter(Boolean).join(" ");
  const interval = e.schedule?.intervals?.[0]?.split("/");

  return {
    id: `511:${e.id}`,
    source: "chp",
    route: road.name ? routeName(road.name) : "Road",
    direction: direction(road.direction),
    from: road.from ?? "",
    to: road.to ?? "",
    nearby: "",
    county: e.areas?.[0]?.name ?? "",
    full,
    closureType: full ? "Full" : "Lane",
    lanesClosed: "",
    totalLanes: "",
    lanesNote: full ? "All lanes closed" : lanes ? cap(lanes) : state === "ALL_LANES_OPEN" ? "Lanes open" : null,
    reason: subtype ?? hazard(e.headline),
    stormRelated: true,
    facility: "",
    started: e.created ? new Date(e.created).toISOString() : null,
    ends: interval?.[1] ? new Date(interval[1]).toISOString() : null,
    endIndefinite: false,
    delayMinutes: null,
    lat: at.start[1],
    lon: at.start[0],
    endLat: at.end?.[1] ?? null,
    endLon: at.end?.[0] ?? null,
  };
}

export function floodReportsFrom511(body: { events?: Open511Event[] }): RoadClosure[] {
  return (body.events ?? []).map(floodReport).filter((c): c is RoadClosure => c != null);
}
