import type { Map as MlMap, MapMouseEvent, Popup } from "maplibre-gl";
import type { Selection } from "@/types/flood";

export interface HoverTarget {
  /** Layers that belong to this target, checked in priority order with the other targets. */
  layers: string[];
  /** Popup contents for a feature id, or null if the feature is unknown. */
  describe: (id: string) => { html: string; lngLat: [number, number] } | null;
  select: (id: string) => Selection;
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
      const id = feature?.properties?.id as string | undefined;
      if (id) return { target, id };
    }
    return null;
  };

  m.on("mousemove", (e) => {
    const found = hit(e);
    const info = found?.target.describe(found.id);
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
    if (found) return onSelect(found.target.select(found.id));
    fallbackClick?.(e);
  });
}
