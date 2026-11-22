"use client";

import { useMemo } from "react";
import type { FloodAlert, GaugeSummary, Outlook, OutageReport, RoadClosure, TideStationReport, TrafficCamera } from "@/types/flood";
import { usePolling } from "./usePolling";

const MINUTE = 60_000;

/** Every live feed the dashboard shows, polled at the rate its source updates. */
export function useFloodData() {
  const alertsQ = usePolling<{ alerts: FloodAlert[] }>("/api/alerts", 2 * MINUTE);
  const tidesQ = usePolling<{ stations: TideStationReport[] }>("/api/tides", 6 * MINUTE);
  const gaugesQ = usePolling<{ gauges: GaugeSummary[] }>("/api/gauges", 5 * MINUTE);
  const outagesQ = usePolling<OutageReport>("/api/outages", 5 * MINUTE);
  const outlookQ = usePolling<Outlook>("/api/outlook", 10 * MINUTE);
  const closuresQ = usePolling<{ closures: RoadClosure[] }>("/api/closures", 5 * MINUTE);
  const camerasQ = usePolling<{ cameras: TrafficCamera[] }>("/api/cameras", 60 * MINUTE);

  const alerts = useMemo(() => alertsQ.data?.alerts ?? [], [alertsQ.data]);
  const tides = useMemo(() => tidesQ.data?.stations ?? [], [tidesQ.data]);
  const gauges = useMemo(() => gaugesQ.data?.gauges ?? [], [gaugesQ.data]);
  const cameras = useMemo(() => camerasQ.data?.cameras ?? [], [camerasQ.data]);
  const closures = useMemo(() => closuresQ.data?.closures ?? [], [closuresQ.data]);

  return {
    alerts,
    tides,
    gauges,
    cameras,
    closures,
    closuresLoaded: closuresQ.data != null,
    outages: outagesQ.data,
    outlook: outlookQ.data,
    outlookError: outlookQ.error,
    loading: !alertsQ.data && !tidesQ.data && !gaugesQ.data,
    errors: [alertsQ.error, tidesQ.error, gaugesQ.error, outagesQ.error, closuresQ.error, camerasQ.error].filter(Boolean) as string[],
    offline: [alertsQ, tidesQ, gaugesQ, outagesQ, outlookQ].some((q) => q.offline),
    updatedAt: Math.max(alertsQ.updatedAt ?? 0, tidesQ.updatedAt ?? 0, gaugesQ.updatedAt ?? 0),
  };
}

export type FloodData = ReturnType<typeof useFloodData>;
