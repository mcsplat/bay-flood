"use client";

import type { LayerKey } from "./layers";
import { cn } from "@/lib/format";

const OPTIONS: { key: LayerKey; label: string; swatch: string }[] = [
  { key: "alerts", label: "NWS alerts", swatch: "#dc2626" },
  { key: "gauges", label: "Creek gauges", swatch: "#14b8a6" },
  { key: "tides", label: "Bay tides", swatch: "#0284c7" },
];

interface Props {
  layers: Record<LayerKey, boolean>;
  onChange: (next: Record<LayerKey, boolean>) => void;
}

export function LayerToggles({ layers, onChange }: Props) {
  return (
    <fieldset className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface/90 p-1.5 shadow-lg backdrop-blur">
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
