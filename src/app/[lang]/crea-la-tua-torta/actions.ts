"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDict } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { cakeConfigSchema, computePrice, normalizeConfig } from "@/lib/cake/pricing";
import { newReference } from "@/server/booking";
import { assertPickup } from "@/server/cake-orders";
import { query } from "@/server/db";
import { cakeOrderReceived } from "@/server/notify";
import { allow, clientIp } from "@/server/rate-limit";
import { getCakeCatalog } from "@/server/settings";

export type OrderState =
  | { ok: true; reference: string; totalCents: number }
  | { ok: false; error: string; fields?: Record<string, string> };

const schemaFor = (lang: Locale) => {
  const m = getDict(lang).server;
  const preview = z
    .string()
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, m.badPreview)
    .max(700_000);
  return z.object({
    config: cakeConfigSchema,
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.pickDate),
    pickupTime: z.string().regex(/^(\d{2}:\d{2})?$/).default(""),
    name: z.string().trim().min(2, m.yourName).max(100),
    phone: z.string().trim().regex(/^[+0-9][0-9 ()./-]{5,24}$/, m.phone),
    email: z.string().trim().email(m.email).max(200),
    notes: z.string().trim().max(600).default(""),
    previews: z.array(preview).max(3).default([]),
    privacy: z.literal(true, { error: m.consentOrder }),
    website: z.string().max(0).default(""),
  });
};

/**
 * Saves a cake order. The price is always recomputed here from the database:
 * whatever the browser says about prices is ignored.
 */
export async function submitCakeOrder(input: unknown): Promise<OrderState> {
  const asked = (input as { lang?: unknown } | null)?.lang;
  const lang: Locale = isLocale(asked) ? asked : "it";
  const m = getDict(lang).server;
  const parsed = schemaFor(lang).safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: m.checkFields, fields };
  }
  const d = parsed.data;

  if (!(await allow(`cake:${await clientIp()}`, 6, 3600))) {
    return { ok: false, error: m.tooManyOrders };
  }

  const { options, pricing } = await getCakeCatalog();
  try {
    await assertPickup(d.pickupDate, d.pickupTime, pricing, lang);
  } catch (e) {
    return { ok: false, error: (e as Error).message, fields: { pickupDate: (e as Error).message } };
  }

  const config = normalizeConfig(d.config, options, pricing);
  const price = computePrice(config, options, pricing);
  const reference = newReference("TO");

  await query(
    `INSERT INTO cake_orders
       (id, reference, pickup_date, pickup_time, customer_name, phone, email, notes,
        config, price_breakdown, total_cents, preview_images, lang)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13)`,
    [
      randomUUID(),
      reference,
      d.pickupDate,
      d.pickupTime,
      d.name,
      d.phone,
      d.email.toLowerCase(),
      d.notes,
      JSON.stringify(config),
      JSON.stringify({ ...price, pricesConfirmed: pricing.pricesConfirmed }),
      price.totalCents,
      JSON.stringify(d.previews),
      lang,
    ],
  );
  cakeOrderReceived({
    reference,
    name: d.name,
    phone: d.phone,
    email: d.email.toLowerCase(),
    pickupDate: d.pickupDate,
    pickupTime: d.pickupTime,
    totalCents: price.totalCents,
    confirmedPrices: pricing.pricesConfirmed,
    lang,
  });
  return { ok: true, reference, totalCents: price.totalCents };
}
