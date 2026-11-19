import type { Map as MlMap, MapMouseEvent, Popup } from "maplibre-gl";
import type { Selection } from "@/types/flood";

type Props = Record<string, unknown>;

export interface HoverTarget {
  /** Layers that belong to this target, checked in priority order with the other targets. */
  layers: string[];
  /** Feature property holding the id (default "id"; clusters use "cluster_id"). */
  idKey?: string;
  /** Popup contents for a feature, or null if the feature is unknown. */
  describe: (id: string, props: Props, at: [number, number]) => { html: string; lngLat: [number, number] } | null;
  /** Return a Selection to open it in the panel, or handle the click yourself and return null. */
  select: (id: string, props: Props, at: [number, number]) => Selection | null;
}

/**
 * One mousemove/click handler for every interactive layer. Targets are checked in
 * order, so a gauge sitting inside an outage area wins the hover.
 */
export function wireInteractions(
  m: MlMap,
  popup: Popup,
  targets: HoverTarget[],
  onSelect: (s: Selection) => void,
  fallbackClick?: (e: MapMouseEvent) => void,
) {
  let hoveredKey: string | null = null;

  const hit = (e: MapMouseEvent) => {
    for (const target of targets) {
      const layers = target.layers.filter((id) => m.getLayer(id) && m.getLayoutProperty(id, "visibility") !== "none");
      if (!layers.length) continue;
      const feature = m.queryRenderedFeatures(e.point, { layers })[0];
      const raw = feature?.properties?.[target.idKey ?? "id"];
      if (raw != null && raw !== "") return { target, id: String(raw), props: feature!.properties as Props };
    }
    return null;
  };

  m.on("mousemove", (e) => {
    const found = hit(e);
    const info = found?.target.describe(found.id, found.props, e.lngLat.toArray() as [number, number]);
    if (!found || !info) {
      m.getCanvas().style.cursor = "";
      hoveredKey = null;
      popup.remove();
      return;
    }
    m.getCanvas().style.cursor = "pointer";
    const key = `${found.target.layers[0]}:${found.id}`;
    if (key !== hoveredKey) {
      hoveredKey = key;
      popup.setHTML(info.html).setLngLat(info.lngLat).addTo(m);
    }
  });

  m.getCanvas().addEventListener("mouseleave", () => {
    hoveredKey = null;
    popup.remove();
  });

  m.on("click", (e) => {
    const found = hit(e);
    if (found) {
      const selection = found.target.select(found.id, found.props, e.lngLat.toArray() as [number, number]);
      if (selection) onSelect(selection);
      return;
    }
    fallbackClick?.(e);
  });
}
