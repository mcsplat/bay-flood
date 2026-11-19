import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About · Bay Flood Watch",
  description: "Who built Bay Flood Watch, why, where the data comes from, and how to use it responsibly.",
};

const SOURCES = [
  ["National Weather Service", "Flood, flash flood, coastal flood, and surf alerts", "about every 2 minutes"],
  ["NOAA Tides & Currents", "Bay water levels, predicted tides, and flood thresholds", "about every 6 minutes"],
  ["NOAA National Water Prediction Service (USGS gauges)", "Creek and river levels, flood stages, and official river forecasts", "about every 5 minutes"],
  ["Cal OES (mirroring PG&E)", "Active power outages and outage areas", "about every 15 minutes"],
  ["Caltrans", "Traffic camera stills and live video", "every few minutes"],
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        ← Back to the map
      </Link>

      <header className="mt-6 flex items-center gap-4">
        <Image src="/brand/avatar.svg" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl" unoptimized />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">About Bay Flood Watch</h1>
          <p className="text-sm text-muted">Live flood awareness for the San Francisco Bay Area</p>
        </div>
      </header>

      <div
        role="note"
        className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed"
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
          I&apos;m Matt Carter. I built Bay Flood Watch as an independent side project. It isn&apos;t affiliated with
          any government agency, utility, or news organization.
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
