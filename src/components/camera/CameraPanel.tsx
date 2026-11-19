"use client";

import { useState } from "react";
import type { Selection, TrafficCamera } from "@/types/flood";
import { BackButton } from "@/components/panel/AlertList";
import { Card, SectionTitle } from "@/components/ui/Badge";
import { CameraTimelapse } from "./CameraTimelapse";
import { LiveVideo } from "./LiveVideo";

export function CameraDetail({ camera, onBack }: { camera: TrafficCamera; onBack: () => void }) {
  const [live, setLive] = useState(false);
  const meta = [camera.route, camera.direction && `${camera.direction}bound`, camera.nearby, `${camera.county} County`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="space-y-3">
      <BackButton onClick={onBack} />
      <div>
        <h2 className="text-base font-semibold">{camera.name}</h2>
        <p className="text-xs text-muted">{meta}</p>
      </div>
      <CameraTimelapse key={camera.id} imageUrl={camera.imageUrl} name={camera.name} />
      {camera.streamUrl &&
        (live ? (
          <LiveVideo key={camera.streamUrl} src={camera.streamUrl} title={camera.name} />
        ) : (
          <button
            type="button"
            onClick={() => setLive(true)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            ● Watch live video
          </button>
        ))}
      <p className="text-[11px] leading-snug text-muted">
        Caltrans camera. Stills refresh every few minutes. Never stop on a freeway or drive into water to look.
      </p>
    </Card>
  );
}

/** Distance in km between two lat/lon points (haversine). */
function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLon - aLon) / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

interface NearbyProps {
  cameras: TrafficCamera[];
  lat: number;
  lon: number;
  onSelect: (s: Selection) => void;
  radiusKm?: number;
}

/** "Eyes on the ground": closest cameras to a gauge, so people can check conditions visually. */
export function NearbyCameras({ cameras, lat, lon, onSelect, radiusKm = 5 }: NearbyProps) {
  const near = cameras
    .map((c) => ({ c, d: km(lat, lon, c.lat, c.lon) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  if (!near.length) return null;

  return (
    <div>
      <SectionTitle>Nearby traffic cameras</SectionTitle>
      <ul className="grid grid-cols-3 gap-2">
        {near.map(({ c, d }) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect({ type: "camera", id: c.id })}
              className="block w-full text-left focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="block aspect-video overflow-hidden rounded-md bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote camera still */}
                <img src={c.imageUrl} alt={`Camera: ${c.name}`} loading="lazy" className="h-full w-full object-cover" />
              </span>
              <span className="mt-1 line-clamp-2 block text-[10.5px] leading-tight">{c.name}</span>
              <span className="text-[10px] text-muted">{d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
