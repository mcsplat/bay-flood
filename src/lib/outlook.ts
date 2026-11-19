import type {
  FloodAlert,
  GaugeSummary,
  Outlook,
  OutlookMoment,
  RainPoint,
  TideStationReport,
  TimePoint,
} from "@/types/flood";
import { CATEGORY_LABEL, rank } from "@/lib/categories";

const HOUR = 3_600_000;
const HEAVY_RATE = 0.15; // in/hr: storm drains and small creeks start to struggle
const MODERATE_RATE = 0.05;

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});
const when = (iso: string) => fmt.format(new Date(iso));
const inches = (v: number) => `${v.toFixed(2)} in`;

/** Average hourly rate across all points, for a single Bay-wide timeline. */
function bayAverage(rain: RainPoint[]): TimePoint[] {
  const byHour = new Map<string, number[]>();
  for (const p of rain) for (const h of p.hourly) byHour.set(h.t, [...(byHour.get(h.t) ?? []), h.v]);
  return [...byHour.entries()]
    .map(([t, vs]) => ({ t, v: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
}

/**
 * Rule-based outlook. Every signal votes worse (+1), better (−1), or neutral (0),
 * and each vote comes with a plain-language reason so the call is explainable.
 */
export function buildOutlook(
  rain: RainPoint[],
  gauges: GaugeSummary[],
  tides: TideStationReport[],
  alerts: FloodAlert[],
  now = Date.now(),
): Outlook {
  const reasons: string[] = [];
  const moments: OutlookMoment[] = [];
  let score = 0;

  // ── Rain: next 6h vs. the last 6h (both from the NWS forecast grid) ──
  const next6 = rain.reduce((s, p) => s + p.next6h, 0) / Math.max(rain.length, 1);
  const last6 = rain.reduce((s, p) => s + p.last6h, 0) / Math.max(rain.length, 1);
  const wettest = [...rain].sort((a, b) => b.next6h - a.next6h)[0];
  if (next6 >= 0.25 && next6 > last6 * 1.2) {
    score += 1;
    reasons.push(`Rain picking up: about ${inches(next6)} expected Bay-wide in the next 6 hours (${wettest?.name} wettest at ${inches(wettest?.next6h ?? 0)}).`);
  } else if (last6 >= 0.1 && next6 < last6 * 0.5) {
    score -= 1;
    reasons.push(`Rain easing: about ${inches(next6)} expected in the next 6 hours, down from ${inches(last6)} in the past 6.`);
  } else if (next6 >= 0.1) {
    reasons.push(`Steady rain: about ${inches(next6)} expected Bay-wide in the next 6 hours.`);
  } else {
    reasons.push("Little or no rain expected in the next 6 hours.");
  }

  // One Bay-wide "heaviest rain" moment, plus individual areas only when genuinely heavy.
  const bayRainAhead = bayAverage(rain).filter((h) => Date.parse(h.t) >= now - HOUR && Date.parse(h.t) <= now + 36 * HOUR);
  const bayPeak = bayRainAhead.reduce<TimePoint | null>((a, b) => (!a || b.v > a.v ? b : a), null);
  if (bayPeak && bayPeak.v >= MODERATE_RATE * 0.6) {
    const wettestAreas = [...rain]
      .sort((a, b) => b.next24h - a.next24h)
      .slice(0, 2)
      .map((p) => `${p.name} ${inches(p.next24h)}`)
      .join(", ");
    moments.push({
      time: bayPeak.t,
      kind: "rain",
      severity: bayPeak.v >= HEAVY_RATE ? "minor" : "action",
      title: "Heaviest rain Bay-wide",
      detail: `~${bayPeak.v.toFixed(2)} in/hr on average · wettest next 24h: ${wettestAreas}`,
    });
  }
  for (const p of rain) {
    if (p.peak && p.peak.rate >= HEAVY_RATE && Date.parse(p.peak.start) <= now + 36 * HOUR) {
      moments.push({
        time: p.peak.start,
        kind: "rain",
        severity: p.peak.rate >= 0.3 ? "moderate" : "minor",
        title: `Heavy rain: ${p.name}`,
        detail: `~${p.peak.rate.toFixed(2)} in/hr until ${when(p.peak.end)} · ${inches(p.next24h)} next 24h`,
        at: [p.lon, p.lat],
      });
    }
  }

  // ── Creeks and rivers ──
  const tracked = gauges.filter((g) => g.trend && !g.trend.tidal);
  const rising = tracked.filter((g) => g.trend!.direction === "rising");
  const falling = tracked.filter((g) => g.trend!.direction === "falling");
  const risingFast = rising.filter((g) => g.trend!.ratePerHour >= 0.3);
  if (rising.length >= 3 && rising.length > falling.length * 1.5) {
    score += 1;
    reasons.push(`${rising.length} of ${tracked.length} creek gauges are rising${risingFast.length ? `, ${risingFast.length} quickly` : ""}.`);
  } else if (falling.length >= 3 && falling.length > rising.length * 1.5) {
    score -= 1;
    reasons.push(`${falling.length} of ${tracked.length} creek gauges are falling.`);
  } else if (tracked.length) {
    reasons.push(`Creeks mixed: ${rising.length} rising, ${falling.length} falling, ${tracked.length - rising.length - falling.length} steady.`);
  }

  for (const g of tracked) {
    const t = g.trend!;
    if (t.crest && rank(t.crest.category) >= 1 && Date.parse(t.crest.time) <= now + 48 * HOUR) {
      score += rank(t.crest.category) >= 2 ? 1 : 0;
      moments.push({
        time: t.crest.time,
        kind: "crest",
        severity: t.crest.category,
        title: `${g.name} ${t.crest.stillRising ? "still rising at end of forecast" : "forecast to crest"}`,
        detail: `${t.crest.stage.toFixed(1)} ft (${CATEGORY_LABEL[t.crest.category].toLowerCase()}) · official NWS forecast`,
        at: [g.lon, g.lat],
      });
    }
    if (t.floodStageEta) {
      moments.push({
        time: t.floodStageEta,
        kind: "flood-stage",
        severity: "minor",
        title: `${g.name} could reach flood stage`,
        detail: `Rising ${t.ratePerHour.toFixed(2)} ft/hr; rough estimate if the rise continues`,
        at: [g.lon, g.lat],
      });
    }
  }
  const soonToFlood = tracked.filter(
    (g) => g.trend!.floodStageEta && Date.parse(g.trend!.floodStageEta) <= now + 6 * HOUR,
  );
  if (soonToFlood.length) {
    score += 1;
    reasons.push(
      `${soonToFlood.map((g) => g.name).slice(0, 2).join(" and ")}${soonToFlood.length > 2 ? ` and ${soonToFlood.length - 2} more` : ""} could reach flood stage within 6 hours at the current rate of rise.`,
    );
  }
  const crestsAhead = moments.filter((m) => m.kind === "crest" && rank(m.severity) >= 2).length;
  if (crestsAhead) reasons.push(`${crestsAhead} river forecast${crestsAhead > 1 ? "s" : ""} crest above flood stage in the next 48 hours.`);

  // ── Tides: risky high tides ahead, and overlap with heavy rain ──
  const rainAt = (t: number) =>
    Math.max(0, ...rain.flatMap((p) => p.hourly.filter((h) => Math.abs(Date.parse(h.t) - t) <= 2 * HOUR).map((h) => h.v)));
  let riskyTideSoon = false;
  for (const s of tides) {
    for (const e of s.extremes) {
      const t = Date.parse(e.t);
      if (e.type !== "H" || t < now || t > now + 48 * HOUR || rank(e.category) < 1) continue;
      if (t <= now + 12 * HOUR) riskyTideSoon = true;
      moments.push({
        time: e.t,
        kind: "tide",
        severity: e.category,
        title: `High tide near flood level: ${s.name}`,
        detail: `~${e.projected.toFixed(1)} ft projected with current surge (flood ${s.thresholds.minor?.toFixed(1) ?? "n/a"} ft)`,
        at: [s.lon, s.lat],
      });
      const r = rainAt(t);
      if (r >= HEAVY_RATE * 0.66) {
        moments.push({
          time: e.t,
          kind: "compound",
          severity: rank(e.category) >= 2 ? "moderate" : "minor",
          title: `Rain + high tide overlap near ${s.name}`,
          detail: `~${r.toFixed(2)} in/hr rain within 2 hours of a high tide: bayside drains back up and low spots flood more easily`,
          at: [s.lon, s.lat],
        });
      }
    }
  }
  if (riskyTideSoon) {
    score += 1;
    reasons.push("A high tide near flood level arrives within 12 hours.");
  }

  // ── Active warnings keep the call from reading "improving" while flooding is happening ──
  const warnings = alerts.filter((a) => a.kind === "warning").length;
  if (warnings) reasons.push(`${warnings} flood warning${warnings > 1 ? "s" : ""} in effect.`);

  let direction: Outlook["direction"] = score >= 2 ? "worsening" : score <= -1 ? "improving" : "steady";
  // Don't call it "improving" while flooding is underway or meaningful rain is still coming.
  if (direction === "improving" && (warnings || next6 >= 0.1)) direction = "steady";

  return {
    direction,
    reasons,
    rain,
    bayRain: bayAverage(rain),
    moments: moments.sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).slice(0, 12),
    generatedAt: new Date(now).toISOString(),
  };
}
