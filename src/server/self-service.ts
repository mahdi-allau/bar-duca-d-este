import "server-only";
import { addDays, formatDateLong, nowInRome, toMinutes } from "@/lib/dates";
import type { CakeConfig, PriceBreakdown } from "@/lib/cake/types";
import { DEFAULT_CONFIG } from "@/lib/cake/defaults";
import { getDict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { asJson } from "@/lib/json";
import { alertOwner } from "./notify";
import { one, query } from "./db";
import { getCakePricing } from "./settings";

/** What a customer may look at (and, in some cases, cancel) with a code and the e-mail used. */
export type Found =
  | {
      kind: "reservation";
      reference: string;
      status: string;
      date: string;
      time: string;
      partySize: number;
      name: string;
      notes: string;
      canCancel: boolean;
    }
  | {
      kind: "cake";
      reference: string;
      status: string;
      pickupDate: string;
      pickupTime: string;
      totalCents: number;
      finalCents: number | null;
      config: CakeConfig;
      breakdown: PriceBreakdown & { pricesConfirmed?: boolean };
      previews: string[];
      notes: string;
      canCancel: boolean;
    }
  | {
      kind: "request";
      reference: string;
      status: string;
      type: string;
      message: string;
      eventDate: string;
      cakeReference: string;
    };

const prefixOf = (code: string) => code.trim().toUpperCase();

export async function findOwn(code: string, email: string): Promise<Found | null> {
  const ref = prefixOf(code);
  const mail = email.trim().toLowerCase();
  const now = nowInRome();

  if (ref.startsWith("DE-")) {
    const r = await one<{
      reference: string;
      status: string;
      date: string;
      time: string;
      party_size: number;
      first_name: string;
      last_name: string;
      notes: string;
    }>(
      `SELECT reference, status, date, time, party_size, first_name, last_name, notes
       FROM reservations WHERE reference = $1 AND lower(email) = $2`,
      [ref, mail],
    );
    if (!r) return null;
    const future = r.date > now.date || (r.date === now.date && toMinutes(r.time) > now.minutes);
    return {
      kind: "reservation",
      reference: r.reference,
      status: r.status,
      date: r.date,
      time: r.time,
      partySize: r.party_size,
      name: `${r.first_name} ${r.last_name}`,
      notes: r.notes,
      canCancel: future && (r.status === "pending" || r.status === "confirmed"),
    };
  }

  if (ref.startsWith("TO-")) {
    const r = await one<{
      reference: string;
      status: string;
      pickup_date: string;
      pickup_time: string;
      total_cents: number;
      final_price_cents: number | null;
      config: CakeConfig;
      price_breakdown: PriceBreakdown & { pricesConfirmed?: boolean };
      preview_images: string[];
      notes: string;
    }>(
      `SELECT reference, status, pickup_date, pickup_time, total_cents, final_price_cents, config,
              price_breakdown, preview_images, notes
       FROM cake_orders WHERE reference = $1 AND lower(email) = $2`,
      [ref, mail],
    );
    if (!r) return null;
    const pricing = await getCakePricing();
    // A cake is cancelled online until the notice period before pickup; after that the bakery has started.
    const canCancel =
      (r.status === "new" || r.status === "confirmed") && r.pickup_date >= addDays(now.date, pricing.minNoticeDays);
    return {
      kind: "cake",
      reference: r.reference,
      status: r.status,
      pickupDate: r.pickup_date,
      pickupTime: r.pickup_time,
      totalCents: r.total_cents,
      finalCents: r.final_price_cents,
      config: asJson<CakeConfig>(r.config, DEFAULT_CONFIG),
      breakdown: asJson<PriceBreakdown & { pricesConfirmed?: boolean }>(r.price_breakdown, { baseCents: 0, lines: [], extrasCents: 0, totalCents: 0 }),
      previews: asJson<string[]>(r.preview_images, []),
      notes: r.notes,
      canCancel,
    };
  }

  if (ref.startsWith("RI-")) {
    const r = await one<{
      reference: string;
      status: string;
      kind: string;
      message: string;
      event_date: string;
      cake_reference: string;
    }>(
      `SELECT reference, status, kind, message, event_date, cake_reference
       FROM event_requests WHERE reference = $1 AND lower(email) = $2`,
      [ref, mail],
    );
    if (!r) return null;
    return {
      kind: "request",
      reference: r.reference,
      status: r.status,
      type: r.kind,
      message: r.message,
      eventDate: r.event_date,
      cakeReference: r.cake_reference,
    };
  }
  return null;
}

/** Cancels a reservation or a cake order for the customer who owns it. */
export async function cancelOwn(code: string, email: string, lang: Locale = "it"): Promise<{ ok: true } | { ok: false; error: string }> {
  const m = getDict(lang).server;
  const found = await findOwn(code, email);
  if (!found || found.kind === "request") return { ok: false, error: m.cantFind };
  if (!found.canCancel) {
    return { ok: false, error: m.cancelTooLate };
  }

  if (found.kind === "reservation") {
    await query(
      `UPDATE reservations SET status = 'cancelled', updated_at = now(),
         admin_notes = trim(both E'\\n' from admin_notes || E'\\nAnnullata dal cliente.')
       WHERE reference = $1 AND status IN ('pending','confirmed')`,
      [found.reference],
    );
    alertOwner(
      `Prenotazione annullata dal cliente: ${found.reference}`,
      `${found.name} ha annullato la prenotazione del ${formatDateLong(found.date)} alle ${found.time} (${found.partySize} persone).`,
    );
  } else {
    await query(
      `UPDATE cake_orders SET status = 'cancelled', updated_at = now(),
         admin_notes = trim(both E'\\n' from admin_notes || E'\\nAnnullato dal cliente.')
       WHERE reference = $1 AND status IN ('new','confirmed')`,
      [found.reference],
    );
    alertOwner(
      `Ordine torta annullato dal cliente: ${found.reference}`,
      `Il cliente ha annullato l'ordine con ritiro ${formatDateLong(found.pickupDate)}.`,
    );
  }
  return { ok: true };
}
