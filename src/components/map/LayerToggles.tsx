"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerKey } from "./layers";
import { LAYER_INFO as OPTIONS, LayerGlyph, LayerKeyDetail } from "./layerLegend";
import { cn } from "@/lib/format";
import { useIsMobile } from "@/hooks/useIsMobile";

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
            <span className={cn("flex", !on && "opacity-40 grayscale")}>
              <LayerGlyph layer={o.key} size={14} />
            </span>
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
        <fieldset
          className="w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface/95 p-1.5 shadow-xl backdrop-blur"
          // Never run under the bottom sheet: the menu scrolls instead.
          style={{ maxHeight: "calc(100dvh - var(--sheet-h, 0px) - 5.5rem - env(safe-area-inset-top))" }}
        >
          <legend className="sr-only">Map layers and key</legend>
          <div className="flex items-center justify-between px-3 pb-1 pt-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Map layers</p>
            <button type="button" onClick={() => setOpen(false)} className="-mr-1 rounded-md px-2 py-1 text-sm font-semibold text-accent">
              Done
            </button>
          </div>
          {OPTIONS.map((o) => {
            const on = layers[o.key];
            return (
              <div key={o.key} className={cn("rounded-xl", on && "bg-surface-muted/60")}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${o.label}: ${o.description}`}
                  onClick={() => onChange({ ...layers, [o.key]: !on })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                >
                  <span className={cn("flex flex-none", !on && "opacity-40 grayscale")}>
                    <LayerGlyph layer={o.key} size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-medium", !on && "text-muted")}>{o.label}</span>
                    <span className="block text-[11px] leading-snug text-muted">{o.description}</span>
                  </span>
                  <span className={cn("relative h-5 w-9 flex-none rounded-full transition-colors", on ? "bg-accent" : "bg-border")} aria-hidden>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
                  </span>
                </button>
                {on && (
                  <div className="pb-2.5 pl-[3.125rem] pr-3">
                    <LayerKeyDetail layer={o.key} />
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
