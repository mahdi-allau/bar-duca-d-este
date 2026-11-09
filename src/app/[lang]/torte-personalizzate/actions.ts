"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { newReference } from "@/server/booking";
import { one, query } from "@/server/db";
import { requestReceived } from "@/server/notify";
import { allow, clientIp } from "@/server/rate-limit";

const EVENT_KINDS = [
  { value: "compleanno", label: "Torta di compleanno" },
  { value: "personalizzata", label: "Torta personalizzata" },
  { value: "anniversario", label: "Anniversario" },
  { value: "battesimo", label: "Battesimo" },
  { value: "evento-privato", label: "Evento privato" },
  { value: "catering", label: "Catering e rinfresco" },
] as const;

export type RequestState =
  | { ok: true; reference: string }
  | { ok: false; error: string; fields?: Record<string, string> }
  | null;

const schemaFor = (lang: Locale) => {
  const m = getDict(lang).server;
  return z.object({
    kind: z.enum(EVENT_KINDS.map((k) => k.value) as [string, ...string[]], { error: m.kind }),
    name: z.string().trim().min(2, m.yourName).max(100),
    phone: z.string().trim().regex(/^[+0-9][0-9 ()./-]{5,24}$/, m.phone),
    email: z.string().trim().email(m.email).max(200),
    eventDate: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), m.badEventDate)
      .default(""),
    guests: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{1,4}$/.test(v) && Number(v) > 0), m.badNumber)
      .default(""),
    cakeReference: z.string().trim().max(20).default(""),
    message: z.string().trim().min(10, m.message).max(1500),
    privacy: z.literal("on", { error: m.consent }),
  });
};

export async function requestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const langValue = formData.get("lang");
  const lang: Locale = isLocale(langValue) ? langValue : "it";
  const m = getDict(lang).server;
  if (formData.get("website")) return { ok: false, error: m.invalidRequest };
  const parsed = schemaFor(lang).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: m.checkFields, fields };
  }
  if (!(await allow(`request:${await clientIp()}`, 5, 3600))) {
    return { ok: false, error: m.tooManyRequests };
  }
  const d = parsed.data;
  const kind = EVENT_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind;
  const reference = newReference("RI");
  const email = d.email.toLowerCase();

  // A request can point at a cake designed in the configurator, but only when
  // that order really exists and was placed with the same e-mail.
  let cakeReference = "";
  if (d.cakeReference) {
    const code = d.cakeReference.toUpperCase();
    const cake = await one<{ reference: string }>(
      `SELECT reference FROM cake_orders WHERE reference = $1 AND lower(email) = $2`,
      [code, email],
    );
    if (cake) cakeReference = cake.reference;
  }

  await query(
    `INSERT INTO event_requests (id, reference, kind, name, phone, email, event_date, guests, message, cake_reference, lang)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [randomUUID(), reference, kind, d.name, d.phone, email, d.eventDate, d.guests ? Number(d.guests) : null, d.message, cakeReference, lang],
  );
  requestReceived({
    reference,
    kind,
    name: d.name,
    phone: d.phone,
    email,
    message: cakeReference ? `${d.message}\n\nTorta collegata: ${cakeReference}` : d.message,
    lang,
    kindValue: d.kind,
  });
  return { ok: true, reference };
}
