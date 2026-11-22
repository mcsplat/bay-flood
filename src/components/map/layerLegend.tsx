import type { ReactNode } from "react";
import type { FloodCategory } from "@/types/flood";
import { ALERT_COLOR, CATEGORY_COLOR } from "@/lib/categories";
import { CAMERA_FILL, CAMERA_VIDEO_RING, CLOSURE_FILL, CLOSURE_STORM_FILL, OUTAGE_FILL } from "./mapIcons";
import type { LayerKey } from "./layers";

/** Same gradient as the radar control and the NEXRAD reflectivity scale. */
export const RADAR_GRADIENT =
  "linear-gradient(90deg, #04e9e7, #019ff4, #0300f4, #02fd02, #01c501, #008e00, #fdf802, #e5bc00, #fd9500, #fd0000, #d40000, #bc0000, #f800fd)";

export const LAYER_INFO: { key: LayerKey; label: string; description: string }[] = [
  { key: "alerts", label: "NWS alerts", description: "Flood warnings, watches and advisories" },
  { key: "gauges", label: "Creek gauges", description: "Creek and river water levels" },
  { key: "tides", label: "Bay tides", description: "Water level and storm surge" },
  { key: "closures", label: "Road closures", description: "Caltrans highway and bridge closures in effect" },
  { key: "outages", label: "Power outages", description: "PG&E and other utilities, via Cal OES" },
  { key: "cameras", label: "Traffic cams", description: "Caltrans road cameras" },
  { key: "radar", label: "Radar", description: "Rain over the last 50 minutes" },
];

/** A small drawing of each layer's marker, matching what's on the map. */
export function LayerGlyph({ layer, size = 20 }: { layer: LayerKey; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": true } as const;
  switch (layer) {
    case "gauges":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6" fill={CATEGORY_COLOR.none} stroke="#fff" strokeWidth="1.5" />
        </svg>
      );
    case "alerts":
      return (
        <svg {...common}>
          <path d="M3 6 9 3l8 4-1 9-9 1-4-5Z" fill={ALERT_COLOR.warning} fillOpacity=".2" stroke={ALERT_COLOR.warning} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "tides":
      return (
        <svg {...common}>
          <rect x="1" y="5" width="18" height="10" rx="5" fill="#0f172a" />
          <circle cx="6" cy="10" r="2.2" fill={CATEGORY_COLOR.action} />
          <path d="M10 10.5c1-1.4 2-1.4 3 0s2 1.4 3 0" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "closures":
      return (
        <svg {...common}>
          <path d="M10 1.5 18.5 10 10 18.5 1.5 10Z" fill={CLOSURE_STORM_FILL} stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6.3 10.4c1.2-1.6 2.5-1.6 3.7 0s2.5 1.6 3.7 0" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "outages":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="8.5" fill={OUTAGE_FILL} stroke="#fff" strokeWidth="1.2" />
          <path d="M10.8 3.6 5.5 11.4h4.2l-.8 5.2 5.8-8.3h-4.2l.3-4.7Z" fill="#fff" />
        </svg>
      );
    case "cameras":
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="17" height="17" rx="4.5" fill={CAMERA_FILL} stroke={CAMERA_VIDEO_RING} strokeWidth="1.5" />
          <rect x="8" y="5.6" width="3" height="1.8" rx=".5" fill="#fff" />
          <rect x="5" y="7.4" width="10" height="6.6" rx="1.5" fill="#fff" />
          <circle cx="10" cy="10.7" r="2" fill={CAMERA_FILL} />
        </svg>
      );
    case "radar":
      return (
        <span className="block rounded-full" style={{ width: size * 0.8, height: size * 0.8, margin: size * 0.1, background: RADAR_GRADIENT }} aria-hidden />
      );
  }
}

function Chip({ color, shape = "dot", children }: { color: string; shape?: "dot" | "area" | "diamond"; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={
          shape === "dot"
            ? "h-2.5 w-2.5 flex-none rounded-full"
            : shape === "diamond"
              ? "mx-0.5 h-2 w-2 flex-none rotate-45 rounded-[2px]"
              : "h-2.5 w-3.5 flex-none rounded-[3px] border-[1.5px]"
        }
        style={shape === "area" ? { borderColor: color, background: `${color}33` } : { background: color }}
        aria-hidden
      />
      {children}
    </li>
  );
}

const GAUGE_KEY: [FloodCategory, string][] = [
  ["none", "Normal"],
  ["action", "Near flood stage"],
  ["minor", "Minor flooding"],
  ["moderate", "Moderate"],
  ["major", "Major"],
  ["unknown", "No flood stage"],
];

/** What a layer's colors and sizes mean. Shown under the layer's switch while it's on. */
export function LayerKeyDetail({ layer }: { layer: LayerKey }) {
  const note = (text: string) => <p className="text-[11px] leading-snug text-muted">{text}</p>;
  switch (layer) {
    case "gauges":
      return (
        <div className="space-y-1.5">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {GAUGE_KEY.map(([cat, text]) => (
              <Chip key={cat} color={CATEGORY_COLOR[cat]}>{text}</Chip>
            ))}
          </ul>
          {note("A pulsing ring means at or near flood stage. Zoomed out, normal gauges fade to small dots.")}
        </div>
      );
    case "alerts":
      return (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          <Chip color={ALERT_COLOR.warning} shape="area">Warning</Chip>
          <Chip color={ALERT_COLOR.watch} shape="area">Watch</Chip>
          <Chip color={ALERT_COLOR.advisory} shape="area">Advisory</Chip>
        </ul>
      );
    case "tides":
      return note("Each label shows the water level now and the surge above or below the forecast tide. The dot is the high-tide outlook, in the gauge colors.");
    case "closures":
      return (
        <div className="space-y-1.5">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <Chip color={CLOSURE_STORM_FILL} shape="diamond">Flooding or storm</Chip>
            <Chip color={CLOSURE_FILL} shape="diamond">Roadwork or other</Chip>
          </ul>
          {note("Bigger diamond and solid line: road fully closed. Smaller and dashed: some lanes closed. State highways only, not city streets.")}
        </div>
      );
    case "outages":
      return note("A bigger bolt means more customers are out. Shaded areas show where power is off.");
    case "cameras":
      return note("Appear once you zoom in. A blue border means live video.");
    case "radar":
      return (
        <div>
          <div className="h-1.5 rounded-full" style={{ background: RADAR_GRADIENT }} aria-hidden />
          <div className="mt-0.5 flex justify-between text-[10px] text-muted">
            <span>Light</span>
            <span>Heavy</span>
            <span>Extreme</span>
          </div>
        </div>
      );
  }
}
