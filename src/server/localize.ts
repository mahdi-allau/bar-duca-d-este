import "server-only";
import { getDict } from "@/lib/i18n";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Catalogue texts in the visitor's language. The product cards and the cake ingredients live in the database
 * (the owner edits them in Italian); the ones that still carry the text they were created with are shown in the
 * visitor's language, and anything the owner has rewritten or added is shown exactly as typed.
 */
export function localizeProducts<T extends { slug: string; name: string; description: string }>(items: T[], lang: Locale): T[] {
  if (lang === DEFAULT_LOCALE) return items;
  const base = getDict(DEFAULT_LOCALE).products;
  const tr = getDict(lang).products;
  return items.map((p) => {
    const b = base[p.slug];
    const t = tr[p.slug];
    if (!b || !t) return p;
    return {
      ...p,
      name: p.name === b.name ? t.name : p.name,
      description: p.description === b.description ? t.description : p.description,
    };
  });
}

type Option = { kind: string; slug: string; name: string; description: string };

export function localizeOptions<T extends Option>(options: T[], lang: Locale): T[] {
  if (lang === DEFAULT_LOCALE) return options;
  const base = getDict(DEFAULT_LOCALE).options;
  const tr = getDict(lang).options;
  return options.map((o) => {
    const bName = base[o.kind]?.[o.slug];
    const tName = tr[o.kind]?.[o.slug];
    const bDesc = base.toppingDesc?.[o.slug];
    const tDesc = tr.toppingDesc?.[o.slug];
    return {
      ...o,
      name: bName && tName && o.name === bName ? tName : o.name,
      description: o.kind === "topping" && bDesc && tDesc && o.description === bDesc ? tDesc : o.description,
    };
  });
}

/** One ingredient name, for places that only have the database text (status page, e-mails). */
export function localizeName(kind: string, slug: string, name: string, lang: Locale): string {
  if (lang === DEFAULT_LOCALE) return name;
  const bName = getDict(DEFAULT_LOCALE).options[kind]?.[slug];
  const tName = getDict(lang).options[kind]?.[slug];
  return bName && tName && name === bName ? tName : name;
}
