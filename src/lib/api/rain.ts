import { cacheLife } from "next/cache";
import type { RainPoint, TimePoint } from "@/types/flood";
import { getJson, settled } from "./http";

const HOUR = 3_600_000;
const MM_PER_INCH = 25.4;

/** Spread across the region's microclimates: the hills get several times the valleys' rain. */
const POINTS = [
  { id: "santa-rosa", name: "Santa Rosa", lat: 38.4404, lon: -122.7141 },
  { id: "napa", name: "Napa", lat: 38.2975, lon: -122.2869 },
  { id: "marin", name: "Mill Valley", lat: 37.906, lon: -122.545 },
  { id: "sf", name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { id: "east-bay", name: "Walnut Creek", lat: 37.9101, lon: -122.0652 },
  { id: "peninsula", name: "Half Moon Bay", lat: 37.4636, lon: -122.4286 },
  { id: "south-bay", name: "San Jose", lat: 37.3382, lon: -121.8863 },
  { id: "santa-cruz-mtns", name: "Santa Cruz Mtns", lat: 37.05, lon: -122.05 },
] as const;

interface GridValue {
  validTime: string; // "2026-11-18T18:00:00+00:00/PT6H"
  value: number | null;
}

/** Grid cell for a lat/lon rarely changes; cache it for days. */
async function gridFor(lat: number, lon: number): Promise<string> {
  "use cache";
  cacheLife("days");
  const p = await getJson<{ properties: { forecastGridData: string } }>(
    `https://api.weather.gov/points/${lat},${lon}`,
    { accept: "application/geo+json" },
  );
  return p.properties.forecastGridData;
}

/** "PT6H" / "P1DT6H" → hours */
function durationHours(iso: string): number {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?/);
  return m ? Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0) : 1;
}

/** Spread each multi-hour forecast block evenly into hourly rates (in/hr). */
function toHourly(values: GridValue[]): TimePoint[] {
  const out: TimePoint[] = [];
  for (const { validTime, value } of values) {
    if (value == null) continue;
    const [start, dur] = validTime.split("/");
    const hours = Math.max(durationHours(dur), 1);
    const rate = value / MM_PER_INCH / hours;
    const t0 = Date.parse(start);
    for (let h = 0; h < hours; h++) out.push({ t: new Date(t0 + h * HOUR).toISOString(), v: rate });
  }
  return out;
}

const sumBetween = (pts: TimePoint[], from: number, to: number) =>
  pts.filter((p) => Date.parse(p.t) >= from && Date.parse(p.t) < to).reduce((s, p) => s + p.v, 0);

async function getPoint(pt: (typeof POINTS)[number]): Promise<RainPoint> {
  const grid = await gridFor(pt.lat, pt.lon);
  const data = await getJson<{ properties: { quantitativePrecipitation: { values: GridValue[] } } }>(grid, {
    accept: "application/geo+json",
  });
  const now = Date.now();
  const hourly = toHourly(data.properties.quantitativePrecipitation.values).filter(
    (p) => Date.parse(p.t) >= now - 12 * HOUR && Date.parse(p.t) <= now + 48 * HOUR,
  );

  // Heaviest stretch ahead: the contiguous run of hours at the max forecast rate.
  const ahead = hourly.filter((p) => Date.parse(p.t) >= now - HOUR);
  let peak: RainPoint["peak"] = null;
  const max = Math.max(0, ...ahead.map((p) => p.v));
  if (max >= 0.02) {
    const first = ahead.findIndex((p) => p.v === max);
    let last = first;
    while (last + 1 < ahead.length && ahead[last + 1].v === max) last++;
    peak = {
      start: ahead[first].t,
      end: new Date(Date.parse(ahead[last].t) + HOUR).toISOString(),
      rate: Math.round(max * 100) / 100,
    };
  }

  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    ...pt,
    hourly,
    next6h: round(sumBetween(hourly, now, now + 6 * HOUR)),
    next24h: round(sumBetween(hourly, now, now + 24 * HOUR)),
    last6h: round(sumBetween(hourly, now - 6 * HOUR, now)),
    peak,
  };
}

export async function getRainOutlook(): Promise<RainPoint[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3 * 3600 });
  const points = await settled(POINTS.map(getPoint));
  if (!points.length) throw new Error("NWS rain forecast unavailable");
  return points;
}
