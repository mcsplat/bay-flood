"use client";

import { useEffect, useRef, useState } from "react";
import { CAMERA_COLOR, OUTAGE_COLOR, type LayerKey } from "./layers";
import { cn } from "@/lib/format";
import { useIsMobile } from "@/hooks/useIsMobile";

const OPTIONS: { key: LayerKey; label: string; swatch: string }[] = [
  { key: "alerts", label: "NWS alerts", swatch: "#dc2626" },
  { key: "gauges", label: "Creek gauges", swatch: "#14b8a6" },
  { key: "tides", label: "Bay tides", swatch: "#0284c7" },
  { key: "outages", label: "Power outages", swatch: OUTAGE_COLOR },
  { key: "cameras", label: "Traffic cams", swatch: CAMERA_COLOR },
  { key: "radar", label: "Radar", swatch: "#02fd02" },
];

interface Props {
  layers: Record<LayerKey, boolean>;
  onChange: (next: Record<LayerKey, boolean>) => void;
}

/** Desktop: a bar of layer toggles. Phones: one round "Layers" button that opens the list. */
export function LayerToggles(props: Props) {
  return useIsMobile() ? <LayerMenu {...props} /> : <LayerBar {...props} />;
}

function LayerBar({ layers, onChange }: Props) {
  return (
    <fieldset className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface/90 p-1.5 shadow-lg backdrop-blur">
      <legend className="sr-only">Map layers</legend>
      {OPTIONS.map((o) => {
        const on = layers[o.key];
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange({ ...layers, [o.key]: !on })}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              on ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            <span className={cn("h-2.5 w-2.5 rounded-sm", !on && "opacity-30")} style={{ background: o.swatch }} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}

function LayerMenu({ layers, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const activeCount = OPTIONS.filter((o) => layers[o.key]).length;

  // Close when tapping anywhere outside the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={root} className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Map layers, ${activeCount} of ${OPTIONS.length} on`}
        className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface/95 text-foreground shadow-lg backdrop-blur"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
          <path d="M12 3 2 8l10 5 10-5-10-5Z" />
          <path d="m2 13 10 5 10-5" />
          <path d="m2 17.5 10 5 10-5" opacity=".5" />
        </svg>
      </button>
      {open && (
        <fieldset className="w-52 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-xl backdrop-blur">
          <legend className="sr-only">Map layers</legend>
          {OPTIONS.map((o) => {
            const on = layers[o.key];
            return (
              <button
                key={o.key}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange({ ...layers, [o.key]: !on })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-surface-muted"
              >
                <span className={cn("h-3 w-3 rounded-sm", !on && "opacity-30")} style={{ background: o.swatch }} aria-hidden />
                <span className={cn("flex-1", !on && "text-muted")}>{o.label}</span>
                <span
                  className={cn("relative h-5 w-9 rounded-full transition-colors", on ? "bg-accent" : "bg-border")}
                  aria-hidden
                >
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
                </span>
              </button>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
