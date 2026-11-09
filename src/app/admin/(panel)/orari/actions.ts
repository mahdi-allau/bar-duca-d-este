"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDate, isTime, toMinutes } from "@/lib/dates";
import { requireAdmin } from "@/server/auth";
import { query, transaction } from "@/server/db";
import { setSetting } from "@/server/settings";
import { failed, saved, type ActionResult } from "../result";

const done = () => {
  revalidatePath("/admin/orari");
  revalidatePath("/prenota");
};

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const settingsSchema = z.object({
  totalSeats: int(1, 500),
  slotMinutes: int(10, 120),
  durationMinutes: int(30, 360),
  maxPartySize: int(1, 50),
  minNoticeHours: int(0, 168),
  maxDaysAhead: int(1, 365),
});

export async function saveBookingSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("Controlla i numeri: posti da 1 a 500, intervallo da 10 a 120 minuti, durata da 30 a 360.");
  await setSetting("booking", { ...parsed.data, enabled: formData.get("enabled") === "on" });
  done();
  return saved(formData.get("enabled") === "on" ? "Regole salvate" : "Regole salvate: le prenotazioni online sono SOSPESE");
}

const dayRangeSchema = z.object({ weekday: int(0, 6) });

/** Replaces the opening ranges of one weekday (up to two: e.g. morning and evening). */
export async function saveWeekday(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const { weekday } = dayRangeSchema.parse({ weekday: formData.get("weekday") });
  const ranges: [string, string][] = [];
  for (const n of [1, 2]) {
    const open = String(formData.get(`open${n}`) ?? "");
    const close = String(formData.get(`close${n}`) ?? "");
    if (!open && !close) continue;
    if (!isTime(open) || !isTime(close) || toMinutes(close) <= toMinutes(open)) {
      return failed("Controlla gli orari: servono sia apertura sia chiusura, e la chiusura deve essere dopo l'apertura.");
    }
    ranges.push([open, close]);
  }
  await transaction(async (q) => {
    await q(`DELETE FROM opening_hours WHERE weekday = $1`, [weekday]);
    for (const [open, close] of ranges) {
      await q(`INSERT INTO opening_hours (weekday, open_time, close_time) VALUES ($1,$2,$3)`, [weekday, open, close]);
    }
  });
  done();
  return saved(ranges.length ? "Orari del giorno salvati" : "Giorno segnato come chiuso");
}

export async function addClosure(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "") || from;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 120);
  if (!isDate(from)) return failed("Scegli il primo giorno di chiusura.");
  if (!isDate(to) || to < from) return failed("L'ultimo giorno non può essere prima del primo.");
  await query(`INSERT INTO closures (date_from, date_to, reason) VALUES ($1,$2,$3)`, [from, to, reason]);
  done();
  return saved("Chiusura aggiunta");
}

export async function deleteClosure(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return failed("Chiusura non trovata.");
  await query(`DELETE FROM closures WHERE id = $1`, [id]);
  done();
  return saved("Chiusura rimossa");
}

/** Same opening hours for every day of the week (a quick start the owner can then adjust). */
export async function saveAllWeekdays(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const ranges: [string, string][] = [];
  for (const n of [1, 2]) {
    const open = String(formData.get(`open${n}`) ?? "");
    const close = String(formData.get(`close${n}`) ?? "");
    if (!open && !close) continue;
    if (!isTime(open) || !isTime(close) || toMinutes(close) <= toMinutes(open)) {
      return failed("Controlla gli orari: servono sia apertura sia chiusura, e la chiusura deve essere dopo l'apertura.");
    }
    ranges.push([open, close]);
  }
  if (ranges.length === 0) return failed("Scrivi almeno una fascia di apertura.");
  const days = formData.getAll("days").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (days.length === 0) return failed("Scegli almeno un giorno.");
  await transaction(async (q) => {
    for (const weekday of days) {
      await q(`DELETE FROM opening_hours WHERE weekday = $1`, [weekday]);
      for (const [open, close] of ranges) {
        await q(`INSERT INTO opening_hours (weekday, open_time, close_time) VALUES ($1,$2,$3)`, [weekday, open, close]);
      }
    }
  });
  done();
  return saved(`Orari salvati per ${days.length} ${days.length === 1 ? "giorno" : "giorni"}`);
}
