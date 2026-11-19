import type { PowerOutage } from "@/types/flood";
import { formatRelative, formatTime } from "@/lib/format";
import { OUTAGE_COLOR } from "./layers";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.6">
    <span style="color:var(--muted)">${label}</span>
    <span style="text-align:right">${value}</span>
  </div>`;
}

export function outagePopupHtml(o: PowerOutage): string {
  const customers = `${o.customers.toLocaleString()} customer${o.customers === 1 ? "" : "s"}`;
  return `<div style="min-width:210px;max-width:260px">
    <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:13px;margin-bottom:4px">
      <span style="color:${OUTAGE_COLOR}" aria-hidden="true">⚡</span>${esc(o.utility)} power outage
    </div>
    ${row("Affected", `<strong>${customers}</strong>`)}
    ${row("Started", esc(`${formatTime(o.started)} (${formatRelative(o.started)})`))}
    ${row("Est. restore", esc(o.estimatedRestore ? `${formatTime(o.estimatedRestore)} (${formatRelative(o.estimatedRestore)})` : "Not yet estimated"))}
    ${row("Cause", esc(o.cause ?? "Under investigation"))}
    ${row("County", esc(o.county))}
  </div>`;
}
