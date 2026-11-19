import { cachedJson, errorJson } from "@/lib/http";
import { getBayAreaCameras } from "@/lib/api/cameras";

export async function GET() {
  try {
    return cachedJson({ cameras: await getBayAreaCameras(), fetchedAt: new Date().toISOString() }, 900);
  } catch (err) {
    console.error("cameras", err);
    return errorJson("Caltrans traffic cameras are unavailable", 502);
  }
}
