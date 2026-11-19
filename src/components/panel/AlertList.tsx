import type { FloodAlert, Selection } from "@/types/flood";
import { ALERT_RANK } from "@/lib/categories";
import { formatRelative, formatTime } from "@/lib/format";
import { AlertKindBadge, Card, SectionTitle } from "@/components/ui/Badge";

interface Props {
  alerts: FloodAlert[];
  onSelect: (s: Selection) => void;
}

export function AlertList({ alerts, onSelect }: Props) {
  const sorted = [...alerts].sort(
    (a, b) => ALERT_RANK[b.kind] - ALERT_RANK[a.kind] || Date.parse(a.ends ?? "") - Date.parse(b.ends ?? ""),
  );
  return (
    <Card>
      <SectionTitle>National Weather Service alerts</SectionTitle>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No flood, coastal, or surf alerts for the Bay Area.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {sorted.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect({ type: "alert", id: a.id })}
                className="w-full rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{a.event}</span>
                  <AlertKindBadge kind={a.kind} />
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">{a.areaDesc}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Until {formatTime(a.ends)} · ends {formatRelative(a.ends)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function AlertDetail({ alert, onBack }: { alert: FloodAlert; onBack: () => void }) {
  return (
    <Card className="space-y-3">
      <BackButton onClick={onBack} />
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{alert.event}</h2>
        <AlertKindBadge kind={alert.kind} />
      </div>
      <p className="text-xs text-muted">
        {alert.sender} · until {formatTime(alert.ends)}
      </p>
      <p className="text-xs text-muted">{alert.areaDesc}</p>
      {alert.instruction && (
        <div className="rounded-lg bg-accent-soft px-3 py-2 text-[13px] leading-relaxed">
          <p className="mb-1 font-semibold">What to do</p>
          <p className="whitespace-pre-line">{alert.instruction}</p>
        </div>
      )}
      <p className="whitespace-pre-line text-[13px] leading-relaxed">{alert.description}</p>
    </Card>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-accent hover:underline">
      ← Back to overview
    </button>
  );
}
