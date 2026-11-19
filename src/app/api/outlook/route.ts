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
    return Response.json(buildOutlook(rain, gauges, tides, alerts));
  } catch (err) {
    console.error("outlook", err);
    return Response.json({ error: "Forecast outlook is unavailable" }, { status: 502 });
  }
}
