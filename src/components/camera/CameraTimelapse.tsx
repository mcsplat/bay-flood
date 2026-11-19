"use client";

import { useEffect, useMemo, useState } from "react";
import { cameraFrames, freshImage } from "@/lib/cameraImages";
import { useNow } from "@/hooks/useNow";

interface Props {
  imageUrl: string;
  name: string;
}

/**
 * Steps through Caltrans' 12 previous stills plus the current one, so you can
 * see whether water or traffic is changing. Frames that fail to load are skipped.
 */
export function CameraTimelapse({ imageUrl, name }: Props) {
  const now = useNow(60_000);
  const frames = useMemo(() => cameraFrames(imageUrl).map((u) => freshImage(u, now)), [imageUrl, now]);
  const [index, setIndex] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Preload every frame so playback doesn't flicker.
  useEffect(() => {
    frames.forEach((src, i) => {
      const img = new Image();
      img.onerror = () => setBroken((b) => new Set(b).add(i));
      img.src = src;
    });
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIndex((i) => {
        let next = (i + 1) % frames.length;
        while (broken.has(next) && next !== frames.length - 1) next = (next + 1) % frames.length;
        return next;
      });
    }, 450);
    return () => clearInterval(id);
  }, [playing, frames.length, broken]);

  const latest = index === frames.length - 1;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-muted">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-surface-muted" aria-hidden />}
        {/* eslint-disable-next-line @next/next/no-img-element -- remote, frequently changing camera stills */}
        <img
          src={frames[index]}
          alt={`${name}, ${latest ? "latest image" : `${frames.length - 1 - index} frames ago`}`}
          className="h-full w-full object-cover"
          onLoad={() => setLoaded(true)}
        />
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {latest ? "LATEST" : `−${frames.length - 1 - index} frames`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium hover:bg-border"
          aria-pressed={playing}
        >
          {playing ? "❚❚ Pause" : "▶ Play recent"}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
          className="flex-1 accent-[var(--accent)]"
          aria-label="Choose frame, oldest to latest"
        />
      </div>
    </div>
  );
}
