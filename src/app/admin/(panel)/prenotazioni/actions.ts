"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { createReservation } from "@/server/booking";
import { query } from "@/server/db";
import { isLocale } from "@/lib/i18n/config";
import { reservationStatusChanged } from "@/server/notify";
import { failed, saved, type ActionResult } from "../result";

const STATES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;

const schema = z.object({
  id: z.string().min(8).max(64),
  status: z.enum(STATES),
  adminNotes: z.string().max(1000).default(""),
});

type Before = {
  reference: string;
  status: string;
  date: string;
  time: string;
  party_size: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
  lang: string;
};

async function apply(id: string, status: (typeof STATES)[number], adminNotes: string | null): Promise<boolean> {
  const [before] = await query<Before>(
    `SELECT reference, status, date, time, party_size, first_name, last_name, phone, email, notes, lang
     FROM reservations WHERE id = $1`,
    [id],
  );
  if (!before) return false;
  await query(
    `UPDATE reservations SET status = $2, admin_notes = COALESCE($3, admin_notes), updated_at = now() WHERE id = $1`,
    [id, status, adminNotes],
  );
  // The guest is told only when the status really changes, never on a plain note edit.
  if (before.status !== status && before.email) {
    reservationStatusChanged(
      {
        reference: before.reference,
        date: before.date,
        time: before.time,
        partySize: before.party_size,
        name: `${before.first_name} ${before.last_name}`,
        phone: before.phone,
        email: before.email,
        notes: before.notes,
        lang: isLocale(before.lang) ? before.lang : "it",
      },
      status,
    );
  }
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/admin");
  return true;
}

export async function updateReservation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) return failed("Dati non validi: ricarica la pagina e riprova.");
  const ok = await apply(parsed.data.id, parsed.data.status, parsed.data.adminNotes.trim());
  return ok ? saved("Prenotazione aggiornata") : failed("Prenotazione non trovata.");
}

/** One-click confirm / cancel / completed from the list, without touching the notes. */
export async function quickReservation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.pick({ id: true, status: true }).safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return failed("Dati non validi: ricarica la pagina e riprova.");
  const ok = await apply(parsed.data.id, parsed.data.status, null);
  if (!ok) return failed("Prenotazione non trovata.");
  return saved(parsed.data.status === "confirmed" ? "Prenotazione confermata" : parsed.data.status === "cancelled" ? "Prenotazione annullata" : "Prenotazione aggiornata");
}

export type StaffState = null | { ok: true; reference: string } | { ok: false; error: string };

const staffSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Scegli la data."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Scegli l'orario."),
  partySize: z.coerce.number().int().min(1, "Quante persone?").max(500),
  firstName: z.string().trim().min(1, "Inserisci il nome.").max(60),
  lastName: z.string().trim().max(60).default(""),
  phone: z.string().trim().max(30).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Email non valida.").max(200)]).default(""),
  notes: z.string().trim().max(500).default(""),
});

/** Booking taken by phone or at the counter: confirmed at once, optionally even over the table plan. */
export async function createStaffReservation(_prev: StaffState, formData: FormData): Promise<StaffState> {
  await requireAdmin();
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const d = parsed.data;
  const result = await createReservation(
    { ...d, email: d.email.toLowerCase() },
    { admin: true, force: formData.get("force") === "on" },
  );
  if (!result.ok) return result;
  if (d.email) {
    reservationStatusChanged(
      {
        reference: result.reference,
        date: d.date,
        time: d.time,
        partySize: d.partySize,
        name: `${d.firstName} ${d.lastName}`.trim(),
        phone: d.phone,
        email: d.email.toLowerCase(),
      },
      "confirmed",
    );
  }
  revalidatePath("/admin/prenotazioni");
  revalidatePath("/admin");
  return { ok: true, reference: result.reference };
}
