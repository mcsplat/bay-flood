"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Snap = "peek" | "half" | "full";
const ORDER: Snap[] = ["peek", "half", "full"];

interface Props {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  /** Reports the sheet's on-screen height so the map can keep content clear of it. */
  onHeightChange: (px: number) => void;
  /** Always-visible top row (the "peek" content). Dragging it moves the sheet. */
  header: ReactNode;
  children: ReactNode;
}

const PEEK = 96; // px, plus the home-indicator inset
const TOP_GAP = 56; // px of map left visible above the sheet when full
const FLICK = 0.45; // px/ms: faster than this jumps to the next snap

function heights(vh: number, inset: number): Record<Snap, number> {
  return { peek: PEEK + inset, half: Math.round(vh * 0.5), full: vh - TOP_GAP };
}

/**
 * Phone bottom sheet with three snap points. The map stays full-screen behind it;
 * the header row is the drag handle and doubles as a button for keyboard users.
 */
export function BottomSheet({ snap, onSnapChange, onHeightChange, header, children }: Props) {
  const [vh, setVh] = useState(0);
  const [inset, setInset] = useState(0);
  const [dragH, setDragH] = useState<number | null>(null);
  const justDragged = useRef(false);
  const probe = useRef<HTMLDivElement>(null);

  // Measure the viewport (and the iPhone home-indicator inset) and keep it current.
  useEffect(() => {
    const measure = () => {
      setVh(window.innerHeight);
      setInset(probe.current?.offsetHeight ?? 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const h = vh ? heights(vh, inset) : null;
  const target = h ? h[snap] : null;
  const height = dragH ?? target ?? PEEK;

  useEffect(() => {
    if (target != null && dragH == null) onHeightChange(target);
  }, [target, dragH, onHeightChange]);

  const nearest = (px: number, velocity: number): Snap => {
    if (!h) return snap;
    const idx = ORDER.indexOf(snap);
    if (velocity < -FLICK) return ORDER[Math.min(idx + 1, 2)]; // flicked up
    if (velocity > FLICK) return ORDER[Math.max(idx - 1, 0)]; // flicked down
    return ORDER.reduce((a, b) => (Math.abs(h[b] - px) < Math.abs(h[a] - px) ? b : a));
  };

  // Follow the drag on window, so a fast first move that leaves the header strip still counts.
  // No pointer capture: a plain tap must still reach the handle button.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!h || e.button !== 0) return;
    const sizes = h;
    const d = { y: e.clientY, h: sizes[snap], t: e.timeStamp, moved: false };
    justDragged.current = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dy = ev.clientY - d.y;
      if (!d.moved && Math.abs(dy) > 4) d.moved = true;
      if (d.moved) setDragH(Math.min(sizes.full, Math.max(sizes.peek, d.h - dy)));
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      justDragged.current = d.moved;
      if (!d.moved) return; // a tap: the button's onClick handles it
      const dy = ev.clientY - d.y;
      const next = nearest(d.h - dy, dy / Math.max(ev.timeStamp - d.t, 1));
      setDragH(null);
      onSnapChange(next);
      onHeightChange(sizes[next]);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const cycle = () => onSnapChange(snap === "peek" ? "half" : snap === "half" ? "full" : "half");

  return (
    <section
      aria-label="Flood conditions"
      className="fixed inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl bg-background shadow-[0_-8px_30px_rgb(0_0_0/0.25)] motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out"
      style={{ height, transitionDuration: dragH != null ? "0ms" : undefined }}
    >
      <div ref={probe} aria-hidden className="pointer-events-none absolute h-[env(safe-area-inset-bottom)] w-0" />
      <div
        onPointerDown={onPointerDown}
        className="touch-none select-none bg-gradient-to-br from-brand-navy to-brand-deep text-white"
      >
        <button
          type="button"
          onClick={() => {
            if (justDragged.current) {
              justDragged.current = false;
              return;
            }
            cycle();
          }}
          aria-expanded={snap !== "peek"}
          aria-label={snap === "full" ? "Shrink panel" : "Expand panel"}
          className="flex w-full justify-center pb-1 pt-2 focus-visible:outline-2 focus-visible:outline-brand-foam"
        >
          <span className="h-1.5 w-10 rounded-full bg-white/50" aria-hidden />
        </button>
        {header}
      </div>
      <div className={`min-h-0 flex-1 overscroll-contain ${snap === "peek" && dragH == null ? "overflow-hidden" : "overflow-y-auto"}`}>
        {children}
      </div>
    </section>
  );
}
