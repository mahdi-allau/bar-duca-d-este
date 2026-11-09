"use server";

import { z } from "zod";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { allow, clientIp } from "@/server/rate-limit";
import { localizeName } from "@/server/localize";
import { cancelOwn, findOwn, type Found } from "@/server/self-service";
import { getCakeOptions } from "@/server/settings";

export type LookupState =
  | null
  | { ok: false; error: string }
  | { ok: true; found: Found; names: Record<string, string>; message?: string };

const schema = z.object({
  code: z.string().trim().min(5).max(20),
  email: z.string().trim().email().max(200),
});

const langOf = (formData: FormData): Locale => {
  const v = formData.get("lang");
  return isLocale(v) ? v : "it";
};

async function load(code: string, email: string, lang: Locale, message?: string): Promise<LookupState> {
  const m = getDict(lang).server;
  const found = await findOwn(code, email);
  if (!found) return { ok: false, error: m.notFound };
  const options = found.kind === "cake" ? await getCakeOptions(true) : [];
  const names = Object.fromEntries(options.map((o) => [`${o.kind}:${o.slug}`, localizeName(o.kind, o.slug, o.name, lang)]));
  // the kind of a request is stored in Italian, for the staff: show it in the visitor's language
  if (found.kind === "request" && lang !== "it") {
    const italian = getDict("it").request.kinds;
    const i = italian.indexOf(found.type);
    if (i >= 0) found.type = getDict(lang).request.kinds[i];
  }
  return { ok: true, found, names, message };
}

export async function lookupAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const lang = langOf(formData);
  const m = getDict(lang).server;
  const parsed = schema.safeParse({ code: formData.get("code"), email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: m.needBoth };
  if (!(await allow(`status:${await clientIp()}`, 25, 3600))) {
    return { ok: false, error: m.tooMany };
  }
  return load(parsed.data.code, parsed.data.email, lang);
}

export async function cancelAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const lang = langOf(formData);
  const m = getDict(lang).server;
  const parsed = schema.safeParse({ code: formData.get("code"), email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: m.invalidData };
  if (!(await allow(`cancel:${await clientIp()}`, 10, 3600))) {
    return { ok: false, error: m.tooMany };
  }
  const result = await cancelOwn(parsed.data.code, parsed.data.email, lang);
  if (!result.ok) return { ok: false, error: result.error };
  return load(parsed.data.code, parsed.data.email, lang, m.cancelledDone);
}
