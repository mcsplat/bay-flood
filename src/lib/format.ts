import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "America/Los_Angeles";

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const mins = Math.round((Date.parse(iso) - now) / 60_000);
  const abs = Math.abs(mins);
  const span = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} hr` : `${Math.round(abs / 1440)} days`;
  if (abs < 1) return "now";
  return mins > 0 ? `in ${span}` : `${span} ago`;
}

export function formatFeet(v: number | null | undefined, digits = 1): string {
  return v == null ? "—" : `${v.toFixed(digits)} ft`;
}

export function signedFeet(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} ft`;
}

/** "↑ Rising 0.42 ft/hr", "≈ Tidal (rises and falls with the tide)", etc. */
export function trendLabel(trend: import("@/types/flood").GaugeTrend | null | undefined): string | null {
  if (!trend) return null;
  if (trend.tidal) return "≈ Tidal: rises and falls with the tide";
  const rate = Math.abs(trend.ratePerHour).toFixed(2);
  if (trend.direction === "rising") return `↑ Rising ${rate} ft/hr`;
  if (trend.direction === "falling") return `↓ Falling ${rate} ft/hr`;
  return "→ Steady";
}
