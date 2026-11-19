import { cachedJson, errorJson } from "@/lib/http";
import { getBayAreaOutages } from "@/lib/api/outages";

export async function GET() {
  try {
    return cachedJson({ ...(await getBayAreaOutages()), fetchedAt: new Date().toISOString() }, 120);
  } catch (err) {
    console.error("outages", err);
    return errorJson("Power outage data is unavailable", 502);
  }
}
