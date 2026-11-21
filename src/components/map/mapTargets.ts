import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { RefObject } from "react";
import type { FloodAlert, GaugeSummary, PowerOutage, TrafficCamera } from "@/types/flood";
import type { HoverTarget } from "./interactions";
import { gaugePopupHtml } from "./gaugePopup";
import { outagePopupHtml } from "./outagePopup";
import { cameraPopupHtml, clusterPopupHtml } from "./cameraPopup";
import { alertLabel, cameraLabel, gaugeLabel, outageLabel } from "./tapLabels";

export interface MapIndexes {
  gauges: RefObject<Map<string, GaugeSummary>>;
  outages: RefObject<Map<string, PowerOutage>>;
  cameras: RefObject<Map<string, TrafficCamera>>;
  alerts: RefObject<Map<string, FloodAlert>>;
}

type Located = { lat: number; lon: number };

/** Place `html(item)` at the item's own position, or null if the id is unknown. */
function at<T extends Located>(index: RefObject<Map<string, T>>, html: (item: T) => string) {
  return (id: string) => {
    const item = index.current.get(id);
    return item ? { html: html(item), lngLat: [item.lon, item.lat] as [number, number] } : null;
  };
}

/** Interactive layers in priority order: gauges win over outages, cameras, then alert areas. */
export function mapTargets(m: MlMap, idx: MapIndexes): HoverTarget[] {
  return [
    {
      layers: ["gauges-circle", "gauges-risk-ring"],
      describe: at(idx.gauges, gaugePopupHtml),
      label: at(idx.gauges, gaugeLabel),
      select: (id) => ({ type: "gauge", id }),
    },
    {
      layers: ["outages-point", "outage-areas-fill"],
      describe: at(idx.outages, outagePopupHtml),
      label: at(idx.outages, outageLabel),
      select: (id) => ({ type: "outage", id }),
    },
    {
      layers: ["cameras-point"],
      describe: at(idx.cameras, cameraPopupHtml),
      label: at(idx.cameras, cameraLabel),
      select: (id) => ({ type: "camera", id }),
    },
    {
      // No label: tapping a cluster just zooms in to split it.
      layers: ["cameras-cluster"],
      idKey: "cluster_id",
      describe: (_id, p, lngLat) => ({ html: clusterPopupHtml(Number(p.point_count)), lngLat }),
      select: (id, _p, center) => {
        (m.getSource("cameras") as GeoJSONSource)
          .getClusterExpansionZoom(Number(id))
          .then((zoom) => m.easeTo({ center, zoom: zoom + 0.5 }));
        return null;
      },
    },
    {
      // Alert areas: no hover popup (they're large), but a tap label on phones.
      layers: ["alerts-fill"],
      describe: () => null,
      label: (id, _p, lngLat) => {
        const a = idx.alerts.current.get(id);
        return a ? { html: alertLabel(a), lngLat } : null;
      },
      select: (id) => ({ type: "alert", id }),
    },
  ];
}
