/**
 * Caltrans keeps the 12 previous stills next to the current one:
 *   …/<slug>/<slug>.jpg → …/<slug>/previous/<slug>-1.jpg … -12.jpg
 * Returned oldest first, ending with the current image.
 */
export function cameraFrames(currentUrl: string, count = 12): string[] {
  const m = currentUrl.match(/^(.*)\/([^/]+)\.jpg$/);
  if (!m) return [currentUrl];
  const [, base, slug] = m;
  const previous = Array.from({ length: count }, (_, i) => `${base}/previous/${slug}-${count - i}.jpg`);
  return [...previous, currentUrl];
}

/** Bust browser caching once per minute so stills stay current. */
export function freshImage(url: string, now = Date.now()): string {
  return `${url}?t=${Math.floor(now / 60_000)}`;
}
