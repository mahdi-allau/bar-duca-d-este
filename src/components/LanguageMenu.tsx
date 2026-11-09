"use client";

import { Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LANGUAGE_NAMES, LOCALES, localePath, stripLocale, type Locale } from "@/lib/i18n/config";
import { useLang } from "@/lib/i18n/client";

/** The same page in another language. Plain links, so it works without any script too. */
function useAlternates() {
  const pathname = usePathname();
  const { path } = stripLocale(pathname);
  return (l: Locale) => localePath(l, path);
}

/** Dropdown for the header (tablet and desktop). */
export function LanguageDropdown({ solid }: { solid: boolean }) {
  const { lang, common } = useLang();
  const href = useAlternates();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${common.language}: ${LANGUAGE_NAMES[lang]}`}
        className="flex h-12 items-center gap-2 px-2 text-[0.8125rem] font-medium tracking-[0.08em] uppercase"
      >
        <Globe aria-hidden className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.5} />
        {lang}
      </button>
      {open && (
        <ul
          className={cn(
            "absolute end-0 top-full z-10 mt-2 min-w-40 border py-1 shadow-lg",
            solid ? "border-espresso/15 bg-cream text-espresso" : "border-champagne/25 bg-ink text-ivory",
          )}
        >
          {LOCALES.map((l) => (
            <li key={l}>
              <a
                href={href(l)}
                hrefLang={l}
                lang={l}
                aria-current={l === lang ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-4 px-4 text-sm hover:bg-champagne/20",
                  l === lang && "font-semibold",
                )}
              >
                {LANGUAGE_NAMES[l]}
                {l === lang && <span aria-hidden>✓</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Row of languages inside the phone menu. */
export function LanguageList({ onNavigate }: { onNavigate?: () => void }) {
  const { lang, common } = useLang();
  const href = useAlternates();
  return (
    <div>
      <p className="mb-3 text-xs tracking-[0.22em] text-ivory/60 uppercase">{common.language}</p>
      <ul className="flex flex-wrap gap-x-6 gap-y-1">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={href(l)}
              hrefLang={l}
              lang={l}
              aria-current={l === lang ? "true" : undefined}
              onClick={onNavigate}
              className={cn("inline-block py-2 text-base", l === lang ? "font-semibold text-champagne" : "text-ivory/85")}
            >
              {LANGUAGE_NAMES[l]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
