import type { TrafficCamera } from "@/types/flood";
import { freshImage } from "@/lib/cameraImages";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function cameraPopupHtml(c: TrafficCamera): string {
  const meta = [c.direction && `${c.direction}bound`, c.nearby].filter(Boolean).join(" · ");
  return `<div style="width:256px">
    <div style="position:relative;width:256px;height:144px;border-radius:6px;overflow:hidden;background:var(--surface-muted)">
      <img src="${esc(freshImage(c.imageUrl))}" alt="${esc(`Traffic camera view: ${c.name}`)}" width="256" height="144"
        style="width:100%;height:100%;object-fit:cover;display:block" />
    </div>
    <div style="font-weight:600;font-size:13px;line-height:1.3;margin-top:6px">${esc(c.name)}</div>
    <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(meta)}</div>
    <div style="font-size:11px;color:var(--muted);margin-top:4px">Click for recent frames${c.streamUrl ? " and live video" : ""}</div>
  </div>`;
}

export function clusterPopupHtml(count: number): string {
  return `<div style="font-size:12px"><strong>${count}</strong> traffic cameras · click to zoom in</div>`;
}
