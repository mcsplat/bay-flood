# Bay Flood Watch

Live flood awareness for the San Francisco Bay Area: what is flooding now, and what the next 72 hours look like.

```bash
npm install   # also copies MapLibre's worker into public/maplibre/
npm run dev
```

## Data layers (MVP)

| Layer | Source | Refresh |
|---|---|---|
| Flood, coastal, and surf alerts | NWS `api.weather.gov/alerts` (filtered to 10 Bay Area counties; zone-based alerts merged from zone shapes) | 2 min |
| Bay water level, surge, 72h outlook | NOAA CO-OPS Tides & Currents (SF, Richmond, Alameda, Redwood City, Port Chicago). Flood thresholds come from the station's `floodlevels`, converted from STND to MLLW | 6 min |
| Creek and river gauges, river forecasts | NOAA NWPS `api.water.noaa.gov/nwps/v1` (mostly USGS gauges) | 5 min |

**Tide outlook method:** surge = latest observed minus predicted. Each upcoming high tide is projected as predicted + current surge (a persistence estimate) and classified against the station's NWS/NOS flood thresholds.

## Layout

- `src/lib/api/` server-side fetchers (`'use cache'` + `cacheLife`)
- `src/app/api/*` route handlers the client polls
- `src/types/flood.ts` shared types (for a future Expo app)
- `src/components/` map (MapLibre + CARTO basemap), side panel, SVG charts

## Roadmap

1. PG&E outages via Cal OES statewide outage ArcGIS layer
2. Resources: FEMA open shelters, curated sandbag stations, Genasys evacuation zones
3. County creek networks (Valley Water ALERT, OneShoreline, Marin, Sonoma, Alameda)
4. Rain: MRMS radar, WPC excessive-rainfall outlook, CW3E atmospheric river scale
5. User reports (photo + depth + confirmations), then 311 / CHP / 511 / social feeds
6. Push alerts for a saved address

Not an official warning service.
