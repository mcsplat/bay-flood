import Link from "next/link";
import { Wordmark, WaveEdge } from "./Wordmark";

interface Props {
  status: string;
  offline: boolean;
}

/** Navy brand band at the top of the side panel: wordmark, data status, About, and live state. */
export function AppHeader({ status, offline }: Props) {
  return (
    <header className="relative bg-gradient-to-br from-brand-navy to-brand-deep text-white">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
        <Link href="/" aria-label="Bay Flood Watch home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-brand-foam">
          <Wordmark tone="light" tagline="SF Bay Area · flood conditions" />
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/about" className="text-xs font-medium text-brand-foam/90 hover:text-white">
            About
          </Link>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              offline ? "bg-white/10 text-brand-foam" : "bg-emerald-400/15 text-emerald-300"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {!offline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${offline ? "bg-slate-300" : "bg-emerald-300"}`} />
            </span>
            {offline ? "Offline" : "Live"}
          </span>
        </div>
      </div>
      <p className="px-4 pb-1 text-[11px] text-brand-foam/75" aria-live="polite">
        {status}
      </p>
      <WaveEdge />
    </header>
  );
}
