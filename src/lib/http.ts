/**
 * JSON responses for the data feeds. Successful responses are cached at the CDN edge so
 * every visitor's poll shares one copy instead of each running a function. Browsers
 * always re-check (max-age=0); the edge serves a stale copy while it refreshes in the background.
 */
export function cachedJson(body: unknown, edgeSeconds: number, staleSeconds = 600): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": `public, max-age=0, s-maxage=${edgeSeconds}, stale-while-revalidate=${staleSeconds}`,
    },
  });
}

/** Errors are never cached, so a brief upstream outage doesn't stick at the edge. */
export function errorJson(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
