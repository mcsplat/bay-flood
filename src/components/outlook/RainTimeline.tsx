"use client";

import type { OutlookMoment, TimePoint } from "@/types/flood";
import { CATEGORY_COLOR } from "@/lib/categories";
import { useNow } from "@/hooks/useNow";

const W = 360;
const H = 92;
const PAD = { top: 14, right: 6, bottom: 18, left: 26 };
const HOUR = 3_600_000;
const TZ = "America/Los_Angeles";
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });

interface Props {
  rain: TimePoint[];
  moments: OutlookMoment[];
}

/**
 * Next 48 hours at a glance: Bay-average rain as bars, with markers for risky high tides,
 * river crests, and possible flood-stage crossings along the top.
 */
export function RainTimeline({ rain, moments }: Props) {
  const now = useNow();
  const x0 = now - HOUR;
  const x1 = now + 48 * HOUR;
  const bars = rain.filter((p) => Date.parse(p.t) >= x0 && Date.parse(p.t) < x1);
  const maxRate = Math.max(0.1, ...bars.map((b) => b.v));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const sx = (t: number) => PAD.left + ((t - x0) / (x1 - x0)) * innerW;
  const barW = innerW / 49 - 0.6;

  const midnights: number[] = [];
  for (let t = Math.ceil(x0 / HOUR) * HOUR; t < x1; t += HOUR) if (Number(hourFmt.format(t)) % 24 === 0) midnights.push(t);
  const markers = moments.filter((m) => m.kind !== "rain" && Date.parse(m.time) >= x0 && Date.parse(m.time) <= x1);
  const total = bars.reduce((s, b) => s + b.v, 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Bay Area average rain forecast, next 48 hours: about ${total.toFixed(2)} inches total`}>
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} stroke="var(--border)" strokeDasharray="1 3" />
        <text x={PAD.left - 3} y={PAD.top + 3} fontSize={8} fill="var(--muted)" textAnchor="end">{maxRate.toFixed(2)}</text>
        <text x={PAD.left - 3} y={PAD.top + 12} fontSize={7} fill="var(--muted)" textAnchor="end">in/hr</text>
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--border)" />

        {bars.map((b) => {
          const h = (b.v / maxRate) * innerH;
          const heavy = b.v >= 0.15;
          return (
            <rect
              key={b.t}
              x={sx(Date.parse(b.t))}
              y={H - PAD.bottom - h}
              width={Math.max(barW, 1)}
              height={h}
              rx={1}
              fill={heavy ? "#2563eb" : "#60a5fa"}
              opacity={0.9}
            />
          );
        })}

        {midnights.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--border)" strokeDasharray="2 3" />
            <text x={sx(t) + 2} y={H - 5} fontSize={8} fill="var(--muted)">{dayFmt.format(t)}</text>
          </g>
        ))}

        {markers.map((m, i) => {
          const x = sx(Date.parse(m.time));
          const color = CATEGORY_COLOR[m.severity];
          return m.kind === "tide" ? (
            <path key={i} d={`M${x - 4},${PAD.top - 2} L${x + 4},${PAD.top - 2} L${x},${PAD.top - 9} Z`} fill={color}>
              <title>{m.title}</title>
            </path>
          ) : (
            <circle key={i} cx={x} cy={PAD.top - 6} r={3.5} fill={color} stroke="var(--surface)" strokeWidth={1}>
              <title>{m.title}</title>
            </circle>
          );
        })}

        <line x1={sx(now)} x2={sx(now)} y1={PAD.top - 10} y2={H - PAD.bottom} stroke="var(--foreground)" opacity={0.55} />
        <text x={sx(now) + 2} y={H - 5} fontSize={8} fontWeight={600} fill="var(--foreground)">now</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#60a5fa]" aria-hidden />Rain (Bay average)</span>
        <span className="inline-flex items-center gap-1"><span className="text-[9px]" aria-hidden>▲</span>Risky high tide</span>
        <span className="inline-flex items-center gap-1"><span aria-hidden>●</span>River crest / flood stage</span>
        <span className="ml-auto tabular-nums">~{total.toFixed(2)} in next 48h</span>
      </figcaption>
    </figure>
  );
}
