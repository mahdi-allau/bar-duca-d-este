/**
 * Languages of the public site. Italian is the home language and lives at the root ("/colazione");
 * the others are prefixed ("/en/colazione"). The admin area stays in Italian.
 */
export const LOCALES = ["it", "en", "es", "de", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Names of the languages, each written in its own language (what a visitor looks for). */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  de: "Deutsch",
  ar: "العربية",
};

export const dirOf = (lang: Locale): "ltr" | "rtl" => (lang === "ar" ? "rtl" : "ltr");

/** BCP 47 tag for Intl (dates, numbers, plurals). Arabic keeps Western digits, like the phone numbers and times. */
export const intlLocale = (lang: Locale) =>
  ({ it: "it-IT", en: "en-GB", es: "es-ES", de: "de-DE", ar: "ar-u-nu-latn" })[lang];

/** Open Graph locale. */
export const ogLocale = (lang: Locale) =>
  ({ it: "it_IT", en: "en_GB", es: "es_ES", de: "de_DE", ar: "ar_AR" })[lang];

/** "/colazione" in a language: Italian stays unprefixed, the others get "/en", "/es"… */
export function localePath(lang: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (lang === DEFAULT_LOCALE) return clean;
  if (clean.startsWith("/#")) return `/${lang}${clean.slice(1)}`;
  return clean === "/" ? `/${lang}` : `/${lang}${clean}`;
}

/** `alternates.languages` for a page: the same page in every language (hreflang), Italian as the default. */
export const alternatesFor = (path: string) => ({
  ...Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
  "x-default": localePath(DEFAULT_LOCALE, path),
});

/** The page behind a browser path, without its language prefix: "/en/colazione" → "/colazione". */
export function stripLocale(pathname: string): { lang: Locale; path: string } {
  const m = /^\/([a-z]{2})(?=\/|$)/.exec(pathname);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) {
    return { lang: m[1], path: pathname.slice(3) || "/" };
  }
  return { lang: DEFAULT_LOCALE, path: pathname || "/" };
}
