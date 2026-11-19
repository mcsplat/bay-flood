import { cachedJson, errorJson } from "@/lib/http";
import { getBayAreaAlerts } from "@/lib/api/nws";

export async function GET() {
  try {
    return cachedJson({ alerts: await getBayAreaAlerts(), fetchedAt: new Date().toISOString() }, 60);
  } catch (err) {
    console.error("alerts", err);
    return errorJson("National Weather Service is unavailable", 502);
  }
}
