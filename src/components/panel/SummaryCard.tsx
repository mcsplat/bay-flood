import type { FloodAlert, GaugeSummary, TideStationReport } from "@/types/flood";
import { ALERT_RANK, CATEGORY_COLOR, CATEGORY_LABEL, rank, worst } from "@/lib/categories";
import { formatTime, signedFeet } from "@/lib/format";
import { Card } from "@/components/ui/Badge";

interface Props {
  alerts: FloodAlert[];
  gauges: GaugeSummary[];
  tides: TideStationReport[];
}

/** One-glance "what's happening" headline, in plain language. */
export function SummaryCard({ alerts, gauges, tides }: Props) {
  const warnings = alerts.filter((a) => a.kind === "warning").length;
  const watches = alerts.filter((a) => a.kind === "watch").length;
  const advisories = alerts.filter((a) => a.kind === "advisory").length;
  const elevated = gauges.filter((g) => rank(g.category) >= 1);
  const tideOutlook = worst(...tides.map((t) => t.outlook));
  const maxSurge = Math.max(...tides.map((t) => t.surge ?? 0), 0);
  const nextRisky = tides
    .flatMap((t) => t.extremes.filter((e) => rank(e.category) >= 1).map((e) => ({ ...e, station: t.name })))
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t))[0];

  const topAlert = [...alerts].sort((a, b) => ALERT_RANK[b.kind] - ALERT_RANK[a.kind])[0];
  const headline = topAlert
    ? `${topAlert.event} in effect`
    : elevated.length
      ? "Creeks rising in parts of the Bay Area"
      : "No active flood alerts";

  return (
    <Card className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted">Right now</p>
        <h1 className="text-lg font-semibold leading-snug">{headline}</h1>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Warnings" value={warnings} color={warnings ? "#dc2626" : undefined} />
        <Stat label="Watches" value={watches} color={watches ? "#f97316" : undefined} />
        <Stat label="Advisories" value={advisories} color={advisories ? "#eab308" : undefined} />
        <Stat label="Gauges elevated" value={elevated.length} color={elevated.length ? "#eab308" : undefined} />
        <Stat label="Bay surge" value={signedFeet(maxSurge)} color={maxSurge >= 1 ? "#f97316" : undefined} />
        <Stat label="Tide outlook" value={tideOutlook === "unknown" ? "—" : CATEGORY_LABEL[tideOutlook].split(" ")[0]} color={rank(tideOutlook) >= 1 ? CATEGORY_COLOR[tideOutlook] : undefined} />
      </dl>
      {nextRisky && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] leading-snug">
          <span className="font-semibold">Next risky high tide:</span> {nextRisky.station}, {formatTime(nextRisky.t)}, about{" "}
          {nextRisky.projected.toFixed(1)} ft if today&apos;s surge holds.
        </p>
      )}
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg bg-surface-muted px-2 py-2">
      <dd className="text-base font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </dd>
      <dt className="text-[10.5px] leading-tight text-muted">{label}</dt>
    </div>
  );
}
