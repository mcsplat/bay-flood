import { cachedJson, errorJson } from "@/lib/http";
import { getBayAreaGauges } from "@/lib/api/gauges";

export async function GET() {
  try {
    return cachedJson({ gauges: await getBayAreaGauges(), fetchedAt: new Date().toISOString() }, 120);
  } catch (err) {
    console.error("gauges", err);
    return errorJson("National Water Prediction Service is unavailable", 502);
  }
}
