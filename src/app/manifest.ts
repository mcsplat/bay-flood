import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bay Flood Watch",
    short_name: "Flood Watch",
    description: "Live flood alerts, creek gauges, Bay tides, outages, and a 48-hour outlook for the SF Bay Area.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b2540",
    theme_color: "#0b2540",
    categories: ["weather", "news", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The logo's background is full-bleed and the drop sits inside the 80% safe zone.
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
