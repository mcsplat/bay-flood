import { cachedJson, errorJson } from "@/lib/http";
import { getBayAreaAlerts } from "@/lib/api/nws";
import { getBayAreaGauges } from "@/lib/api/gauges";
import { getRainOutlook } from "@/lib/api/rain";
import { getTideReports } from "@/lib/api/tides";
import { buildOutlook } from "@/lib/outlook";

export async function GET() {
  try {
    // Rain is required; the other signals degrade gracefully if one upstream is down.
    const [rain, gauges, tides, alerts] = await Promise.all([
      getRainOutlook(),
      getBayAreaGauges().catch(() => []),
      getTideReports().catch(() => []),
      getBayAreaAlerts().catch(() => []),
    ]);
    return cachedJson(buildOutlook(rain, gauges, tides, alerts), 300);
  } catch (err) {
    console.error("outlook", err);
    return errorJson("Forecast outlook is unavailable", 502);
  }
}
