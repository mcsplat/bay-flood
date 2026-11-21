import type { Map as MlMap, MapMouseEvent, Popup } from "maplibre-gl";
import type { Selection } from "@/types/flood";

type Props = Record<string, unknown>;
type Placed = { html: string; lngLat: [number, number] };

export interface HoverTarget {
  /** Layers that belong to this target, checked in priority order with the other targets. */
  layers: string[];
  /** Feature property holding the id (default "id"; clusters use "cluster_id"). */
  idKey?: string;
  /** Hover popup contents (mouse only), or null for no hover popup. */
  describe: (id: string, props: Props, at: [number, number]) => Placed | null;
  /** Short tap label for touch screens. Without one, a tap acts immediately. */
  label?: (id: string, props: Props, at: [number, number]) => Placed | null;
  /** Return a Selection to open it in the panel, or handle the click yourself and return null. */
  select: (id: string, props: Props, at: [number, number]) => Selection | null;
}

/** Phones and tablets: no hover, so taps go through a label first. */
const isTouch = () => window.matchMedia("(hover: none)").matches;

/**
 * One mousemove/click handler for every interactive layer. Targets are checked in
 * order, so a gauge sitting inside an outage area wins.
 *
 * Mouse: hover shows a popup, click opens details.
 * Touch: first tap shows a short label; tapping the label (or the marker again) opens details.
 */
export function wireInteractions(
  m: MlMap,
  popup: Popup,
  tapPopup: Popup,
  targets: HoverTarget[],
  onSelect: (s: Selection) => void,
) {
  let hoveredKey: string | null = null;
  let tappedKey: string | null = null;

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

  const closeTap = () => {
    tappedKey = null;
    tapPopup.remove();
  };

  m.on("mousemove", (e) => {
    if (isTouch()) return;
    const found = hit(e);
    const info = found?.target.describe(found.id, found.props, e.lngLat.toArray() as [number, number]);
    m.getCanvas().style.cursor = found ? "pointer" : "";
    if (!found || !info) {
      hoveredKey = null;
      popup.remove();
      return;
    }
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
    if (!found) return closeTap();
    const at = e.lngLat.toArray() as [number, number];
    const open = () => {
      closeTap();
      const selection = found.target.select(found.id, found.props, at);
      if (selection) onSelect(selection);
    };

    const label = isTouch() ? found.target.label?.(found.id, found.props, at) : null;
    const key = `${found.target.layers[0]}:${found.id}`;
    if (!label || key === tappedKey) return open();

    tappedKey = key;
    tapPopup.setHTML(label.html).setLngLat(label.lngLat).addTo(m);
    tapPopup.getElement()?.querySelector("button")?.addEventListener("click", open, { once: true });
    keepOnScreen(m, tapPopup);
  });

  // Keep the label's card inside the screen as the map pans; its pointer stays on the marker.
  m.on("move", () => {
    if (tappedKey) keepOnScreen(m, tapPopup);
  });
}

const GUTTER = 12;

/** Slide the label card sideways so it never runs off the edge of a narrow screen. */
function keepOnScreen(m: MlMap, p: Popup) {
  const card = p.getElement()?.querySelector<HTMLElement>(".maplibregl-popup-content");
  if (!card) return;
  card.style.transform = "";
  const box = card.getBoundingClientRect();
  const frame = m.getContainer().getBoundingClientRect();
  const dx =
    box.left < frame.left + GUTTER
      ? frame.left + GUTTER - box.left
      : box.right > frame.right - GUTTER
        ? frame.right - GUTTER - box.right
        : 0;
  if (dx) card.style.transform = `translateX(${dx}px)`;
}
