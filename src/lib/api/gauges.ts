import { cacheLife } from "next/cache";
import type { FloodCategory, GaugeDetail, GaugeSummary, TideThresholds, TimePoint } from "@/types/flood";
import { worst } from "@/lib/categories";
import { gaugeTrend } from "@/lib/trends";
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

interface NwpsSeries {
  issuedTime?: string;
  primaryUnits?: string;
  data: { validTime: string; primary: number }[];
}

interface StageFlow {
  observed: TimePoint[];
  forecast: TimePoint[];
  forecastIssued: string | null;
  units: string | null;
}

const toSeries = (s?: NwpsSeries): TimePoint[] =>
  (s?.data ?? [])
    .filter((d) => d.primary !== MISSING)
    .map((d) => ({ t: d.validTime, v: d.primary }));

/** Observed + forecast stage for one gauge, shared by the list (trends) and the detail view. */
async function getStageFlow(lid: string): Promise<StageFlow> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
  const flow = await getJson<{ observed?: NwpsSeries; forecast?: NwpsSeries }>(
    `${NWPS}/gauges/${encodeURIComponent(lid)}/stageflow`,
  );
  return {
    observed: toSeries(flow.observed),
    forecast: toSeries(flow.forecast),
    forecastIssued: flow.forecast?.issuedTime ?? null,
    units: flow.observed?.primaryUnits ?? null,
  };
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
  // The regional list can take 20–30s under storm load; individual gauges respond in ~1s.
  const { gauges } = await getJson<{ gauges: NwpsGauge[] }>(`${NWPS}/gauges?${qs}`, { timeoutMs: 45_000 });

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

  // Recent direction + official crest for gauges that have flood stages.
  const trends = await mapLimit(live, 8, async (g, i) => {
    const t = thresholds[i];
    if (!t) return null;
    const flow = await getStageFlow(g.lid).catch(() => null);
    return flow ? gaugeTrend(flow.observed, flow.forecast, t) : null;
  });

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
      trend: trends[i],
    };
  });
}

export async function getGaugeDetail(lid: string): Promise<GaugeDetail> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });

  const safe = encodeURIComponent(lid);
  const [meta, flow] = await Promise.all([
    getJson<NwpsGaugeMeta>(`${NWPS}/gauges/${safe}`),
    getStageFlow(lid).catch((): StageFlow => ({ observed: [], forecast: [], forecastIssued: null, units: null })),
  ]);

  const cutoff = Date.now() - 72 * 3_600_000;

  return {
    lid: meta.lid,
    name: meta.name.replace(/\s+/g, " ").trim(),
    unit: meta.flood?.stageUnits || flow.units || "ft",
    thresholds: thresholdsFrom(meta) ?? { action: null, minor: null, moderate: null, major: null },
    observed: flow.observed.filter((p) => Date.parse(p.t) >= cutoff),
    forecast: flow.forecast,
    forecastIssued: flow.forecastIssued,
  };
}
