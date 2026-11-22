import { cacheLife } from "next/cache";
import type { RoadClosure } from "@/types/flood";
import { getJson, settled } from "./http";

/**
 * Caltrans Lane Closure System (CWWP2). District 4 is the Bay Area; District 5 adds
 * Santa Cruz County. Covers state highways, ramps and toll bridges, not city streets.
 * Most records are scheduled work; we keep only closures crews have marked in place.
 */
const FEEDS = [
  "https://cwwp2.dot.ca.gov/data/d4/lcs/lcsStatusD04.json",
  "https://cwwp2.dot.ca.gov/data/d5/lcs/lcsStatusD05.json",
];

const BAY_COUNTIES = new Set([
  "Alameda", "Contra Costa", "Marin", "Napa", "San Francisco",
  "San Mateo", "Santa Clara", "Santa Cruz", "Solano", "Sonoma",
]);

/** Work types that mean water or storm damage closed the road. */
const STORM_WORK = /flood|wash ?out|slide|storm|mud|erosion|sink ?hole/i;

type Flag<K extends string> = Record<`is${K}`, string>;

interface LcsRecord {
  lcs: {
    index: string;
    location: {
      travelFlowDirection: string;
      begin: Record<"beginLocationName" | "beginNearbyPlace" | "beginLongitude" | "beginLatitude" | "beginCounty" | "beginRoute", string>;
      end: Record<"endLocationName" | "endLongitude" | "endLatitude", string>;
    };
    closure: {
      closureID: string;
      closureTimestamp: Record<"closureStartEpoch" | "closureEndEpoch" | "isClosureEndIndefinite", string>;
      facility: string;
      typeOfClosure: string;
      typeOfWork: string;
      estimatedDelay: string;
      lanesClosed: string;
      totalExistingLanes: string;
      // 10-97: crew on scene, closure in place. 10-98: closure picked up. 10-22: cancelled.
      code1097: Flag<"Code1097">;
      code1098: Flag<"Code1098">;
      code1022: Flag<"Code1022">;
    };
  };
}

const iso = (epoch: string) => (Number(epoch) > 0 ? new Date(Number(epoch) * 1000).toISOString() : null);
const coord = (v: string) => (Number.isFinite(Number(v)) && Number(v) !== 0 ? Number(v) : null);

function toClosure({ lcs }: LcsRecord): RoadClosure | null {
  const { begin, end } = lcs.location;
  const c = lcs.closure;
  const inPlace = c.code1097.isCode1097 === "true" && c.code1098.isCode1098 !== "true" && c.code1022.isCode1022 !== "true";
  const lat = coord(begin.beginLatitude);
  const lon = coord(begin.beginLongitude);
  if (!inPlace || lat == null || lon == null || !BAY_COUNTIES.has(begin.beginCounty)) return null;

  let endLat = coord(end.endLatitude);
  let endLon = coord(end.endLongitude);
  // Ignore missing or implausible end points (more than ~25 km away).
  if (endLat == null || endLon == null || Math.hypot(endLat - lat, endLon - lon) > 0.25 || (endLat === lat && endLon === lon)) {
    endLat = null;
    endLon = null;
  }
  const delay = Number(c.estimatedDelay);

  return {
    id: lcs.index,
    route: begin.beginRoute,
    direction: lcs.location.travelFlowDirection,
    from: begin.beginLocationName.trim(),
    to: end.endLocationName.trim(),
    nearby: begin.beginNearbyPlace,
    county: begin.beginCounty,
    full: c.typeOfClosure === "Full",
    closureType: c.typeOfClosure,
    lanesClosed: c.lanesClosed,
    totalLanes: c.totalExistingLanes,
    reason: c.typeOfWork,
    stormRelated: STORM_WORK.test(c.typeOfWork),
    facility: c.facility,
    started: iso(c.closureTimestamp.closureStartEpoch),
    ends: iso(c.closureTimestamp.closureEndEpoch),
    endIndefinite: c.closureTimestamp.isClosureEndIndefinite === "true",
    delayMinutes: Number.isFinite(delay) && delay > 0 ? delay : null,
    lat,
    lon,
    endLat,
    endLon,
  };
}

export async function getRoadClosures(): Promise<RoadClosure[]> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });

  const feeds = await settled(FEEDS.map((url) => getJson<{ data: LcsRecord[] }>(url, { timeoutMs: 30_000 })));
  if (!feeds.length) throw new Error("Caltrans lane closure feeds unavailable");

  return feeds
    .flatMap(({ data }) => data.map(toClosure))
    .filter((c): c is RoadClosure => c != null)
    // Storm-related first, then full closures.
    .sort((a, b) => Number(b.stormRelated) - Number(a.stormRelated) || Number(b.full) - Number(a.full));
}
