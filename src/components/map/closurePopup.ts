import type { RoadClosure } from "@/types/flood";
import { closureEnds, closureExtent, closureHeadline, closureLanes } from "@/lib/closures";
import { CLOSURE_FILL, CLOSURE_STORM_FILL } from "./mapIcons";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:1.6">
    <span style="color:var(--muted)">${label}</span>
    <span style="text-align:right">${value}</span>
  </div>`;
}

/** Desktop hover popup for a road closure. */
export function closurePopupHtml(c: RoadClosure): string {
  const color = c.stormRelated ? CLOSURE_STORM_FILL : CLOSURE_FILL;
  const reason = c.stormRelated ? `<strong style="color:${color}">${esc(c.reason)}</strong>` : esc(c.reason);
  return `<div style="min-width:220px;max-width:270px">
    <div style="font-weight:600;font-size:13px;line-height:1.3">${esc(closureHeadline(c))}</div>
    <div style="font-size:11px;color:var(--muted);margin:2px 0 6px">${esc(closureExtent(c))}</div>
    ${row("Lanes", esc(closureLanes(c)))}
    ${row("Reason", reason)}
    ${row("Expected to reopen", esc(closureEnds(c)))}
    ${c.delayMinutes ? row("Delay", `about ${c.delayMinutes} min`) : ""}
  </div>`;
}
