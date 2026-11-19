"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";

const DISMISS_KEY = "bfw-install-hint-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

type Platform = "ios" | "installed" | "other";

/** Read once on the client; the server renders nothing so hydration stays consistent. */
function detectPlatform(): Platform {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iOS ? "ios" : "other";
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const noopSubscribe = () => () => {};

/**
 * iPhone Safari has no install prompt, so explain the two taps. Chrome and Edge fire
 * `beforeinstallprompt`, which we turn into a one-tap "Install" button.
 */
export function InstallHint() {
  const platform = useSyncExternalStore<Platform | null>(noopSubscribe, detectPlatform, () => null);
  const initiallyDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private browsing: hide for this visit only */
    }
  };

  if (dismissed || initiallyDismissed || platform === null || platform === "installed") return null;
  if (platform === "other" && !deferred) return null;

  return (
    <section
      aria-label="Install Bay Flood Watch"
      className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft p-3"
    >
      <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-[13px] leading-snug">
        <p className="font-semibold">Install Bay Flood Watch</p>
        {platform === "ios" ? (
          <p className="text-muted">
            Tap{" "}
            <span className="inline-flex translate-y-0.5 items-center" aria-label="the Share button">
              <ShareIcon />
            </span>{" "}
            <span className="font-medium text-foreground">Share</span> (inside the{" "}
            <span className="font-medium text-foreground">⋯</span> menu on newer iPhones), then{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>. It opens full-screen, like an app.
          </p>
        ) : (
          <>
            <p className="text-muted">Add it to your home screen for one-tap access during storms.</p>
            <button
              type="button"
              onClick={async () => {
                await deferred?.prompt();
                setDeferred(null);
              }}
              className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              Install app
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="-m-1 rounded-md p-1 text-muted hover:text-foreground"
        aria-label="Dismiss install suggestion"
      >
        ✕
      </button>
    </section>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M7 10V1.5M7 1.5 4 4.5M7 1.5l3 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 7H2.5v7.5h9V7h-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
