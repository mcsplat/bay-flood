import type { NextRequest } from "next/server";
import { getGaugeDetail } from "@/lib/api/gauges";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/gauges/[lid]">) {
  const { lid } = await ctx.params;
  if (!/^[A-Z0-9]{3,10}$/i.test(lid)) {
    return Response.json({ error: "Invalid gauge id" }, { status: 400 });
  }
  try {
    return Response.json(await getGaugeDetail(lid.toUpperCase()));
  } catch (err) {
    console.error("gauge", lid, err);
    return Response.json({ error: "Gauge data is unavailable" }, { status: 502 });
  }
}
