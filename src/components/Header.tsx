"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { dirOf, localePath, stripLocale } from "@/lib/i18n/config";
import { useLang } from "@/lib/i18n/client";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { NAV, SITE } from "@/lib/site";
import { LanguageDropdown, LanguageList } from "./LanguageMenu";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE } from "./motion-kit";

function NavLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const { lang } = useLang();
  const pathname = usePathname();
  const onHome = stripLocale(pathname).path === "/";
  const full = localePath(lang, href);
  // Anchors on the current page stay plain links so the smooth scroller handles them.
  const samePage = href.startsWith("#") || (onHome && (href === "/" || href.startsWith("/#")));
  return samePage ? (
    <a href={full} className={className} onClick={onClick}>
      {children}
    </a>
  ) : (
    <Link href={full} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export default function Header() {
  const { lang, common: c } = useLang();
  const pathname = usePathname();
  const onHome = stripLocale(pathname).path === "/";
  const rtl = dirOf(lang) === "rtl";
  // the menu opens like a circle growing out of its button, which sits on the right (left in Arabic)
  const origin = rtl ? "2.5rem" : "calc(100% - 2.5rem)";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Scroll lock, Escape to close, focus handling and desktop-resize safety.
  useEffect(() => {
    if (!open) return;
    lockScroll();
    const toggle = toggleRef.current;
    const t = window.setTimeout(() => document.querySelector<HTMLElement>("#menu-mobile a")?.focus(), 450);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const mq = window.matchMedia("(min-width: 1180px)");
    const onMq = () => mq.matches && close();
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      unlockScroll();
      toggle?.focus({ preventScroll: true });
    };
  }, [open, close]);

  const solid = (scrolled || !onHome) && !open;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color,padding] duration-700 ease-lux",
          solid
            ? "bg-ivory/90 py-2.5 text-espresso shadow-[0_1px_0_0_rgba(56,42,34,0.12)] backdrop-blur-md"
            : "py-4 text-ivory md:py-5",
        )}
      >
        {/* soft scrim so the nav stays legible over the photograph */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-ink/75 to-transparent transition-opacity duration-700",
            solid || open ? "opacity-0" : "opacity-100",
          )}
        />
        <div className="wrap flex items-center justify-between gap-3 sm:gap-8">
          <NavLink href="/" className="block shrink-0 rounded-full">
            <span className="sr-only">{c.homeLink}</span>
            <Image
              src="/logo-seal-480.webp"
              alt={c.logoAlt}
              width={72}
              height={72}
              priority
              className={cn(
                "rounded-full transition-[width,height] duration-700 ease-lux",
                solid ? "h-12 w-12" : "h-14 w-14 md:h-[4.5rem] md:w-[4.5rem]",
              )}
            />
          </NavLink>

          <NavLink
            href="/"
            className="me-auto block min-w-0 leading-none min-[1180px]:max-[1359px]:hidden"
          >
            <span className="block text-[0.56rem] font-medium tracking-[0.24em] whitespace-nowrap uppercase opacity-90 sm:text-[0.6rem] sm:tracking-[0.3em]">
              {c.eyebrow}
            </span>
            <span className="mt-1 block font-display text-[1.45rem] font-normal tracking-[0.02em] whitespace-nowrap sm:mt-1.5 sm:text-[1.65rem] sm:font-light">
              Duca d’Este
            </span>
          </NavLink>

          <nav aria-label={c.mainNav} className="hidden min-[1180px]:block">
            <ul className="flex items-center gap-8 xl:gap-10">
              {NAV.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="link-u text-[0.8125rem] font-medium tracking-[0.04em]"
                  >
                    {c.nav[item.key]}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <LanguageDropdown solid={solid} />
            </div>
            <Link
              href={localePath(lang, "/prenota")}
              className={cn(
                "btn hidden min-h-12 px-6 min-[1180px]:inline-flex",
                solid ? "btn-dark" : "btn-gold",
              )}
            >
              {c.bookTable}
            </Link>

            <button
              ref={toggleRef}
              type="button"
              className="burger relative -me-2 flex h-12 w-12 flex-col items-center justify-center gap-[7px] min-[1180px]:hidden"
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? c.closeMenu : c.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <span
                className="w-7"
                style={{ transform: open ? "translateY(4px) rotate(45deg)" : undefined }}
              />
              <span
                className="w-7"
                style={{ transform: open ? "translateY(-4px) rotate(-45deg)" : undefined }}
              />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={c.menuDialog}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink text-ivory"
            initial={
              reduce
                ? { opacity: 0 }
                : { clipPath: `circle(0px at ${origin} 2.75rem)` }
            }
            animate={
              reduce
                ? { opacity: 1 }
                : { clipPath: `circle(150% at ${origin} 2.75rem)` }
            }
            exit={
              reduce
                ? { opacity: 0 }
                : { clipPath: `circle(0px at ${origin} 2.75rem)` }
            }
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="wrap flex min-h-full flex-1 flex-col pb-10 pt-28">
              <nav aria-label={c.mobileNav}>
                <ul className="flex flex-col">
                  {NAV.map((item, i) => (
                    <li key={item.href} className="overflow-hidden border-b border-champagne/15">
                      <motion.div
                        initial={reduce ? false : { y: "100%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.06 }}
                      >
                        <NavLink
                          href={item.href}
                          onClick={close}
                          className="block py-3.5 font-display text-[2.1rem] font-light leading-none"
                        >
                          {c.nav[item.key]}
                        </NavLink>
                      </motion.div>
                    </li>
                  ))}
                </ul>
              </nav>

              <motion.div
                className="mt-auto pt-12"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.75 }}
              >
                <Link href={localePath(lang, "/prenota")} onClick={close} className="btn btn-gold w-full">
                  {c.bookTable}
                </Link>
                <div className="mt-8">
                  <LanguageList onNavigate={close} />
                </div>
                <address className="mt-8 text-sm not-italic leading-relaxed text-ivory/75">
                  {SITE.street}
                  <br />
                  {SITE.postalCode} {SITE.city}, {c.country}
                  <br />
                  <a href={SITE.phoneHref} className="text-champagne">
                    {SITE.phone}
                  </a>
                </address>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
