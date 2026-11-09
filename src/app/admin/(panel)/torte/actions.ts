"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { isLocale } from "@/lib/i18n/config";
import { cakeStatusChanged } from "@/server/notify";
import { failed, saved, type ActionResult } from "../result";

const schema = z.object({
  id: z.string().min(8).max(64),
  status: z.enum(["new", "in_progress", "confirmed", "ready", "completed", "cancelled"]),
  adminNotes: z.string().max(2000).default(""),
});

type Before = {
  reference: string;
  status: string;
  pickup_date: string;
  pickup_time: string;
  customer_name: string;
  phone: string;
  email: string;
  total_cents: number;
  final_price_cents: number | null;
  price_breakdown: { pricesConfirmed?: boolean };
  lang: string;
};

export async function updateCakeOrder(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) return failed("Dati non validi: ricarica la pagina e riprova.");

  // The final price is what the customer will actually pay; empty keeps the computed total.
  const raw = String(formData.get("finalPrice") ?? "").trim().replace(",", ".");
  let finalCents: number | null = null;
  if (raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100000) return failed("Prezzo finale non valido: scrivi un importo come 45,00.");
    finalCents = Math.round(n * 100);
  }

  const [before] = await query<Before>(
    `SELECT reference, status, pickup_date, pickup_time, customer_name, phone, email, total_cents,
            final_price_cents, price_breakdown, lang
     FROM cake_orders WHERE id = $1`,
    [parsed.data.id],
  );
  if (!before) return failed("Ordine non trovato.");

  await query(
    `UPDATE cake_orders SET status=$2, admin_notes=$3, final_price_cents=$4, updated_at=now() WHERE id=$1`,
    [parsed.data.id, parsed.data.status, parsed.data.adminNotes.trim(), finalCents],
  );

  if (before.status !== parsed.data.status) {
    cakeStatusChanged(
      {
        reference: before.reference,
        name: before.customer_name,
        phone: before.phone,
        email: before.email,
        pickupDate: before.pickup_date,
        pickupTime: before.pickup_time,
        totalCents: before.total_cents,
        finalCents,
        confirmedPrices: before.price_breakdown?.pricesConfirmed !== false,
        lang: isLocale(before.lang) ? before.lang : "it",
      },
      parsed.data.status,
    );
  }
  revalidatePath("/admin/torte");
  revalidatePath("/admin");
  return saved("Ordine aggiornato");
}

/** One click to the next step of an order (confirm, start, ready, picked up), keeping prices and notes. */
export async function quickCakeStatus(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.pick({ id: true, status: true }).safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return failed("Dati non validi: ricarica la pagina e riprova.");
  const [before] = await query<Before>(
    `SELECT reference, status, pickup_date, pickup_time, customer_name, phone, email, total_cents,
            final_price_cents, price_breakdown, lang
     FROM cake_orders WHERE id = $1`,
    [parsed.data.id],
  );
  if (!before) return failed("Ordine non trovato.");
  await query(`UPDATE cake_orders SET status = $2, updated_at = now() WHERE id = $1`, [parsed.data.id, parsed.data.status]);
  if (before.status !== parsed.data.status) {
    cakeStatusChanged(
      {
        reference: before.reference,
        name: before.customer_name,
        phone: before.phone,
        email: before.email,
        pickupDate: before.pickup_date,
        pickupTime: before.pickup_time,
        totalCents: before.total_cents,
        finalCents: before.final_price_cents,
        confirmedPrices: before.price_breakdown?.pricesConfirmed !== false,
        lang: isLocale(before.lang) ? before.lang : "it",
      },
      parsed.data.status,
    );
  }
  revalidatePath("/admin/torte");
  revalidatePath("/admin");
  const done: Record<string, string> = {
    confirmed: "Ordine confermato",
    in_progress: "Ordine in lavorazione",
    ready: "Ordine pronto per il ritiro",
    completed: "Ordine ritirato",
    cancelled: "Ordine annullato",
  };
  return saved(done[parsed.data.status] ?? "Ordine aggiornato");
}
