import type { AlertKind, FloodCategory } from "@/types/flood";
import { ALERT_COLOR, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/categories";
import { cn } from "@/lib/format";

export function CategoryBadge({ category, className }: { category: FloodCategory; className?: string }) {
  return <Pill color={CATEGORY_COLOR[category]} label={CATEGORY_LABEL[category]} className={className} />;
}

export function AlertKindBadge({ kind }: { kind: AlertKind }) {
  return <Pill color={ALERT_COLOR[kind]} label={kind[0].toUpperCase() + kind.slice(1)} />;
}

function Pill({ color, label, className }: { color: string; label: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}
      style={{ color, backgroundColor: `${color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-border bg-surface p-4", className)}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-muted", className)} aria-hidden />;
}
