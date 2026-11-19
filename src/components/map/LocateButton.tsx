"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { cn } from "@/lib/format";

type MapLib = typeof import("maplibre-gl");
type Status = "idle" | "locating" | "located" | "error";

/** Rough Bay Area envelope (same as the data sources): Santa Rosa → Santa Cruz, Bodega → Brentwood. */
const BAY = { west: -123.3, south: 36.9, east: -121.4, north: 38.8 };
const inBayArea = (lon: number, lat: number) =>
  lon >= BAY.west && lon <= BAY.east && lat >= BAY.south && lat <= BAY.north;

export interface LocateState {
  supported: boolean;
  status: Status;
  message: string | null;
  locate: () => void;
  dismiss: () => void;
}

/**
 * "Use my location": asks the browser once, flies the map there, and drops a
 * "you are here" dot. The position stays in the browser and is never sent anywhere.
 */
export function useLocate(map: RefObject<MlMap | null>, ml: RefObject<MapLib | null>, ready: boolean): LocateState {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const marker = useRef<Marker | null>(null);

  useEffect(() => {
    // Detect after mount so server and client render the same markup.
    const id = requestAnimationFrame(() => setSupported("geolocation" in navigator));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(
    () => () => {
      marker.current?.remove();
    },
    [],
  );

  const locate = () => {
    const m = map.current;
    const lib = ml.current;
    if (!ready || !m || !lib || !("geolocation" in navigator)) return;
    setStatus("locating");
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lngLat: [number, number] = [coords.longitude, coords.latitude];
        if (!marker.current) {
          const el = document.createElement("div");
          el.setAttribute("role", "img");
          el.setAttribute("aria-label", "Your location");
          el.className = "user-location-dot";
          marker.current = new lib.Marker({ element: el });
        }
        marker.current.setLngLat(lngLat).addTo(m);
        m.flyTo({ center: lngLat, zoom: Math.max(m.getZoom(), 12.5), speed: 1.6 });
        setStatus("located");
        setMessage(
          inBayArea(...lngLat)
            ? null
            : "You're outside the Bay Area. This map only covers Bay Area flood data.",
        );
      },
      (err) => {
        setStatus("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for this site. Allow it in your browser or phone settings, then try again."
            : err.code === err.TIMEOUT
              ? "Finding your location took too long. Try again, ideally with Wi-Fi or GPS on."
              : "Your location isn't available right now. Try again in a moment.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  return { supported, status, message, locate, dismiss: () => setMessage(null) };
}

export function LocateButton({ state }: { state: LocateState }) {
  if (!state.supported) return null;
  const { status, message, locate, dismiss } = state;
  const busy = status === "locating";

  return (
    <div className="absolute right-3 top-[calc(5.5rem+env(safe-area-inset-top))] z-10 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        aria-label={busy ? "Finding your location" : "Use my location"}
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur transition-colors",
          "hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait",
          status === "located" ? "text-accent" : "text-foreground",
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={busy ? "animate-spin" : undefined}>
          <circle cx="12" cy="12" r="4" fill={status === "located" ? "currentColor" : "none"} />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8" />
        </svg>
        {busy ? "Finding you…" : "Use my location"}
      </button>
      {message && (
        <p
          role="status"
          className="flex max-w-[15rem] items-start gap-2 rounded-xl border border-border bg-surface/95 px-3 py-2 text-xs leading-snug shadow-lg backdrop-blur"
        >
          <span className="flex-1">{message}</span>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="-m-0.5 p-0.5 text-muted hover:text-foreground">
            ✕
          </button>
        </p>
      )}
    </div>
  );
}
