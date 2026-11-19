"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  updatedAt: number | null;
  /** True when the service worker answered from its cache because the network is down. */
  offline: boolean;
}

/**
 * Fetch JSON on an interval. Pauses while the tab is hidden and refreshes
 * immediately when it becomes visible again.
 */
export function usePolling<T>(url: string | null, intervalMs: number) {
  const [state, setState] = useState<PollState<T>>({
    data: null,
    error: null,
    loading: Boolean(url),
    updatedAt: null,
    offline: false,
  });
  const controller = useRef<AbortController | null>(null);
  const lastLoad = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    lastLoad.current = Date.now();
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(url, { signal: ac.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      const offline = res.headers.get("X-BFW-Offline") === "1";
      setState((s) => ({
        data: body as T,
        error: null,
        loading: false,
        offline,
        // Cached data keeps its original timestamp so "Updated …" stays honest.
        updatedAt: offline ? (s.updatedAt ?? Date.now()) : Date.now(),
      }));
    } catch (err) {
      if (ac.signal.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Request failed",
      }));
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, intervalMs);
    // Refresh on return to the tab, but not on rapid focus flips.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoad.current > 30_000) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      controller.current?.abort();
    };
  }, [url, intervalMs, load]);

  return { ...state, refresh: load };
}
