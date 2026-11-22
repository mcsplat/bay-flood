import type { FloodAlert, GaugeSummary, PowerOutage, RoadClosure, TrafficCamera } from "@/types/flood";
import { closureExtent, closureHeadline } from "@/lib/closures";
import { CLOSURE_FILL, CLOSURE_STORM_FILL } from "./mapIcons";
import { ALERT_COLOR, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/categories";
import { formatTime, trendLabel } from "@/lib/format";
import { CAMERA_COLOR, OUTAGE_COLOR } from "./layers";

/**
 * Short labels for phones, where there's no hover: the first tap on a marker shows one of
 * these, and tapping the label opens the full details in the sheet.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function label(swatch: string, shape: "dot" | "square" | "diamond", title: string, detail: string, action: string): string {
  const radius = shape === "dot" ? "999px" : "3px";
  const turn = shape === "diamond" ? ";transform:rotate(45deg) scale(.85)" : "";
  return `<button type="button" class="tap-label">
    <span class="tap-label-swatch" style="background:${swatch};border-radius:${radius}${turn}" aria-hidden="true"></span>
    <span class="tap-label-text">
      <span class="tap-label-title">${esc(title)}</span>
      <span class="tap-label-detail">${detail}</span>
    </span>
    <span class="tap-label-action">${esc(action)} ›</span>
  </button>`;
}

export function gaugeLabel(g: GaugeSummary): string {
  const color = CATEGORY_COLOR[g.category];
  const reading = g.observed ? `${g.observed.stage.toFixed(1)} ${esc(g.unit)}` : "No current reading";
  const trend = trendLabel(g.trend);
  const status = `<span style="color:${color};font-weight:600">${esc(CATEGORY_LABEL[g.category])}</span>`;
  return label(color, "dot", g.name, [reading, status, trend && esc(trend)].filter(Boolean).join(" · "), "Details");
}

export function cameraLabel(c: TrafficCamera): string {
  const meta = [c.direction && `${c.direction}bound`, c.nearby].filter(Boolean).map((s) => esc(s!)).join(" · ");
  return label(CAMERA_COLOR, "square", c.name, `Traffic camera${meta ? ` · ${meta}` : ""}`, c.streamUrl ? "View live" : "View");
}

export function outageLabel(o: PowerOutage): string {
  const people = `${o.customers.toLocaleString()} customer${o.customers === 1 ? "" : "s"}`;
  return label(OUTAGE_COLOR, "dot", `⚡ ${o.utility} power outage`, `${people} · since ${esc(formatTime(o.started))}`, "Details");
}

export function alertLabel(a: FloodAlert): string {
  const area = a.areaDesc.length > 70 ? `${a.areaDesc.slice(0, 67).trimEnd()}…` : a.areaDesc;
  return label(ALERT_COLOR[a.kind], "square", a.event, esc(area), "Details");
}

export function closureLabel(c: RoadClosure): string {
  const color = c.stormRelated ? CLOSURE_STORM_FILL : CLOSURE_FILL;
  const reason = c.stormRelated ? `<span style="color:${color};font-weight:600">${esc(c.reason)}</span>` : esc(c.reason);
  const source = c.source === "chp" ? " · CHP report" : "";
  return label(color, "diamond", closureHeadline(c), `${reason}${source} · ${esc(closureExtent(c))}`, "Details");
}
