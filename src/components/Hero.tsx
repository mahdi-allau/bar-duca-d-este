"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/it";
import { IMG } from "@/lib/images";
import { SITE } from "@/lib/site";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { FadeIn, Lines } from "./motion-kit";

/** The Castello Estense, Ferrara: the photograph behind the headline. A very slow push-in, off for reduced motion. */
function HeroStage() {
  return (
    <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden bg-[#1a1511]">
      <Image
        src={IMG.castello.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-push object-cover object-[58%_50%] md:object-center"
      />
    </div>
  );
}

export default function Hero({ t, common, lang }: { t: Dict["home"]; common: Dict["common"]; lang: Locale }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative isolate flex min-h-[100svh] overflow-hidden bg-ink text-ivory"
    >
      <HeroStage />

      {/* Light control: the headline always sits on a quiet, dark area */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(23,23,21,0.55)_0%,rgba(23,23,21,0)_22%,rgba(23,23,21,0.1)_45%,rgba(23,23,21,0.82)_82%,rgba(23,23,21,0.95)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(23,23,21,0)_24%,rgba(23,23,21,0.62)_44%,rgba(23,23,21,0.88)_62%,rgba(23,23,21,0.95)_100%)] md:hidden"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,rgba(23,23,21,0.7)_0%,rgba(23,23,21,0.35)_38%,rgba(23,23,21,0)_62%)] md:block rtl:bg-[linear-gradient(270deg,rgba(23,23,21,0.7)_0%,rgba(23,23,21,0.35)_38%,rgba(23,23,21,0)_62%)]"
      />

      <motion.div style={{ y: reduce ? 0 : textY }} className="wrap relative flex w-full flex-col">
        <div className="mt-auto max-w-[62rem] pb-20 pt-32 md:pb-28 md:pt-40">
          <p className="mb-6 text-[0.78rem] leading-relaxed font-semibold tracking-[0.3em] text-ivory uppercase [text-shadow:0_1px_14px_rgba(0,0,0,0.7)] sm:text-[0.8rem] sm:tracking-[0.34em] sm:text-champagne">
            <span className="block sm:inline">{t.eyebrowA}</span>{" "}
            <span className="block sm:inline">
              {t.eyebrowB} <span className="text-champagne">&middot;</span> {t.city}
            </span>
          </p>
          <h1 className="t-display">
            <Lines immediate delay={0.4} lines={t.heroLines} />
          </h1>

          <FadeIn immediate delay={1.2} className="mt-7 hidden max-w-[34rem] sm:block">
            <p className="t-lead text-ivory/90">
              {t.heroLead}
            </p>
          </FadeIn>

          <FadeIn immediate delay={1.45} className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
            <Link href={localePath(lang, "/colazione")} className="btn btn-gold">
              {t.ctaBreakfast}
            </Link>
            <Link href={localePath(lang, "/prenota")} className="btn btn-line bg-ink/30 backdrop-blur-[3px]">
              {common.bookTable}
            </Link>
            <Link href={localePath(lang, "/crea-la-tua-torta")} className="btn btn-line bg-ink/30 backdrop-blur-[3px]">
              {t.ctaCake}
            </Link>
          </FadeIn>
        </div>

        <div className="absolute inset-x-[clamp(1.25rem,4.2vw,4.5rem)] bottom-8 flex items-end justify-between">
          <a
            href="#esperienze"
            aria-label={t.scrollAria}
            className="group flex items-center gap-4 text-[0.7rem] font-medium tracking-[0.24em] text-ivory/80 uppercase"
          >
            <span className="relative block h-12 w-px overflow-hidden bg-ivory/25">
              <span
                className="absolute inset-0 bg-champagne"
                style={{ animation: "scroll-cue 2.8s var(--ease-lux) infinite" }}
              />
            </span>
            {t.scroll}
          </a>
          <p className="hidden text-right text-sm leading-snug text-ivory/80 md:block">
            {SITE.street} &middot; {SITE.postalCode} {SITE.city}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
