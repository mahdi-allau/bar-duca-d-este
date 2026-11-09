"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { setSetting } from "@/server/settings";
import { failed, saved, type ActionResult } from "../result";

const euroToCents = z
  .string()
  .trim()
  .transform((s) => Number(s.replace(",", ".")))
  .refine((n) => Number.isFinite(n) && n >= 0 && n < 100000, "Importo non valido")
  .transform((n) => Math.round(n * 100));

const schema = z.object({
  basePriceCents: euroToCents,
  includedPersons: z.coerce.number().int().min(1).max(200),
  extraPersonCents: euroToCents,
  extraTierCents: euroToCents,
  textPriceCents: euroToCents,
  minPersons: z.coerce.number().int().min(1).max(200),
  maxPersons: z.coerce.number().int().min(1).max(300),
  minNoticeDays: z.coerce.number().int().min(0).max(60),
  maxOrdersPerDay: z.coerce.number().int().min(0).max(500),
});

export async function savePricing(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("Controlla i numeri: gli importi si scrivono come 30,00.");
  if (parsed.data.minPersons > parsed.data.maxPersons) return failed("Le persone minime non possono superare le massime.");
  await setSetting("cake_pricing", { ...parsed.data, pricesConfirmed: formData.get("pricesConfirmed") === "on" });
  revalidatePath("/admin/prezzi");
  revalidatePath("/admin");
  revalidatePath("/crea-la-tua-torta");
  return saved(formData.get("pricesConfirmed") === "on" ? "Prezzi salvati e confermati: il sito non dice più «indicativi»" : "Prezzi salvati (sul sito restano «indicativi»)");
}
