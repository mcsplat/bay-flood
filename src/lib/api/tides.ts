import { cacheLife } from "next/cache";
import type {
  TideExtreme,
  TideStationReport,
  TideThresholds,
  TimePoint,
} from "@/types/flood";
import { classify, worst } from "@/lib/categories";
import { getJson, settled } from "./http";

export const TIDE_STATIONS = [
  { id: "9414290", name: "San Francisco", lat: 37.8063, lon: -122.4659 },
  { id: "9414863", name: "Richmond", lat: 37.9283, lon: -122.4 },
  { id: "9414750", name: "Alameda", lat: 37.772, lon: -122.3003 },
  { id: "9414523", name: "Redwood City", lat: 37.5068, lon: -122.2119 },
  { id: "9415144", name: "Port Chicago", lat: 38.056, lon: -122.0395 },
] as const;

const DATA = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const META = "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations";
const HOUR = 3_600_000;

type Raw = { t: string; v: string; type?: "H" | "L" };

/** CO-OPS "yyyyMMdd HH:mm" in GMT */
function coopsDate(d: Date): string {
  return d.toISOString().slice(0, 16).replace(/-/g, "").replace("T", " ");
}

function toPoint(r: Raw): TimePoint {
  return { t: `${r.t.replace(" ", "T")}:00Z`, v: Number(r.v) };
}

async function series(station: string, params: Record<string, string>) {
  const qs = new URLSearchParams({
    station,
    datum: "MLLW",
    time_zone: "gmt",
    units: "english",
    format: "json",
    application: "bay-flood-watch",
    ...params,
  });
  const json = await getJson<{ predictions?: Raw[]; data?: Raw[] }>(`${DATA}?${qs}`);
  return json.predictions ?? json.data ?? [];
}

/** Flood levels are published in station datum (STND); convert to MLLW. */
async function getThresholds(station: string): Promise<TideThresholds> {
  "use cache";
  cacheLife("days");
  const [datums, levels] = await Promise.all([
    getJson<{ datums: { name: string; value: number }[] }>(`${META}/${station}/datums.json`),
    getJson<Record<string, number | null>>(`${META}/${station}/floodlevels.json`),
  ]);
  const mllw = datums.datums.find((d) => d.name === "MLLW")?.value ?? 0;
  const conv = (v: number | null | undefined) =>
    v == null ? null : Math.round((v - mllw) * 100) / 100;
  return {
    action: conv(levels.action),
    minor: conv(levels.nws_minor ?? levels.nos_minor),
    moderate: conv(levels.nws_moderate ?? levels.nos_moderate),
    major: conv(levels.nws_major ?? levels.nos_major),
  };
}

function predictedAt(predictions: TimePoint[], t: number): number | null {
  for (let i = 1; i < predictions.length; i++) {
    const a = predictions[i - 1];
    const b = predictions[i];
    const ta = Date.parse(a.t);
    const tb = Date.parse(b.t);
    if (t >= ta && t <= tb) return a.v + ((b.v - a.v) * (t - ta)) / (tb - ta);
  }
  return null;
}

async function getStation(s: (typeof TIDE_STATIONS)[number]): Promise<TideStationReport> {
  const now = new Date();
  const back = new Date(now.getTime() - 12 * HOUR);
  const ahead = new Date(now.getTime() + 72 * HOUR);
  const range = { begin_date: coopsDate(back), end_date: coopsDate(ahead) };

  const [pred, obs, hilo, thresholds] = await Promise.all([
    series(s.id, { product: "predictions", interval: "15", ...range }),
    series(s.id, { product: "water_level", begin_date: coopsDate(back), end_date: coopsDate(now) }).catch(() => []),
    series(s.id, { product: "predictions", interval: "hilo", begin_date: coopsDate(now), end_date: coopsDate(ahead) }),
    getThresholds(s.id).catch(() => ({ action: null, minor: null, moderate: null, major: null })),
  ]);

  const predictions = pred.map(toPoint);
  const observations = obs.filter((r) => r.v !== "").map(toPoint);
  const observed = observations.at(-1) ?? null;
  const expected = observed ? predictedAt(predictions, Date.parse(observed.t)) : null;
  const surge = observed && expected != null ? Math.round((observed.v - expected) * 100) / 100 : null;

  const extremes: TideExtreme[] = hilo.map((r) => {
    const p = toPoint(r);
    const projected = Math.round((p.v + (surge ?? 0)) * 100) / 100;
    return { ...p, type: r.type ?? "H", projected, category: classify(projected, thresholds) };
  });

  return {
    ...s,
    observed,
    surge,
    thresholds,
    predictions,
    observations,
    extremes,
    outlook: worst(...extremes.filter((e) => e.type === "H").map((e) => e.category)),
  };
}

export async function getTideReports(): Promise<TideStationReport[]> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 360, expire: 3600 });
  return settled(TIDE_STATIONS.map(getStation));
}
