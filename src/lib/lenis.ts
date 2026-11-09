import type Lenis from "lenis";

/**
 * Tiny registry so any component (mobile menu, lightbox) can pause and resume
 * the smooth scroller without prop drilling.
 */
let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

export function getLenis() {
  return instance;
}

export function lockScroll() {
  instance?.stop();
  document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  document.documentElement.style.overflow = "";
  instance?.start();
}
