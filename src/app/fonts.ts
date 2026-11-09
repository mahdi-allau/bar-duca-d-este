import { Amiri, Cormorant_Garamond, Manrope, Noto_Sans_Arabic } from "next/font/google";

export const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * Arabic letters for the Arabic pages. They sit behind the Latin fonts in the font stacks (globals.css), and
 * their files are only downloaded by a page that actually shows Arabic text, so the other languages pay nothing.
 */
const arabicDisplay = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
  preload: false,
});

const arabicSans = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  preload: false,
});

export const fontVariables = [display, sans, arabicDisplay, arabicSans].map((f) => f.variable).join(" ");
