import Image from "next/image";
import { cn } from "@/lib/format";

interface Props {
  /** "light" for use on the navy brand band, "auto" to follow the page theme */
  tone?: "light" | "auto";
  size?: "sm" | "md";
  tagline?: string;
  className?: string;
}

/** Logo + "Bay Flood Watch" wordmark: "Bay" set lighter, "Flood Watch" bold. */
export function Wordmark({ tone = "auto", size = "sm", tagline, className }: Props) {
  const icon = size === "md" ? 44 : 32;
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand/avatar.svg"
        alt=""
        width={icon}
        height={icon}
        className={cn("shrink-0 rounded-[10px] shadow-sm", tone === "light" && "ring-1 ring-white/15")}
        priority
        unoptimized
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "tracking-tight",
            size === "md" ? "text-2xl" : "text-[17px]",
            tone === "light" ? "text-white" : "text-foreground",
          )}
        >
          <span className="font-light opacity-90">Bay </span>
          <span className="font-bold">Flood Watch</span>
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-1 text-[10.5px] font-medium uppercase tracking-[0.12em]",
              tone === "light" ? "text-brand-foam/80" : "text-muted",
            )}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

/** Soft double wave used as the bottom edge of brand bands, echoing the logo's water. */
export function WaveEdge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 14" preserveAspectRatio="none" className={cn("block h-3.5 w-full", className)} aria-hidden>
      <path d="M0 6 Q 50 0 100 6 T 200 6 T 300 6 T 400 6 V14 H0 Z" fill="var(--brand-water)" opacity="0.35" />
      <path d="M0 9 Q 50 4 100 9 T 200 9 T 300 9 T 400 9 V14 H0 Z" fill="var(--background)" />
    </svg>
  );
}
