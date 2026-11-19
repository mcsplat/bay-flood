/** api.weather.gov requires a User-Agent identifying the application. */
const USER_AGENT = "bay-flood-watch (open-source flood awareness map)";

export async function getJson<T>(
  url: string,
  init: { accept?: string; timeoutMs?: number } = {},
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: init.accept ?? "application/json",
    },
    signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
  });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} for ${new URL(url).host}`);
  }
  return (await res.json()) as T;
}

/** Map with bounded concurrency so we don't burst an upstream API. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Run promises and drop failures, so one bad upstream doesn't sink a layer. */
export async function settled<T>(promises: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
