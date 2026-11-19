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
| Power outages (points + footprints) | Cal OES `Power_Outages_(View)` ArcGIS service, mirrored from PG&E's outage map | 5 min (source ~15 min) |

| Rain forecast (8 points, hourly) | NWS gridded forecast `api.weather.gov/gridpoints` | 15 min |

**Outlook (next 48 hours):** `/api/outlook` combines rain, creeks, tides, and alerts with simple, explainable rules: each signal votes *worse*, *better*, or *neutral* and contributes a plain-language reason. It also lists key moments: the Bay-wide rain peak, official river crests, rough "reaches flood stage at the current rate" estimates, risky high tides, and heavy rain overlapping a high tide.

**Gauge trends:** rate of change over the last ~2.5 hours (least-squares slope). Gauges that rise and fall with the tide are detected by correlating each gauge with itself one tidal day (~24.8h) earlier, and are excluded from runoff trends and estimates.

**Tide outlook method:** surge = latest observed minus predicted. Each upcoming high tide is projected as predicted + current surge (a persistence estimate) and classified against the station's NWS/NOS flood thresholds.

## Layout

- `src/lib/api/` server-side fetchers (`'use cache'` + `cacheLife`)
- `src/app/api/*` route handlers the client polls
- `src/types/flood.ts` shared types (for a future Expo app)
- `src/components/` map (MapLibre + CARTO basemap), side panel, SVG charts

## Roadmap

1. ~~PG&E outages~~ (done)
2. Resources: FEMA open shelters (service was returning 504s on 2026-11-18), curated sandbag stations, Genasys evacuation zones
3. County creek networks (Valley Water ALERT, OneShoreline, Marin, Sonoma, Alameda)
4. Rain: MRMS radar, WPC excessive-rainfall outlook, CW3E atmospheric river scale
5. User reports (photo + depth + confirmations), then 311 / CHP / 511 / social feeds
6. Push alerts for a saved address

Not an official warning service.
