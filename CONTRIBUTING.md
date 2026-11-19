# Contributing to Bay Flood Watch

Thanks for helping! Bay Flood Watch is a community flood-awareness map for the San Francisco Bay Area. People may look at it during a storm, so **accuracy and clarity matter more than features**.

## Ground rules

- **Never overstate certainty.** Anything the app calculates (projections, trends, "could reach flood stage" estimates) must be labeled as an estimate. Official NWS products are labeled as official.
- **Be kind to upstream services.** Every data source is a free public service. Cache responses (`"use cache"` + `cacheLife`), poll no faster than the source updates, and keep the `User-Agent` in `src/lib/api/http.ts`.
- **No secrets, no tracking.** Don't add API keys to the repo, and don't add analytics or third-party trackers without discussing it in an issue first.
- **Safety copy stays.** Don't remove the "not an official warning service" disclaimers.

## Getting started

Requirements: Node.js 20+ (CI uses 24) and npm.

```bash
git clone https://github.com/mcsplat/bay-flood.git
cd bay-flood
npm install      # also copies MapLibre's worker into public/maplibre/
npm run dev      # http://localhost:3000
```

No API keys or `.env` file are needed; every data source is public.

> This project uses **Next.js 16** with Cache Components. APIs differ from older Next.js versions; the docs bundled in `node_modules/next/dist/docs/` are the source of truth.

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm run build
```

Then:

1. Keep pull requests focused: one feature or fix per PR.
2. Describe what changed and how you verified it (screenshots for UI changes, sample API output for data changes).
3. Test at phone width (375px) and desktop width. Many people will use this on a phone in the rain.
4. If you add a data source, update the table in `README.md` and the list on the About page (`src/app/about/page.tsx`).

## Project layout

```
src/
  app/
    api/<source>/route.ts   Route handlers the client polls
    about/                  About page
    manifest.ts             Installable-app manifest
  lib/
    api/                    Server-side fetchers, one per upstream source ("use cache")
    outlook.ts              48-hour outlook rules
    trends.ts               Gauge trend math (rate of rise, tidal detection)
    categories.ts           Flood categories, colors, labels
  components/
    map/                    MapLibre map, layers, popups, interactions
    panel/                  Side-panel cards
    outlook/                Outlook card and rain timeline
    camera/                 Traffic camera detail, playback, live video
    pwa/                    Service worker registration, install hint
  hooks/                    Shared client hooks
  types/flood.ts            Types shared by server and client
public/
  sw.js                     Service worker (offline support)
```

## Adding a data source

Most contributions will be new data. The pattern every layer follows:

1. **Fetcher** in `src/lib/api/<source>.ts`: fetch with `getJson`, normalize into a type in `src/types/flood.ts`, and wrap in `"use cache"` with a `cacheLife` that matches how often the source updates.
2. **Route** in `src/app/api/<source>/route.ts`: call the fetcher, return JSON, and return a `502` with a friendly message if the upstream fails.
3. **Map layer** in `src/components/map/layers.ts` (+ a popup in `src/components/map/`), registered in `FloodMap.tsx` and `LayerToggles.tsx`.
4. **Panel card** in `src/components/panel/` if it needs a list or detail view.

County creek networks (Valley Water ALERT, OneShoreline, Marin, Sonoma, Alameda) and FEMA open shelters are the most-wanted sources. Open a **Data source request** issue first so we can check the terms of use together.

## Code style

- TypeScript throughout; functional React components with named exports.
- Tailwind for styling, using the CSS variables in `src/app/globals.css` rather than hard-coded colors.
- Keep components under ~200 lines; split into sub-components when they grow.
- Accessibility: semantic elements, `aria-*` labels on icon-only controls, keyboard-reachable interactions.

## Reporting bugs and requesting features

Use the issue templates. **If you're reporting wrong or missing flood data, include the location, time, and a link or screenshot of the official source** so we can compare.

## Code of conduct

Participation is covered by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
