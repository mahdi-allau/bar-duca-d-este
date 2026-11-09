"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { setLenis, unlockScroll } from "@/lib/lenis";

const HEADER_OFFSET = 72;

/**
 * Inertial smooth scrolling (Lenis) plus in-page anchor handling.
 * Disabled entirely when the visitor prefers reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let raf = 0;

    if (!reduce) {
      lenis = new Lenis({
        duration: 1.25,
        easing: (t) => 1 - Math.pow(1 - t, 4),
        smoothWheel: true,
      });
      setLenis(lenis);
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (id && !target) return;
      e.preventDefault();
      // A link inside the mobile menu is clicked while scrolling is locked.
      unlockScroll();

      const toTop = !id || id === "top";
      if (lenis) {
        if (toTop) lenis.scrollTo(0, { duration: 1.6 });
        else lenis.scrollTo(target as HTMLElement, { offset: -HEADER_OFFSET, duration: 1.6 });
      } else if (!toTop && target) {
        const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top, behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      history.replaceState(null, "", toTop ? window.location.pathname : url.hash);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
