import { getBayAreaCameras } from "@/lib/api/cameras";

export async function GET() {
  try {
    return Response.json({ cameras: await getBayAreaCameras(), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("cameras", err);
    return Response.json({ error: "Caltrans traffic cameras are unavailable" }, { status: 502 });
  }
}
