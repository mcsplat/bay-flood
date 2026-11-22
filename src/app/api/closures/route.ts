import { cachedJson, errorJson } from "@/lib/http";
import { getRoadClosures } from "@/lib/api/closures";

export async function GET() {
  try {
    return cachedJson({ closures: await getRoadClosures(), fetchedAt: new Date().toISOString() }, 180);
  } catch (err) {
    console.error("closures", err);
    return errorJson("Caltrans road closures are unavailable", 502);
  }
}
