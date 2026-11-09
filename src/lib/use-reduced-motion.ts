"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (notify: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};

/**
 * Whether the visitor asked their device for less motion. The server (and the first pass of the
 * browser, while the page is being attached to the server's HTML) always answers "no", so both
 * render the same markup; the stylesheet already shows everything at rest for these visitors
 * (see globals.css), so nothing is hidden while this settles.
 */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
