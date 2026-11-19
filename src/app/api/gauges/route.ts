import { getBayAreaGauges } from "@/lib/api/gauges";

export async function GET() {
  try {
    return Response.json({ gauges: await getBayAreaGauges(), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("gauges", err);
    return Response.json({ error: "National Water Prediction Service is unavailable" }, { status: 502 });
  }
}
