"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { failed, saved, type ActionResult } from "../result";

const cents = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "0").trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 10000 ? Math.round(n * 100) : null;
};

const schema = z.object({
  id: z.coerce.number().int(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).default(""),
  sort: z.coerce.number().int().min(0).max(999).default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

function refresh() {
  revalidatePath("/admin/ingredienti");
  revalidatePath("/crea-la-tua-torta");
}

export async function saveOption(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    sort: formData.get("sort") ?? 0,
    color: formData.get("color") || undefined,
  });
  const price = cents(formData.get("price"));
  if (!parsed.success) return failed("Controlla il nome dell'ingrediente.");
  if (price === null) return failed("Il supplemento non è valido: scrivilo come 5,00 oppure 0.");
  const d = parsed.data;
  await query(
    `UPDATE cake_options SET name=$2, description=$3, sort=$4, price_cents=$5, active=$6,
       data = CASE WHEN $7::text IS NULL THEN data ELSE jsonb_set(data, '{color}', to_jsonb($7::text)) END
     WHERE id=$1`,
    [d.id, d.name, d.description, d.sort, price, formData.get("active") === "on", d.color ?? null],
  );
  refresh();
  return saved("Ingrediente salvato");
}

const addSchema = z.object({
  kind: z.enum(["sponge", "filling"]),
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function addOption(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  const price = cents(formData.get("price"));
  if (!parsed.success) return failed("Scrivi il nome del nuovo ingrediente e scegli il tipo.");
  if (price === null) return failed("Il supplemento non è valido: scrivilo come 5,00 oppure 0.");
  const d = parsed.data;
  const slug =
    d.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "nuovo";
  const clash = await query(`SELECT 1 FROM cake_options WHERE kind=$1 AND slug=$2`, [d.kind, slug]);
  const finalSlug = clash.length ? `${slug}-${Date.now().toString(36)}` : slug;
  const [{ max }] = await query<{ max: number | null }>(`SELECT max(sort) AS max FROM cake_options WHERE kind=$1`, [d.kind]);
  await query(
    `INSERT INTO cake_options (kind, slug, name, price_cents, sort, data) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [d.kind, finalSlug, d.name, price, (max ?? 0) + 1, JSON.stringify({ color: d.color, gloss: 0.3 })],
  );
  refresh();
  return saved("Ingrediente aggiunto: ora compare nel configuratore");
}
