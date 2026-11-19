import { cacheLife } from "next/cache";
import type { FloodCategory, GaugeDetail, GaugeSummary, TideThresholds, TimePoint } from "@/types/flood";
import { worst } from "@/lib/categories";
import { getJson, mapLimit } from "./http";

const NWPS = "https://api.water.noaa.gov/nwps/v1";
const BAY_BBOX = { xmin: -123.3, ymin: 36.9, xmax: -121.4, ymax: 38.8 };
const MISSING = -999;

interface NwpsStatus {
  primary: number;
  primaryUnit: string;
  floodCategory: string;
  validTime: string;
}

interface NwpsGauge {
  lid: string;
  name: string;
  latitude: number;
  longitude: number;
  status: { observed: NwpsStatus; forecast: NwpsStatus };
}

const CATEGORY_MAP: Record<string, FloodCategory> = {
  no_flooding: "none",
  action: "action",
  minor: "minor",
  moderate: "moderate",
  major: "major",
};

function toReading(s: NwpsStatus) {
  if (s.primary === MISSING) return null;
  return {
    stage: s.primary,
    time: s.validTime,
    category: CATEGORY_MAP[s.floodCategory] ?? "unknown",
  };
}

interface NwpsGaugeMeta {
  lid: string;
  name: string;
  flood?: { stageUnits?: string; categories?: Record<string, { stage: number }> };
}

function thresholdsFrom(meta: NwpsGaugeMeta): TideThresholds | null {
  const stage = (k: string) => {
    const v = meta.flood?.categories?.[k]?.stage;
    // NWPS uses both -999 and -9999 as "not defined" sentinels.
    return v == null || v <= MISSING ? null : v;
  };
  const t ={ action: stage("action"), minor: stage("minor"), moderate: stage("moderate"), major: stage("major") };
  return Object.values(t).some((v) => v != null) ? t : null;
}

/** Flood stages change rarely, so cache each gauge's thresholds for days. */
async function getGaugeThresholds(lid: string): Promise<TideThresholds | null> {
  "use cache";
  cacheLife("days");
  const meta = await getJson<NwpsGaugeMeta>(`${NWPS}/gauges/${encodeURIComponent(lid)}`);
  return thresholdsFrom(meta);
}

export async function getBayAreaGauges(): Promise<GaugeSummary[]> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });

  const qs = new URLSearchParams({
    "bbox.xmin": String(BAY_BBOX.xmin),
    "bbox.ymin": String(BAY_BBOX.ymin),
    "bbox.xmax": String(BAY_BBOX.xmax),
    "bbox.ymax": String(BAY_BBOX.ymax),
    srid: "EPSG_4326",
  });
  const { gauges } = await getJson<{ gauges: NwpsGauge[] }>(`${NWPS}/gauges?${qs}`);

  const live = gauges.filter(
    (g) =>
      g.status.observed.primary !== MISSING &&
      !["out_of_service", "obs_not_current"].includes(g.status.observed.floodCategory),
  );

  // Only gauges with an official flood stage have thresholds worth fetching.
  const thresholds = await mapLimit(live, 8, (g) =>
    g.status.observed.floodCategory === "not_defined"
      ? Promise.resolve(null)
      : getGaugeThresholds(g.lid).catch(() => null),
  );

  return live.map((g, i) => {
    const observed = toReading(g.status.observed);
    const forecast = toReading(g.status.forecast);
    return {
      lid: g.lid,
      name: g.name.replace(/\s+/g, " ").trim(),
      lat: g.latitude,
      lon: g.longitude,
      unit: g.status.observed.primaryUnit || "ft",
      observed,
      forecast,
      category: worst(observed?.category, forecast?.category),
      thresholds: thresholds[i],
    };
  });
}

interface NwpsSeries {
  issuedTime?: string;
  primaryUnits?: string;
  data: { validTime: string; primary: number }[];
}

const toSeries = (s?: NwpsSeries): TimePoint[] =>
  (s?.data ?? [])
    .filter((d) => d.primary !== MISSING)
    .map((d) => ({ t: d.validTime, v: d.primary }));

export async function getGaugeDetail(lid: string): Promise<GaugeDetail> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });

  const safe = encodeURIComponent(lid);
  const [meta, flow] = await Promise.all([
    getJson<NwpsGaugeMeta>(`${NWPS}/gauges/${safe}`),
    getJson<{ observed?: NwpsSeries; forecast?: NwpsSeries }>(`${NWPS}/gauges/${safe}/stageflow`).catch(
      () => ({}) as { observed?: NwpsSeries; forecast?: NwpsSeries },
    ),
  ]);

  const cutoff = Date.now() - 72 * 3_600_000;

  return {
    lid: meta.lid,
    name: meta.name.replace(/\s+/g, " ").trim(),
    unit: meta.flood?.stageUnits || flow.observed?.primaryUnits || "ft",
    thresholds: thresholdsFrom(meta) ?? { action: null, minor: null, moderate: null, major: null },
    observed: toSeries(flow.observed).filter((p) => Date.parse(p.t) >= cutoff),
    forecast: toSeries(flow.forecast),
    forecastIssued: flow.forecast?.issuedTime ?? null,
  };
}
