"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export const EASE = [0.22, 0.8, 0.2, 1] as const;

/**
 * Headline whose lines rise out of a mask. Used once per section so the
 * motion stays an event, not wallpaper.
 */
export function Lines({
  lines,
  className,
  delay = 0,
  immediate = false,
}: {
  lines: string[];
  className?: string;
  delay?: number;
  /** Animate on mount instead of when scrolled into view (hero). */
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={line}>
        <span
          className={cn("block overflow-hidden pb-[0.14em] -mb-[0.14em]", className)}
        >
          <motion.span
            className="block"
            initial={reduce ? false : { y: "112%" }}
            {...(immediate
              ? { animate: { y: "0%" } }
              : {
                  whileInView: { y: "0%" },
                  viewport: { once: true, margin: "0px 0px -12% 0px" },
                })}
            transition={{ duration: 1.25, ease: EASE, delay: delay + i * 0.12 }}
          >
            {line}
          </motion.span>
        </span>
        {" "}
        </Fragment>
      ))}
    </>
  );
}

/** Quiet entrance for body copy: opacity and a few pixels of lift. */
export function FadeIn({
  children,
  delay = 0,
  className,
  y = 12,
  immediate = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      {...(immediate
        ? { animate: { opacity: 1, y: 0 } }
        : {
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: "0px 0px -8% 0px" },
          })}
      transition={{ duration: 1.1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A photograph in a frame: it opens from a slightly inset window the first
 * time it is seen and drifts a few percent against the scroll afterwards.
 * Size the frame with className (aspect ratio or h-full).
 */
export function Photo({
  src,
  alt,
  sizes,
  className,
  parallax = 5,
  priority = false,
  position = "center",
  imgClassName,
  style,
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  parallax?: number;
  priority?: boolean;
  position?: string;
  imgClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax}%`, `${parallax}%`]);

  return (
    <motion.div
      ref={ref}
      style={style}
      className={cn("relative overflow-hidden bg-espresso/20", className)}
      initial={reduce ? false : { clipPath: "inset(7% 5% 7% 5%)", opacity: 0 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.5, ease: EASE }}
    >
      <motion.div
        className="absolute inset-x-0 -inset-y-[10%]"
        style={{ y: reduce ? 0 : y }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imgClassName)}
          style={{ objectPosition: position }}
        />
      </motion.div>
      {children}
    </motion.div>
  );
}
