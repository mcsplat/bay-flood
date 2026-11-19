"use client";

import { RADAR_FRAMES, type RadarState } from "./radar";

const TZ = "America/Los_Angeles";
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

/** NWS reflectivity palette, light drizzle → intense rain/hail. */
const LEGEND = "linear-gradient(90deg, #04e9e7, #019ff4, #0300f4, #02fd02, #01c501, #008e00, #fdf802, #e5bc00, #fd9500, #fd0000, #d40000, #bc0000, #f800fd)";

export function RadarControl({ radar }: { radar: RadarState }) {
  const latest = radar.frame === RADAR_FRAMES.length - 1;
  return (
    <section
      aria-label="Weather radar"
      className="absolute bottom-9 left-3 z-10 w-56 rounded-xl border border-border bg-surface/90 p-2.5 text-xs shadow-lg backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Radar</p>
        <p className="tabular-nums text-muted" aria-live="polite">
          {radar.frameTime ? timeFmt.format(new Date(radar.frameTime)) : "—"}
          {latest ? " · latest" : ""}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => radar.setPlaying(!radar.playing)}
          aria-pressed={radar.playing}
          className="rounded-md bg-surface-muted px-2 py-1 font-medium hover:bg-border"
        >
          {radar.playing ? "❚❚ Stop" : "▶ Last 50 min"}
        </button>
        <input
          type="range"
          min={0}
          max={RADAR_FRAMES.length - 1}
          value={radar.frame}
          onChange={(e) => radar.setFrame(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--accent)]"
          aria-label="Radar time, 50 minutes ago to latest"
        />
      </div>

      <div className="mt-2">
        <div className="h-1.5 rounded-full" style={{ background: LEGEND }} aria-hidden />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted">
          <span>Light</span>
          <span>Heavy</span>
          <span>Extreme</span>
        </div>
      </div>
    </section>
  );
}
