import { getBayAreaAlerts } from "@/lib/api/nws";

export async function GET() {
  try {
    return Response.json({ alerts: await getBayAreaAlerts(), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("alerts", err);
    return Response.json({ error: "National Weather Service is unavailable" }, { status: 502 });
  }
}
