import { cacheLife } from "next/cache";
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon } from "geojson";
import type { AlertKind, FloodAlert } from "@/types/flood";
import { getJson, settled } from "./http";

/** SAME/FIPS codes for the nine Bay Area counties plus Santa Cruz. */
const BAY_AREA_FIPS = new Set([
  "006001", // Alameda
  "006013", // Contra Costa
  "006041", // Marin
  "006055", // Napa
  "006075", // San Francisco
  "006081", // San Mateo
  "006085", // Santa Clara
  "006087", // Santa Cruz
  "006095", // Solano
  "006097", // Sonoma
]);

const WATER_EVENTS = /flood|hydrologic|coastal|surf|tsunami|surge|rain/i;

interface NwsAlertProps {
  id: string;
  event: string;
  severity: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  areaDesc: string;
  onset: string | null;
  ends: string | null;
  expires: string | null;
  senderName: string;
  affectedZones: string[];
  geocode: { SAME?: string[] };
}

function kindOf(event: string): AlertKind {
  if (/warning/i.test(event)) return "warning";
  if (/watch/i.test(event)) return "watch";
  if (/advisory/i.test(event)) return "advisory";
  return "statement";
}

async function getZoneGeometry(zoneUrl: string): Promise<Geometry | null> {
  "use cache";
  cacheLife("days");
  const zone = await getJson<Feature>(zoneUrl, { accept: "application/geo+json" });
  return zone.geometry ?? null;
}

/** Zone-based alerts have no polygon of their own; merge their zone shapes. */
async function mergeZones(zoneUrls: string[]): Promise<Geometry | null> {
  const shapes = await settled(zoneUrls.map(getZoneGeometry));
  const polygons: Polygon["coordinates"][] = [];
  for (const g of shapes) {
    if (g?.type === "Polygon") polygons.push(g.coordinates);
    if (g?.type === "MultiPolygon") polygons.push(...g.coordinates);
  }
  if (!polygons.length) return null;
  return { type: "MultiPolygon", coordinates: polygons } satisfies MultiPolygon;
}

export async function getBayAreaAlerts(): Promise<FloodAlert[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 120, expire: 3600 });

  const data = await getJson<FeatureCollection<Geometry | null, NwsAlertProps>>(
    "https://api.weather.gov/alerts/active?area=CA",
    { accept: "application/geo+json" },
  );

  const relevant = data.features.filter(({ properties: p }) => {
    const inBayArea = p.geocode?.SAME?.some((code) => BAY_AREA_FIPS.has(code));
    return inBayArea && WATER_EVENTS.test(p.event);
  });

  return Promise.all(
    relevant.map(async ({ properties: p, geometry }) => ({
      id: p.id,
      event: p.event,
      kind: kindOf(p.event),
      severity: p.severity,
      headline: p.headline ?? p.event,
      description: p.description,
      instruction: p.instruction,
      areaDesc: p.areaDesc,
      onset: p.onset,
      ends: p.ends ?? p.expires,
      sender: p.senderName,
      geometry: geometry ?? (await mergeZones(p.affectedZones)),
    })),
  );
}
