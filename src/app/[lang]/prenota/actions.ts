"use server";

import { z } from "zod";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { createReservation } from "@/server/booking";
import { reservationReceived } from "@/server/notify";
import { allow, clientIp } from "@/server/rate-limit";

export type ReserveState =
  | { ok: true; reference: string }
  | { ok: false; error: string; fields?: Record<string, string> }
  | null;

const schemaFor = (lang: Locale) => {
  const m = getDict(lang).server;
  return z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.pickDay),
    time: z.string().regex(/^\d{2}:\d{2}$/, m.pickTime),
    partySize: z.coerce.number().int().min(1).max(50),
    firstName: z.string().trim().min(1, m.firstName).max(60),
    lastName: z.string().trim().min(1, m.lastName).max(60),
    phone: z.string().trim().regex(/^[+0-9][0-9 ()./-]{5,24}$/, m.phone),
    email: z.string().trim().email(m.email).max(200),
    notes: z.string().trim().max(500).default(""),
    privacy: z.literal("on", { error: m.consent }),
  });
};

export async function reserveAction(_prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const langValue = formData.get("lang");
  const lang: Locale = isLocale(langValue) ? langValue : "it";
  const m = getDict(lang).server;

  // Hidden field that real visitors never fill in.
  if (formData.get("website")) return { ok: false, error: m.invalidRequest };

  const parsed = schemaFor(lang).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: m.checkFields, fields };
  }

  const ip = await clientIp();
  if (!(await allow(`reserve:${ip}`, 6, 3600))) {
    return { ok: false, error: m.tooManyRequests };
  }

  const d = parsed.data;
  const result = await createReservation({
    date: d.date,
    time: d.time,
    partySize: d.partySize,
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    email: d.email.toLowerCase(),
    notes: d.notes,
    lang,
  });
  if (!result.ok) return { ok: false, error: result.error };
  reservationReceived({
    reference: result.reference,
    date: d.date,
    time: d.time,
    partySize: d.partySize,
    name: `${d.firstName} ${d.lastName}`,
    phone: d.phone,
    email: d.email.toLowerCase(),
    notes: d.notes,
    lang,
  });
  return { ok: true, reference: result.reference };
}
