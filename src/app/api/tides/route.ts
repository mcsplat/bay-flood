import { cachedJson, errorJson } from "@/lib/http";
import { getTideReports } from "@/lib/api/tides";

export async function GET() {
  try {
    return cachedJson({ stations: await getTideReports(), fetchedAt: new Date().toISOString() }, 180);
  } catch (err) {
    console.error("tides", err);
    return errorJson("NOAA Tides & Currents is unavailable", 502);
  }
}
