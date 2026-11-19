import type { Direction, FloodCategory, GaugeTrend, TideThresholds, TimePoint } from "@/types/flood";
import { classify } from "@/lib/categories";

const HOUR = 3_600_000;

/** Least-squares slope of value vs. time, in units per hour. */
export function slopePerHour(points: TimePoint[]): number | null {
  if (points.length < 3) return null;
  const xs = points.map((p) => Date.parse(p.t) / HOUR);
  const ys = points.map((p) => p.v);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** ±0.05 ft/hr is noise for most creek gauges. */
export function directionOf(rate: number, threshold = 0.05): Direction {
  if (rate > threshold) return "rising";
  if (rate < -threshold) return "falling";
  return "steady";
}

/** Hourly means over [from, to); null where an hour has no readings. */
function hourlyMeans(points: TimePoint[], from: number, to: number): (number | null)[] {
  const sums = new Array<number>(Math.ceil((to - from) / HOUR)).fill(0);
  const counts = new Array<number>(sums.length).fill(0);
  for (const p of points) {
    const i = Math.floor((Date.parse(p.t) - from) / HOUR);
    if (i >= 0 && i < sums.length) {
      sums[i] += p.v;
      counts[i] += 1;
    }
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : null));
}

function correlation(a: (number | null)[], b: (number | null)[]): number | null {
  const pairs = a.flatMap((x, i) => (x != null && b[i] != null ? [[x, b[i]!] as const] : []));
  if (pairs.length < 12) return null;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / pairs.length;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / pairs.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/**
 * Gauges near the Bay rise and fall with the tide. Bay tides are "mixed": the two daily
 * highs differ a lot, so the pattern repeats most strongly every ~24.8 hours. A tidal gauge
 * correlates with itself a tidal day earlier (0.85–0.93 on Petaluma, Napa, and Rio Vista
 * gauges) and anti-correlates a quarter-day apart; storm runoff does neither.
 */
export function looksTidal(observed: TimePoint[], now = Date.now()): boolean {
  const from = now - 48 * HOUR;
  const series = hourlyMeans(observed, from, now);
  const present = series.filter((v): v is number => v != null);
  if (present.length < 30) return false;
  if (Math.max(...present) - Math.min(...present) < 1) return false;

  const lagged = (lag: number) => correlation(series.slice(lag), series.slice(0, series.length - lag));
  const tidalDay = Math.max(lagged(24) ?? -1, lagged(25) ?? -1);
  const quarterDay = lagged(6) ?? 1;
  return tidalDay >= 0.6 && quarterDay <= 0;
}

export function gaugeTrend(
  observed: TimePoint[],
  forecast: TimePoint[],
  thresholds: TideThresholds,
  now = Date.now(),
): GaugeTrend | null {
  const recent = observed.filter((p) => Date.parse(p.t) >= now - 2.5 * HOUR);
  const rate = slopePerHour(recent);
  if (rate == null) return null;
  const tidal = looksTidal(observed, now);

  // Official forecast crest: highest forecast point still ahead of us.
  const ahead = forecast.filter((p) => Date.parse(p.t) >= now);
  let crest: GaugeTrend["crest"] = null;
  if (ahead.length) {
    const top = ahead.reduce((a, b) => (b.v > a.v ? b : a));
    const category: FloodCategory = classify(top.v, thresholds);
    crest = { stage: top.v, time: top.t, category, stillRising: top === ahead[ahead.length - 1] };
  }

  // Without an official forecast, extrapolate a rising creek to flood stage (rough, capped at 12h).
  let floodStageEta: string | null = null;
  const floodStage = thresholds.minor;
  const latest = observed.at(-1);
  if (!crest && !tidal && latest && floodStage != null && rate > 0.1 && latest.v < floodStage) {
    const hours = (floodStage - latest.v) / rate;
    if (hours <= 12) floodStageEta = new Date(Date.parse(latest.t) + hours * HOUR).toISOString();
  }

  return { direction: directionOf(rate), ratePerHour: Math.round(rate * 100) / 100, crest, floodStageEta, tidal };
}
