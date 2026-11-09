"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { failed, saved, type ActionResult } from "../result";

const SLUGS = ["home", "colazione", "pasticceria", "aperitivo", "prenota", "torte-personalizzate", "crea-la-tua-torta"];

const schema = z.object({
  slug: z.enum(SLUGS as [string, ...string[]]),
  title: z.string().trim().max(120),
  description: z.string().trim().max(320),
});

export async function saveSeo(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("Titolo (max 120 caratteri) o descrizione (max 320) troppo lunghi.");
  const d = parsed.data;
  await query(
    `INSERT INTO seo_pages (slug, title, description, updated_at) VALUES ($1,$2,$3, now())
     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = now()`,
    [d.slug, d.title, d.description],
  );
  revalidatePath("/admin/seo");
  revalidatePath(d.slug === "home" ? "/" : `/${d.slug}`);
  return saved("Titolo e descrizione salvati");
}
