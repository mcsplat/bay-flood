import type { OutageReport, PowerOutage, Selection } from "@/types/flood";
import { formatRelative, formatTime } from "@/lib/format";
import { OUTAGE_COLOR } from "@/components/map/layers";
import { BackButton } from "./AlertList";
import { Card, SectionTitle } from "@/components/ui/Badge";

export function OutageSummary({ report, onSelect }: { report: OutageReport; onSelect: (s: Selection) => void }) {
  const largest = [...report.outages].sort((a, b) => b.customers - a.customers).slice(0, 5);
  const maxCounty = Math.max(...report.byCounty.map((c) => c.customers), 1);

  return (
    <Card>
      <SectionTitle>Power outages</SectionTitle>
      <p className="text-sm">
        <span className="text-lg font-semibold tabular-nums" style={{ color: OUTAGE_COLOR }}>
          {report.totalCustomers.toLocaleString()}
        </span>{" "}
        customers without power across {report.outages.length.toLocaleString()} outages
      </p>

      {report.byCounty.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label="Customers out by county">
          {report.byCounty.map((c) => (
            <li key={c.county} className="grid grid-cols-[96px_1fr_56px] items-center gap-2 text-xs">
              <span className="truncate text-muted">{c.county}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(c.customers / maxCounty) * 100}%`, background: OUTAGE_COLOR }}
                />
              </span>
              <span className="text-right tabular-nums">{c.customers.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {largest.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Largest outages</p>
          <ul className="-mx-2 divide-y divide-border">
            {largest.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ type: "outage", id: o.id })}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="text-sm">
                    <span className="font-medium">{o.county}</span>
                    <span className="block text-xs text-muted">
                      {o.estimatedRestore ? `Restore est. ${formatTime(o.estimatedRestore)}` : "No restore estimate"}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{o.customers.toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-2 text-[11px] text-muted">Source: Cal OES statewide outage map, mirrored from PG&amp;E. Updates about every 15 minutes.</p>
    </Card>
  );
}

export function OutageDetail({ outage, onBack }: { outage: PowerOutage; onBack: () => void }) {
  const rows: [string, string][] = [
    ["Customers affected", outage.customers.toLocaleString()],
    ["Started", `${formatTime(outage.started)} (${formatRelative(outage.started)})`],
    [
      "Estimated restore",
      outage.estimatedRestore ? `${formatTime(outage.estimatedRestore)} (${formatRelative(outage.estimatedRestore)})` : "Not yet estimated",
    ],
    ["Cause", outage.cause ?? "Under investigation"],
    ["County", outage.county],
    ["Incident", outage.id],
  ];
  return (
    <Card className="space-y-3">
      <BackButton onClick={onBack} />
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span style={{ color: OUTAGE_COLOR }} aria-hidden>⚡</span>
        {outage.utility} power outage
      </h2>
      <dl className="space-y-1.5 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-snug text-muted">
        Treat downed lines as live and stay out of standing water near them. Report hazards to PG&amp;E at 1-800-743-5000.
      </p>
    </Card>
  );
}
