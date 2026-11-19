import { cachedJson, errorJson } from "@/lib/http";
import type { NextRequest } from "next/server";
import { getGaugeDetail } from "@/lib/api/gauges";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/gauges/[lid]">) {
  const { lid } = await ctx.params;
  if (!/^[A-Z0-9]{3,10}$/i.test(lid)) {
    return errorJson("Invalid gauge id", 400);
  }
  try {
    return cachedJson(await getGaugeDetail(lid.toUpperCase()), 120);
  } catch (err) {
    console.error("gauge", lid, err);
    return errorJson("Gauge data is unavailable", 502);
  }
}
