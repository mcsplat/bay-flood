import type { Map as MlMap } from "maplibre-gl";

/**
 * Map marker icons, drawn on a canvas at load so there are no image files to fetch.
 * Each layer gets its own shape (gauges stay round), so color is free to mean severity.
 */
const RATIO = 2; // draw at 2x for sharp edges on phones

export const CAMERA_FILL = "#334155";
export const CAMERA_VIDEO_RING = "#38bdf8";
export const OUTAGE_FILL = "#6366f1";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w * RATIO;
  c.height = h * RATIO;
  const ctx = c.getContext("2d")!;
  ctx.scale(RATIO, RATIO);
  return { c, ctx };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Rounded square with a small camera glyph. `ring` marks cameras that have live video. */
function cameraIcon(size: number, ring: string) {
  const { c, ctx } = canvas(size, size);
  const s = size;
  roundRect(ctx, 1, 1, s - 2, s - 2, s * 0.26);
  ctx.fillStyle = CAMERA_FILL;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ring;
  ctx.stroke();
  // Camera body, lens and viewfinder bump, in white.
  ctx.fillStyle = "#ffffff";
  const bw = s * 0.5;
  const bh = s * 0.34;
  const bx = (s - bw) / 2;
  const by = s * 0.38;
  roundRect(ctx, bx + bw * 0.28, by - s * 0.08, bw * 0.3, s * 0.1, 1);
  ctx.fill();
  roundRect(ctx, bx, by, bw, bh, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s / 2, by + bh / 2, bh * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = CAMERA_FILL;
  ctx.fill();
  return c;
}

/** Indigo circle with a white lightning bolt. Sized per outage with icon-size. */
function outageIcon(size: number) {
  const { c, ctx } = canvas(size, size);
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = OUTAGE_FILL;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  const k = size / 24; // bolt drawn on a 24-unit grid
  ctx.beginPath();
  for (const [i, [x, y]] of ([[13, 4], [6.5, 13.5], [11.5, 13.5], [10.5, 20], [17.5, 10], [12.5, 10], [13, 4]] as const).entries()) {
    if (i === 0) ctx.moveTo(x * k, y * k);
    else ctx.lineTo(x * k, y * k);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  return c;
}

function add(m: MlMap, name: string, c: HTMLCanvasElement) {
  if (m.hasImage(name)) return;
  const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
  m.addImage(name, data, { pixelRatio: RATIO });
}

export function addMapIcons(m: MlMap) {
  add(m, "camera", cameraIcon(20, "#ffffff"));
  add(m, "camera-video", cameraIcon(20, CAMERA_VIDEO_RING));
  add(m, "camera-cluster", cameraIcon(28, "#ffffff"));
  add(m, "outage", outageIcon(24));
}
