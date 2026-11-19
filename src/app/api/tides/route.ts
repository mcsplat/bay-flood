import { getTideReports } from "@/lib/api/tides";

export async function GET() {
  try {
    return Response.json({ stations: await getTideReports(), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("tides", err);
    return Response.json({ error: "NOAA Tides & Currents is unavailable" }, { status: 502 });
  }
}
