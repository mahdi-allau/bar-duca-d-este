import "server-only";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { it, type Dict } from "./it";

// Translations are added one language at a time: until a language has its own file it shows Italian.
const DICTS: Record<Locale, Dict> = { it, en: it, es: it, de: it, ar: it };

export type { Dict };
export const getDict = (lang: Locale = DEFAULT_LOCALE): Dict => DICTS[lang] ?? it;

/** The language of the page being rendered; anything that is not one of ours is a 404. */
export async function langOf(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}
