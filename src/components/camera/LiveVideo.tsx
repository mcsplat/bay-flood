"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Plays a Caltrans HLS stream. Safari plays HLS natively; other browsers load
 * hls.js on demand so it never ships in the main bundle.
 */
export function LiveVideo({ src, title }: { src: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let destroy: (() => void) | undefined;
    let cancelled = false;

    const onPlaying = () => setStatus("playing");
    el.addEventListener("playing", onPlaying);

    (async () => {
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = src;
      } else {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) return setStatus("error");
        const hls = new Hls({ lowLatencyMode: true });
        hls.on(Hls.Events.ERROR, (_e, data) => data.fatal && setStatus("error"));
        hls.loadSource(src);
        hls.attachMedia(el);
        destroy = () => hls.destroy();
      }
      el.play().catch(() => {
        /* autoplay can be blocked; controls stay available */
      });
    })();

    return () => {
      cancelled = true;
      el.removeEventListener("playing", onPlaying);
      destroy?.();
    };
  }, [src]);

  if (status === "error") {
    return (
      <p className="rounded-lg bg-surface-muted px-3 py-6 text-center text-xs text-muted">
        Live video is unavailable for this camera right now. The still images above still update.
      </p>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
      <video ref={video} className="h-full w-full" muted playsInline controls aria-label={`Live video: ${title}`} />
      {status === "loading" && (
        <span className="absolute inset-0 grid place-items-center text-xs text-white/80">Connecting to live video…</span>
      )}
    </div>
  );
}
