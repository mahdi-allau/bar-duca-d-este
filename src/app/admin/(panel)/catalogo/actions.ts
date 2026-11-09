"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { saveUpload } from "@/server/media";
import { failed, saved, type ActionResult } from "../result";

const CATEGORIES = ["colazione", "aperitivo", "pasticceria"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** "3,50" or "3.5" → 350 cents; empty → null (no price shown). */
const toCents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) : undefined;
};

const base = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).default(""),
  category: z.enum(CATEGORIES),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

function refresh() {
  for (const p of ["/admin/catalogo", "/colazione", "/aperitivo", "/pasticceria"]) revalidatePath(p);
}

async function imageFrom(formData: FormData, current: string | null) {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUpload(file);
    return saved.ok ? saved.url : current;
  }
  const chosen = String(formData.get("imageUrl") ?? "").trim();
  if (chosen && (chosen.startsWith("/api/media/") || chosen.startsWith("/foto/"))) return chosen;
  return current;
}

export async function saveProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const parsed = base.safeParse(Object.fromEntries(formData));
  const price = toCents(formData.get("price"));
  if (!parsed.success || !Number.isInteger(id)) return failed("Controlla il nome del prodotto.");
  if (price === undefined) return failed("Il prezzo non è valido: scrivilo come 3,50 oppure lascialo vuoto.");
  const current = String(formData.get("currentImage") ?? "") || null;
  const image = await imageFrom(formData, current);
  const d = parsed.data;
  await query(
    `UPDATE products SET name=$2, description=$3, category=$4, sort=$5, price_cents=$6, image=$7,
       active=$8, updated_at=now() WHERE id=$1`,
    [id, d.name, d.description, d.category, d.sort, price, image, formData.get("active") === "on"],
  );
  refresh();
  return saved("Prodotto salvato");
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = base.safeParse(Object.fromEntries(formData));
  const price = toCents(formData.get("price"));
  if (!parsed.success) return failed("Scrivi almeno il nome del prodotto.");
  if (price === undefined) return failed("Il prezzo non è valido: scrivilo come 3,50 oppure lascialo vuoto.");
  const d = parsed.data;
  const image = await imageFrom(formData, null);
  let slug = slugify(d.name) || "prodotto";
  const taken = await query<{ slug: string }>(`SELECT slug FROM products WHERE slug LIKE $1`, [`${slug}%`]);
  if (taken.some((t) => t.slug === slug)) slug = `${slug}-${taken.length + 1}`;
  await query(
    `INSERT INTO products (slug, category, name, description, price_cents, image, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [slug, d.category, d.name, d.description, price, image, d.sort],
  );
  refresh();
  return saved("Prodotto aggiunto");
}

export async function deleteProduct(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return failed("Prodotto non trovato.");
  await query(`DELETE FROM products WHERE id = $1`, [id]);
  refresh();
  return saved("Prodotto eliminato");
}
