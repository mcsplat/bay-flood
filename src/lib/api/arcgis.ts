import type { Feature, FeatureCollection, Geometry } from "geojson";
import { getJson } from "./http";

/** Same envelope used for NWPS gauges: Santa Rosa → Santa Cruz, Bodega → Brentwood. */
export const BAY_ENVELOPE = "-123.3,36.9,-121.4,38.8";

export const BAY_COUNTIES = [
  "ALAMEDA",
  "CONTRA COSTA",
  "MARIN",
  "NAPA",
  "SAN FRANCISCO",
  "SAN MATEO",
  "SANTA CLARA",
  "SANTA CRUZ",
  "SOLANO",
  "SONOMA",
];

/**
 * Query an ArcGIS FeatureServer layer as GeoJSON, following
 * exceededTransferLimit pages up to `maxPages`.
 */
export async function queryGeoJson<P = Record<string, unknown>>(
  layerUrl: string,
  params: Record<string, string>,
  { pageSize = 2000, maxPages = 5, timeoutMs = 20_000 } = {},
): Promise<FeatureCollection<Geometry, P>> {
  const features: Feature<Geometry, P>[] = [];
  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams({
      outSR: "4326",
      f: "geojson",
      resultRecordCount: String(pageSize),
      resultOffset: String(page * pageSize),
      ...params,
    });
    const fc = await getJson<FeatureCollection<Geometry, P> & { properties?: { exceededTransferLimit?: boolean } }>(
      `${layerUrl}/query?${qs}`,
      { timeoutMs },
    );
    features.push(...fc.features);
    if (!fc.properties?.exceededTransferLimit) break;
  }
  return { type: "FeatureCollection", features };
}
