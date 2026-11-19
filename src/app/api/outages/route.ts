import { getBayAreaOutages } from "@/lib/api/outages";

export async function GET() {
  try {
    return Response.json({ ...(await getBayAreaOutages()), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("outages", err);
    return Response.json({ error: "Power outage data is unavailable" }, { status: 502 });
  }
}
