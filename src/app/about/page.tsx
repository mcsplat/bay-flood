import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark, WaveEdge } from "@/components/brand/Wordmark";

export const metadata: Metadata = {
  title: "About · Bay Flood Watch",
  description: "Who built Bay Flood Watch, why, where the data comes from, and how to use it responsibly.",
};

const REPO = "https://github.com/mcsplat/bay-flood";
const LINKEDIN = "https://www.linkedin.com/in/matthewecarter/";

const SOURCES = [
  ["National Weather Service", "Flood, flash flood, coastal flood, and surf alerts", "about every 2 minutes"],
  ["NOAA Tides & Currents", "Bay water levels, predicted tides, and flood thresholds", "about every 6 minutes"],
  ["NOAA National Water Prediction Service (USGS gauges)", "Creek and river levels, flood stages, and official river forecasts", "about every 5 minutes"],
  ["Cal OES (mirroring PG&E)", "Active power outages and outage areas", "about every 15 minutes"],
  ["Caltrans", "Traffic camera stills and live video", "every few minutes"],
] as const;

export default function AboutPage() {
  return (
    <main className="w-full">
      <div className="bg-gradient-to-br from-brand-navy to-brand-deep pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto max-w-2xl px-4 pb-6 pt-8 sm:pt-12">
          <Link href="/" className="text-sm font-medium text-brand-foam hover:text-white">
            ← Back to the map
          </Link>
          <h1 className="mt-6">
            <Wordmark tone="light" size="md" tagline="About this project" />
          </h1>
        </div>
        <WaveEdge />
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-14">

      <div
        role="note"
        className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed"
      >
        <p className="font-semibold">Informative, not authoritative</p>
        <p className="mt-1">
          Bay Flood Watch pulls together public data so you can see what&apos;s happening in one place. It is not an
          official warning service and it can be wrong, late, or incomplete. Feeds go down, sensors fail, and
          forecasts and trend estimates are only estimates. Always follow evacuation orders and instructions from
          local officials, and call 911 in an emergency.
        </p>
      </div>

      <Section title="Who I am">
        <p>
          I&apos;m{" "}
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Matt Carter
          </a>
          . I built Bay Flood Watch as an independent side project. It isn&apos;t affiliated with any government
          agency, utility, or news organization.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Connect on LinkedIn<span className="sr-only"> (opens in a new tab)</span> ↗
          </a>
        </p>
      </Section>

      <Section title="Why I built this">
        <p>
          When a big storm rolls through the Bay Area, the information you need is scattered: weather alerts in one
          place, creek gauges in another, tide tables somewhere else, outage maps and traffic cameras on yet more
          sites. Wildfire season has apps that pull everything into a single, live picture. Flooding deserved the
          same.
        </p>
        <p>
          The goal is simple: help people see what&apos;s happening right now, and which way things are heading, so
          they can make better decisions about where to go and when to stay put.
        </p>
      </Section>

      <Section title="Where the data comes from">
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {SOURCES.map(([name, what, how]) => (
            <li key={name} className="px-4 py-3">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-sm text-muted">
                {what} · refreshed {how}
              </p>
            </li>
          ))}
        </ul>
        <p>
          Estimates such as projected high tides and trend directions are calculated by this app from that data. They
          are labeled as estimates wherever they appear.
        </p>
      </Section>

      <Section title="Use it responsibly">
        <ul className="list-disc space-y-1 pl-5">
          <li>Never drive or walk into flood water. Six inches of moving water can knock you down; a foot can float a car.</li>
          <li>Don&apos;t stop on a freeway or near flood water to check a traffic camera in person.</li>
          <li>Treat downed power lines as live, and stay out of standing water near them.</li>
          <li>Sign up for your county&apos;s official emergency alerts; this app does not replace them.</li>
        </ul>
      </Section>

      <Section title="Open source">
        <p>
          Bay Flood Watch is open source under the{" "}
          <a href={`${REPO}/blob/main/LICENSE`} className="font-medium text-accent underline-offset-2 hover:underline">
            MIT License
          </a>
          . Anyone can read the code, run it, and build on it.
        </p>
        <p>
          Contributions are encouraged: pull requests, bug reports, and ideas for new data sources (county creek
          sensors, emergency shelters, road closures) all make it more useful for everyone. The{" "}
          <a href={`${REPO}/blob/main/CONTRIBUTING.md`} className="font-medium text-accent underline-offset-2 hover:underline">
            contributing guide
          </a>{" "}
          explains how to get started.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={REPO}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            <GitHubMark />
            View on GitHub
          </a>
          <a
            href={`${REPO}/issues/new/choose`}
            className="inline-flex items-center rounded-lg border border-border px-3.5 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            Report a bug or suggest a source
          </a>
        </div>
      </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
