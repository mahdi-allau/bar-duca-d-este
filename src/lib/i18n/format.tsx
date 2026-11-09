import { Fragment, type ReactNode } from "react";
import { intlLocale, type Locale } from "./config";

export type Vars = Record<string, string | number>;

/** "Per {n} persone" + { n: 4 } → "Per 4 persone". Unknown placeholders are left as they are. */
export const fmt = (text: string, vars: Vars = {}) =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));

/** Plural forms of a phrase. Arabic uses all six categories, the other languages one/other. */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export function pl(lang: Locale, forms: PluralForms, n: number, vars: Vars = {}) {
  const rule = new Intl.PluralRules(intlLocale(lang)).select(n);
  return fmt(forms[rule] ?? forms.other, { n, ...vars });
}

export type RichMap = Record<string, ReactNode | ((children: ReactNode) => ReactNode)>;

/**
 * Text with a little markup, so that a sentence with a link inside is translated as ONE sentence:
 * "Hai già inviato una richiesta? <status>Controlla lo stato</status>." and "{phone}" placeholders.
 * Each <tag> is replaced by what `map[tag]` makes of the words inside it.
 */
export function rich(text: string, map: RichMap): ReactNode {
  const out: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>|\{(\w+)\}/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const f = map[m[1]];
      out.push(<Fragment key={i++}>{typeof f === "function" ? f(m[2]) : (f ?? m[2])}</Fragment>);
    } else {
      out.push(<Fragment key={i++}>{(map[m[3]] as ReactNode) ?? `{${m[3]}}`}</Fragment>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
