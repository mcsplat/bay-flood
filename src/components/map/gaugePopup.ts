import type { GaugeSummary, TideThresholds } from "@/types/flood";
import { CATEGORY_COLOR, CATEGORY_LABEL, rank } from "@/lib/categories";
import { formatRelative, formatTime, trendLabel } from "@/lib/format";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ft = (v: number) => `${v.toFixed(2)} ft`;

/** "+0.63 ft above" / "6.87 ft below" relative to a threshold. */
function delta(current: number, level: number, aboveColor: string): string {
  const d = current - level;
  if (Math.abs(d) < 0.005) return `<span style="font-weight:600">at level</span>`;
  const word = d > 0 ? "above" : "below";
  const color = d > 0 ? aboveColor : "var(--muted)";
  return `<span style="color:${color};font-weight:600">${Math.abs(d).toFixed(2)} ft ${word}</span>`;
}

/**
 * A segmented meter: normal (teal) up to action stage, then yellow/orange/red/purple
 * bands for action → minor → moderate → major, with a marker at the current reading.
 */
function meter(current: number, t: TideThresholds): string {
  const levels = [t.action, t.minor, t.moderate, t.major].filter((v): v is number => v != null);
  const first = levels[0];
  const last = levels.at(-1)!;
  const span = Math.max(last - first, 1);
  const lo = Math.min(current, first) - span * 0.6;
  const hi = Math.max(current, last) + span * 0.15;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;

  const bands: [number | null, string][] = [
    [t.action, CATEGORY_COLOR.action],
    [t.minor, CATEGORY_COLOR.minor],
    [t.moderate, CATEGORY_COLOR.moderate],
    [t.major, CATEGORY_COLOR.major],
  ];
  let stops = `${CATEGORY_COLOR.none} 0%`;
  let prevColor = CATEGORY_COLOR.none;
  for (const [level, color] of bands) {
    if (level == null) continue;
    const p = pct(level).toFixed(1);
    stops += `, ${prevColor} ${p}%, ${color} ${p}%`;
    prevColor = color;
  }
  stops += `, ${prevColor} 100%`;

  const marker = Math.min(Math.max(pct(current), 0), 100).toFixed(1);
  return `
    <div style="position:relative;height:8px;border-radius:4px;margin:10px 0 4px;background:linear-gradient(90deg, ${stops});opacity:.9" aria-hidden="true">
      <div style="position:absolute;left:${marker}%;top:-4px;width:3px;height:16px;margin-left:-1.5px;border-radius:2px;background:var(--foreground);box-shadow:0 0 0 2px var(--surface)"></div>
    </div>`;
}

function row(label: string, value: string, extra = ""): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.6">
    <span style="color:var(--muted)">${label}</span>
    <span style="text-align:right;font-variant-numeric:tabular-nums">${value}${extra ? ` · ${extra}` : ""}</span>
  </div>`;
}

export function gaugePopupHtml(g: GaugeSummary): string {
  const color = CATEGORY_COLOR[g.category];
  const atRisk = rank(g.category) >= 1;
  const current = g.observed?.stage;
  const t = g.thresholds;

  const badge = `<span style="display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600;color:${color};background:${color}22">
      ${atRisk ? "⚠ " : ""}${esc(CATEGORY_LABEL[g.category])}</span>`;

  let body: string;
  if (current == null) {
    body = row("Now", "No current reading");
  } else if (!t) {
    body =
      row("Now", `<strong>${ft(current)}</strong>`, esc(formatRelative(g.observed?.time))) +
      `<p style="margin-top:6px;font-size:11px;color:var(--muted)">No official flood stage for this gauge. Watch for sharp rises.</p>`;
  } else {
    const floodStage = t.minor ?? t.moderate ?? t.major;
    body =
      row("Now", `<strong>${ft(current)}</strong>`, esc(formatRelative(g.observed?.time))) +
      meter(current, t) +
      (t.action != null && t.action !== floodStage ? row("Normal up to", ft(t.action), delta(current, t.action, "#b45309")) : "") +
      (floodStage != null ? row("Flood stage", ft(floodStage), delta(current, floodStage, "#dc2626")) : "") +
      (t.moderate != null ? row("Moderate", ft(t.moderate)) : "") +
      (t.major != null ? row("Major", ft(t.major)) : "");
  }

  const trend = trendLabel(g.trend);
  if (trend) {
    const color = g.trend?.tidal ? "var(--muted)" : g.trend?.direction === "rising" ? "#b45309" : g.trend?.direction === "falling" ? "#059669" : "var(--muted)";
    body += row("Last 2 hours", `<span style="color:${color};font-weight:600">${esc(trend)}</span>`);
  }
  const crest = g.trend?.crest;
  if (crest) {
    body += row(crest.stillRising ? "Forecast peak" : "Forecast crest", ft(crest.stage), esc(formatTime(crest.time)));
  } else if (g.forecast) {
    body += row("Forecast", ft(g.forecast.stage), esc(formatTime(g.forecast.time)));
  }
  if (g.trend?.floodStageEta) {
    body += row("Flood stage at this rate", `<span style="color:#dc2626;font-weight:600">~${esc(formatTime(g.trend.floodStageEta))}</span>`);
  }

  return `<div style="min-width:220px;max-width:260px">
    <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:4px">${esc(g.name)}</div>
    <div style="margin-bottom:6px">${badge}</div>
    ${body}
  </div>`;
}
