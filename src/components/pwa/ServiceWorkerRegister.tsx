"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production only: in dev it would cache hot-reloaded code.
 * updateViaCache "none" makes the browser always re-check sw.js for updates.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  }, []);
  return null;
}
