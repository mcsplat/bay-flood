import { cacheLife } from "next/cache";
import type { Point } from "geojson";
import type { OutageReport, PowerOutage } from "@/types/flood";
import { BAY_COUNTIES, queryGeoJson } from "./arcgis";

/**
 * Cal OES statewide outage layer. It mirrors the utilities' public outage maps
 * (PG&E, SCE, SDG&E, SMUD…) and refreshes about every 15 minutes.
 */
const SERVICE =
  "https://services.arcgis.com/BLN4oKB0N1YSgvY8/arcgis/rest/services/Power_Outages_(View)/FeatureServer";

const WHERE = `County IN (${BAY_COUNTIES.map((c) => `'${c}'`).join(",")}) AND OutageStatus = 'Active'`;

interface OutageProps {
  IncidentId: string | null;
  OBJECTID: number;
  UtilityCompany: string;
  ImpactedCustomers: number | null;
  Cause: string | null;
  County: string;
  StartDate: number | null;
  EstimatedRestoreDate: number | null;
}

const UTILITY_NAME: Record<string, string> = { PGE: "PG&E", SCE: "SCE", SDGE: "SDG&E", SMUD: "SMUD" };
const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : null);
/** PG&E crew shorthand → plain words. Only unambiguous abbreviations are expanded. */
const CAUSE_WORDS: Record<string, string> = {
  brkn: "broken",
  replce: "replace",
  txfmr: "transformer",
  damge: "damaged",
  ug: "underground",
  srvc: "service",
  emerg: "emergency",
  dwn: "down",
  equipmnt: "equipment",
};

function readableCause(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const words = raw.trim().split(/\s+/).map((w) => CAUSE_WORDS[w.toLowerCase()] ?? w.toLowerCase());
  const text = words.join(" ");
  return text[0].toUpperCase() + text.slice(1);
}

const titleCase =(s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export async function getBayAreaOutages(): Promise<OutageReport> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  const outFields = "OBJECTID,IncidentId,UtilityCompany,ImpactedCustomers,Cause,County,StartDate,EstimatedRestoreDate";
  const [points, areas] = await Promise.all([
    queryGeoJson<OutageProps>(`${SERVICE}/0`, { where: WHERE, outFields }),
    // Footprints are detailed street-level polygons; generalize to ~10 m to keep payloads small.
    queryGeoJson<OutageProps>(`${SERVICE}/1`, {
      where: WHERE,
      outFields: "IncidentId,ImpactedCustomers",
      geometryPrecision: "5",
      maxAllowableOffset: "0.0001",
    }).catch(() => ({ type: "FeatureCollection" as const, features: [] })),
  ]);

  const outages: PowerOutage[] = points.features.flatMap((f) => {
    if (f.geometry?.type !== "Point") return [];
    const p = f.properties;
    const [lon, lat] = (f.geometry as Point).coordinates;
    return [
      {
        id: p.IncidentId ?? String(p.OBJECTID),
        utility: UTILITY_NAME[p.UtilityCompany] ?? p.UtilityCompany,
        customers: p.ImpactedCustomers ?? 0,
        cause: readableCause(p.Cause),
        county: titleCase(p.County),
        started: iso(p.StartDate),
        estimatedRestore: iso(p.EstimatedRestoreDate),
        lat,
        lon,
      },
    ];
  });

  const counties = new Map<string, { outages: number; customers: number }>();
  for (const o of outages) {
    const c = counties.get(o.county) ?? { outages: 0, customers: 0 };
    c.outages += 1;
    c.customers += o.customers;
    counties.set(o.county, c);
  }

  return {
    outages,
    areas: {
      type: "FeatureCollection",
      features: areas.features.map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: { id: f.properties?.IncidentId ?? "", customers: f.properties?.ImpactedCustomers ?? 0 },
      })),
    },
    totalCustomers: outages.reduce((sum, o) => sum + o.customers, 0),
    byCounty: [...counties.entries()]
      .map(([county, v]) => ({ county, ...v }))
      .sort((a, b) => b.customers - a.customers),
  };
}
