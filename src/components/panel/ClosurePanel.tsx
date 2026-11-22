import type { RoadClosure, Selection } from "@/types/flood";
import { closureEnds, closureExtent, closureHeadline, closureLanes } from "@/lib/closures";
import { formatRelative, formatTime } from "@/lib/format";
import { CLOSURE_FILL, CLOSURE_STORM_FILL } from "@/components/map/mapIcons";
import { BackButton } from "./AlertList";
import { Card, SectionTitle } from "@/components/ui/Badge";

const colorOf = (c: RoadClosure) => (c.stormRelated ? CLOSURE_STORM_FILL : CLOSURE_FILL);

function Diamond({ color, size = 12 }: { color: string; size?: number }) {
  return <span className="inline-block flex-none rotate-45 rounded-[2px]" style={{ width: size * 0.75, height: size * 0.75, background: color }} aria-hidden />;
}

/** Overview card: storm-related and full highway closures in effect now. */
export function ClosureSummary({ closures, onSelect }: { closures: RoadClosure[]; onSelect: (s: Selection) => void }) {
  const storm = closures.filter((c) => c.stormRelated);
  const shown = [...storm, ...closures.filter((c) => !c.stormRelated && c.full)].slice(0, 6);

  return (
    <Card>
      <SectionTitle>Highway closures</SectionTitle>
      <p className="text-sm">
        {storm.length > 0 ? (
          <>
            <span className="font-semibold" style={{ color: CLOSURE_STORM_FILL }}>
              {storm.length} closed by flooding or storm damage
            </span>{" "}
            · {closures.length} closures in effect
          </>
        ) : (
          <>No closures from flooding or storms right now · {closures.length} roadwork closures in effect</>
        )}
      </p>
      {shown.length > 0 && (
        <ul className="-mx-2 mt-2 divide-y divide-border">
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect({ type: "closure", id: c.id })}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="mt-1.5">
                  <Diamond color={colorOf(c)} />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="font-medium">{closureHeadline(c)}</span>
                  <span className="block truncate text-xs text-muted">
                    {c.reason} · {closureExtent(c)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted">
        Source: Caltrans lane closures, state highways and bridges only. City and county roads aren&apos;t included.
      </p>
    </Card>
  );
}

export function ClosureDetail({ closure: c, onBack }: { closure: RoadClosure; onBack: () => void }) {
  const rows: [string, string][] = [
    ["Lanes", closureLanes(c)],
    ["Reason", c.reason],
    ["Where", [c.facility, c.nearby, c.county].filter(Boolean).join(" · ")],
    ["In place since", c.started ? `${formatTime(c.started)} (${formatRelative(c.started)})` : "—"],
    ["Expected to reopen", closureEnds(c)],
  ];
  if (c.delayMinutes) rows.push(["Expected delay", `About ${c.delayMinutes} min`]);

  return (
    <Card className="space-y-3">
      <BackButton onClick={onBack} />
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Diamond color={colorOf(c)} size={14} />
          {closureHeadline(c)}
        </h2>
        <p className="mt-0.5 text-sm text-muted">{closureExtent(c)}</p>
      </div>
      {c.stormRelated && (
        <p className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: `${CLOSURE_STORM_FILL}18`, color: CLOSURE_STORM_FILL }}>
          Closed because of {c.reason.toLowerCase()}. Turn around, don&apos;t drown: 6 inches of fast-moving water can knock over an adult, and 12 inches can carry away most cars.
        </p>
      )}
      <dl className="space-y-1.5 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-snug text-muted">
        From the Caltrans lane closure system. Check{" "}
        <a href="https://quickmap.dot.ca.gov/" target="_blank" rel="noreferrer" className="underline">
          Caltrans QuickMap
        </a>{" "}
        or call 511 before you go.
      </p>
    </Card>
  );
}
