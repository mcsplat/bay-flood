import type { RoadClosure } from "@/types/flood";
import { formatTime } from "./format";

/** Plain-language wording for Caltrans closures, shared by the map label, popup and panel. */

const usable = (s: string) => s && s !== "N/A";

/** Ramps and connectors are named, so a closed off-ramp never reads as the whole highway. */
const FACILITY: Record<string, string> = {
  "Off Ramp": "off-ramp",
  "On Ramp": "on-ramp",
  Connector: "connector",
  "Toll Bridge": "bridge",
  "Tunnels/Tubes": "tunnel",
  "Rest Area": "rest area",
};

/** "SR-84 closed" / "US-101 connector closed" / "I-80 lane closure" / "SR-1 one-way traffic" */
export function closureHeadline(c: RoadClosure): string {
  // CHP reports: "Flooding on US-101" / "US-101 closed for flooding"
  if (c.source === "chp") return c.full ? `${c.route} closed for ${c.reason.toLowerCase()}` : `${c.reason} on ${c.route}`;
  const road = FACILITY[c.facility] ? `${c.route} ${FACILITY[c.facility]}` : c.route;
  if (c.full) return `${road} closed`;
  const kind = c.closureType === "Lane" ? "lane closure" : c.closureType.toLowerCase();
  return `${road} ${kind}`;
}

/** "Eastbound · Appian Way to Route 80" */
export function closureExtent(c: RoadClosure): string {
  const dir = c.direction.includes("/") || /both/i.test(c.direction) ? "Both directions" : usable(c.direction) ? `${c.direction}bound` : "";
  const where = [c.from, c.to].filter(usable).join(" to ");
  return [dir, where].filter(Boolean).join(" · ");
}

/** "All lanes closed" / "1 of 2 lanes closed" / "Right HOV lane closed" */
export function closureLanes(c: RoadClosure): string {
  if (c.full) return "All lanes closed";
  if (c.lanesNote) return c.lanesNote;
  const n = Number(c.lanesClosed);
  const total = Number(c.totalLanes);
  if (Number.isFinite(n) && n > 0) return total > 0 ? `${n} of ${total} lanes closed` : `${n} lane${n === 1 ? "" : "s"} closed`;
  return usable(c.lanesClosed) ? `${c.lanesClosed} lane closed` : c.closureType;
}

/** "Tue 5:00 PM" within the week; "Mar 30, 2027" further out; "Until further notice" when open-ended. */
export function closureEnds(c: RoadClosure, now = Date.now()): string {
  if (!c.ends && c.source === "chp") return "Not yet known";
  if (c.endIndefinite || !c.ends) return "Until further notice";
  const t = Date.parse(c.ends);
  if (t - now < 6 * 86_400_000) return formatTime(c.ends);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: new Date(t).getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined,
  }).format(t);
}
