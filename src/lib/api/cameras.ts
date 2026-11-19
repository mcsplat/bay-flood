import { cacheLife } from "next/cache";
import type { TrafficCamera } from "@/types/flood";
import { getJson, settled } from "./http";

/**
 * Caltrans CWWP2 CCTV inventory. District 4 is the Bay Area; District 5 adds
 * Santa Cruz County. The camera list changes rarely; images update by URL.
 */
const FEEDS = [
  "https://cwwp2.dot.ca.gov/data/d4/cctv/cctvStatusD04.json",
  "https://cwwp2.dot.ca.gov/data/d5/cctv/cctvStatusD05.json",
];

const BAY_COUNTIES = new Set([
  "Alameda",
  "Contra Costa",
  "Marin",
  "Napa",
  "San Francisco",
  "San Mateo",
  "Santa Clara",
  "Santa Cruz",
  "Solano",
  "Sonoma",
]);

interface CwwpCamera {
  cctv: {
    index: string;
    inService: string;
    location: {
      district: string;
      locationName: string;
      nearbyPlace: string;
      longitude: string;
      latitude: string;
      direction: string;
      county: string;
      route: string;
    };
    imageData: {
      streamingVideoURL?: string;
      static: { currentImageURL: string };
    };
  };
}

const isUrl = (s: string | undefined): s is string => !!s && s.startsWith("https://");

/** "TV102 -- I-580 : West of SR-24" → "I-580: West of SR-24" */
function cleanName(raw: string): string {
  return raw.replace(/^[A-Z]*\d+[A-Z]*\s*--\s*/, "").replace(/\s+:\s+/, ": ").trim();
}

export async function getBayAreaCameras(): Promise<TrafficCamera[]> {
  "use cache";
  cacheLife("hours");

  const feeds = await settled(FEEDS.map((url) => getJson<{ data: CwwpCamera[] }>(url, { timeoutMs: 30_000 })));
  if (!feeds.length) throw new Error("Caltrans camera feeds unavailable");

  return feeds.flatMap(({ data }) =>
    data.flatMap(({ cctv: c }) => {
      const loc = c.location;
      const lat = Number(loc.latitude);
      const lon = Number(loc.longitude);
      const image = c.imageData.static.currentImageURL;
      if (c.inService !== "true" || !BAY_COUNTIES.has(loc.county) || !isUrl(image) || !lat || !lon) return [];
      return [
        {
          id: `d${loc.district}-${c.index}`,
          name: cleanName(loc.locationName),
          route: loc.route,
          direction: loc.direction,
          county: loc.county,
          nearby: loc.nearbyPlace,
          lat,
          lon,
          imageUrl: image,
          streamUrl: isUrl(c.imageData.streamingVideoURL) ? c.imageData.streamingVideoURL : null,
        },
      ];
    }),
  );
}
