"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Map as MlMap, RasterTileSource } from "maplibre-gl";

/**
 * NWS NEXRAD base-reflectivity mosaic, tiled by the Iowa Environmental Mesonet.
 * Updated every 5 minutes; past frames are published as "-mNNm" (minutes ago).
 */
const IEM = "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913";
const META = "https://mesonet.agron.iastate.edu/data/gis/images/4326/USCOMP/n0q_0.json";
export const RADAR_FRAMES = [50, 40, 30, 20, 10, 0]; // minutes before the latest scan
const OPACITY = 0.65;
const FIVE_MIN = 5 * 60_000;

const layerId = (i: number) => `radar-${i}`;
const tileUrl = (minutesAgo: number, bust: number) =>
  `${IEM}${minutesAgo ? `-m${String(minutesAgo).padStart(2, "0")}m` : ""}/{z}/{x}/{y}.png?t=${bust}`;

/** Add one raster layer per frame, below the flood alert areas so alerts stay readable. */
export function addRadarLayers(m: MlMap, beforeId: string) {
  const bust = Math.floor(Date.now() / FIVE_MIN);
  RADAR_FRAMES.forEach((minutes, i) => {
    m.addSource(layerId(i), {
      type: "raster",
      tiles: [tileUrl(minutes, bust)],
      tileSize: 256,
      attribution: 'Radar: NWS NEXRAD / <a href="https://mesonet.agron.iastate.edu/">IEM</a>',
    });
    m.addLayer(
      {
        id: layerId(i),
        type: "raster",
        source: layerId(i),
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0, "raster-fade-duration": 0 },
      },
      beforeId,
    );
  });
}

export interface RadarState {
  frame: number;
  playing: boolean;
  /** Time of the frame being shown, ISO */
  frameTime: string | null;
  setPlaying: (p: boolean) => void;
  setFrame: (f: number) => void;
}

/**
 * Shows/hides the radar, swaps frames by opacity (all frames stay loaded so the
 * loop doesn't flicker), and refreshes tiles + scan time every 5 minutes.
 */
export function useRadar(map: RefObject<MlMap | null>, ready: boolean, enabled: boolean): RadarState {
  const last = RADAR_FRAMES.length - 1;
  const [frame, setFrame] = useState(last);
  const [playing, setPlaying] = useState(false);
  const [validTime, setValidTime] = useState<number | null>(null);
  const holdRef = useRef(0);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    RADAR_FRAMES.forEach((_, i) => m.setLayoutProperty(layerId(i), "visibility", enabled ? "visible" : "none"));
  }, [map, ready, enabled]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !enabled) return;
    RADAR_FRAMES.forEach((_, i) => m.setPaintProperty(layerId(i), "raster-opacity", i === frame ? OPACITY : 0));
  }, [map, ready, enabled, frame]);

  // Loop: step through frames, pausing on the latest one.
  useEffect(() => {
    if (!enabled || !playing) return;
    const id = setInterval(() => {
      setFrame((f) => {
        if (f === last && holdRef.current < 2) {
          holdRef.current += 1;
          return f;
        }
        holdRef.current = 0;
        return f === last ? 0 : f + 1;
      });
    }, 600);
    return () => clearInterval(id);
  }, [enabled, playing, last]);

  // Refresh tiles and the latest scan time while the radar is on.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !enabled) return;
    const refresh = async () => {
      const bust = Math.floor(Date.now() / FIVE_MIN);
      RADAR_FRAMES.forEach((minutes, i) =>
        (m.getSource(layerId(i)) as RasterTileSource | undefined)?.setTiles([tileUrl(minutes, bust)]),
      );
      try {
        const meta = (await (await fetch(META, { cache: "no-store" })).json()) as { meta?: { valid?: string } };
        if (meta.meta?.valid) setValidTime(Date.parse(meta.meta.valid));
      } catch {
        /* keep the last known time */
      }
    };
    refresh();
    const id = setInterval(refresh, FIVE_MIN);
    return () => clearInterval(id);
  }, [map, ready, enabled]);

  const frameTime = validTime ? new Date(validTime - RADAR_FRAMES[frame] * 60_000).toISOString() : null;

  return {
    frame,
    playing,
    frameTime,
    setPlaying: (p) => {
      setPlaying(p);
      if (!p) setFrame(last);
    },
    setFrame: (f) => {
      setPlaying(false);
      setFrame(f);
    },
  };
}
