"use client";

import { useId } from "react";
import type { TimePoint } from "@/types/flood";
import { useNow } from "@/hooks/useNow";

export interface ChartSeries {
  label: string;
  points: TimePoint[];
  color: string;
  dashed?: boolean;
}

export interface ChartThreshold {
  label: string;
  value: number;
  color: string;
}

interface Props {
  series: ChartSeries[];
  thresholds?: ChartThreshold[];
  unit?: string;
  ariaLabel: string;
  height?: number;
}

const W = 360;
const PAD = { top: 10, right: 8, bottom: 22, left: 34 };
const TZ = "America/Los_Angeles";

const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });

export function TimeSeriesChart({ series, thresholds = [], unit = "ft", ariaLabel, height = 150 }: Props) {
  const clipId = useId();
  const now = useNow();
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) {
    return <p className="py-6 text-center text-sm text-muted">No recent readings</p>;
  }

  const times = all.map((p) => Date.parse(p.t));
  const x0 = Math.min(...times);
  const x1 = Math.max(...times);
  const values = all.map((p) => p.v);
  const sorted = [...thresholds].sort((a, b) => a.value - b.value);
  const dataMax = Math.max(...values);
  // Always show the lowest flood threshold so distance-to-flood is honest.
  const visible = sorted.filter((t, i) => i === 0 || t.value <= dataMax + 2);
  const lo = Math.min(...values, ...visible.map((t) => t.value));
  const hi = Math.max(...values, ...visible.map((t) => t.value));
  const span = hi - lo || 1;
  const y0 = lo - span * 0.08;
  const y1 = hi + span * 0.12;

  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (t: number) => PAD.left + ((t - x0) / (x1 - x0 || 1)) * innerW;
  const sy = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * innerH;

  const path = (pts: TimePoint[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${sx(Date.parse(p.t)).toFixed(1)},${sy(p.v).toFixed(1)}`).join("");

  const yTicks = [0, 0.5, 1].map((f) => y0 + (y1 - y0) * f);
  const dayTicks: number[] = [];
  const start = new Date(x0);
  start.setMinutes(0, 0, 0);
  for (let t = start.getTime(); t <= x1; t += 3_600_000) {
    if (Number(hourFmt.format(t)) % 24 === 0 && t >= x0) dayTicks.push(t);
  }

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} className="w-full overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill="var(--muted)">
              {v.toFixed(0)}
            </text>
          </g>
        ))}
        <text x={4} y={PAD.top + 4} fontSize={9} fill="var(--muted)">{unit}</text>

        {dayTicks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--border)" strokeDasharray="2 3" />
            <text x={sx(t) + 3} y={height - 8} fontSize={9} fill="var(--muted)">{dayFmt.format(t)}</text>
          </g>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {visible.map((t) => (
            <g key={t.label}>
              <line x1={PAD.left} x2={W - PAD.right} y1={sy(t.value)} y2={sy(t.value)} stroke={t.color} strokeWidth={1.25} strokeDasharray="5 3" />
              <text x={W - PAD.right - 2} y={sy(t.value) - 3} textAnchor="end" fontSize={9} fill={t.color} fontWeight={600}>
                {t.label} {t.value.toFixed(1)}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <path key={s.label} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2.25} strokeDasharray={s.dashed ? "4 3" : undefined} strokeLinejoin="round" />
          ))}
        </g>

        {now > x0 && now < x1 && (
          <g>
            <line x1={sx(now)} x2={sx(now)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--foreground)" strokeWidth={1} opacity={0.6} />
            <text x={sx(now)} y={PAD.top - 2} textAnchor="middle" fontSize={9} fill="var(--foreground)" fontWeight={600}>now</text>
          </g>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <svg width="16" height="4" aria-hidden>
              <line x1="0" x2="16" y1="2" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
            </svg>
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
