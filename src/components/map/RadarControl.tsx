"use client";

import { useState } from "react";
import { RADAR_FRAMES, type RadarState } from "./radar";
import { RADAR_GRADIENT } from "./layerLegend";
import { useIsMobile } from "@/hooks/useIsMobile";

const TZ = "America/Los_Angeles";
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

/** NWS reflectivity palette, light drizzle → intense rain/hail. */
const LEGEND = RADAR_GRADIENT;

/** Phones: sits just above the bottom sheet. Desktop: above the map credits. */
// Hidden while the phone sheet is fully open: there is no map left to sit on.
const POSITION = "absolute left-3 z-10 bottom-[calc(var(--sheet-h,0px)+0.75rem)] md:bottom-9 group-data-[sheet=full]:hidden";

export function RadarControl({ radar }: { radar: RadarState }) {
  const compact = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const latest = radar.frame === RADAR_FRAMES.length - 1;
  const time = radar.frameTime ? timeFmt.format(new Date(radar.frameTime)) : "—";

  // Phones start collapsed to a pill so the radar card doesn't cover the map.
  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        aria-label={`Radar, ${time}${latest ? ", latest" : ""}. Show radar controls`}
        className={`${POSITION} flex h-9 items-center gap-2 rounded-full border border-border bg-surface/95 px-3 text-xs font-semibold shadow-lg backdrop-blur`}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEGEND }} aria-hidden />
        Radar <span className="font-normal tabular-nums text-muted">{time}</span>
        {radar.playing && <span className="text-accent" aria-hidden>▶</span>}
      </button>
    );
  }

  return (
    <section
      aria-label="Weather radar"
      className={`${POSITION} w-56 rounded-xl border border-border bg-surface/90 p-2.5 text-xs shadow-lg backdrop-blur`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Radar</p>
        <p className="tabular-nums text-muted" aria-live="polite">
          {radar.frameTime ? timeFmt.format(new Date(radar.frameTime)) : "—"}
          {latest ? " · latest" : ""}
        </p>
        {compact && (
          <button type="button" onClick={() => setExpanded(false)} aria-label="Hide radar controls" className="-m-1 p-1 text-muted">
            ✕
          </button>
        )}
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
