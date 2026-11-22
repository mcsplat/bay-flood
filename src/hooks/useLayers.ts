"use client";

import { useCallback, useEffect, useState } from "react";
import type { LayerKey } from "@/components/map/layers";

type Layers = Record<LayerKey, boolean>;

const KEY = "bfw-layers";
const ALL_ON: Layers = { alerts: true, gauges: true, tides: true, closures: true, outages: true, cameras: true, radar: true };
/** Phones start focused on water: cameras and outages are a tap away in the Layers menu. */
const PHONE_DEFAULT: Layers = { ...ALL_ON, cameras: false, outages: false };

function read(): Partial<Layers> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Layers>) : null;
  } catch {
    return null;
  }
}

/** Map layer switches, remembered per browser. First visit on a phone hides cameras and outages. */
export function useLayers(): [Layers, (next: Layers) => void] {
  const [layers, setLayers] = useState<Layers>(ALL_ON);

  useEffect(() => {
    // Read after mount so the server and first client render match.
    const id = requestAnimationFrame(() => {
      const saved = read();
      const phone = window.matchMedia("(max-width: 767px)").matches;
      setLayers({ ...(phone ? PHONE_DEFAULT : ALL_ON), ...saved });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const update = useCallback((next: Layers) => {
    setLayers(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode or storage blocked: the choice just won't be remembered.
    }
  }, []);

  return [layers, update];
}
