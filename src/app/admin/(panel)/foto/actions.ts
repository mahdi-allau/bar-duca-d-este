"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { saveUpload } from "@/server/media";
import { failed, saved, type ActionResult } from "../result";

export type UploadState = { message: string; ok: boolean } | null;

export async function uploadPhotos(_prev: UploadState, formData: FormData): Promise<UploadState> {
  await requireAdmin();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, message: "Scegli almeno una foto." };
  let saved = 0;
  const errors: string[] = [];
  for (const f of files.slice(0, 10)) {
    const r = await saveUpload(f);
    if (r.ok) saved++;
    else errors.push(`${f.name}: ${r.error}`);
  }
  revalidatePath("/admin/foto");
  return {
    ok: errors.length === 0,
    message: `${saved} foto caricate.${errors.length ? ` ${errors.join(" ")}` : ""}`,
  };
}

export async function deletePhoto(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return failed("Foto non trovata.");
  const url = `/api/media/${id}`;
  const used = await query(`SELECT 1 FROM products WHERE image = $1 LIMIT 1`, [url]);
  if (used.length > 0) return failed("Questa foto è usata da un prodotto: cambia prima la foto del prodotto.");
  await query(`DELETE FROM media WHERE id = $1`, [id]);
  revalidatePath("/admin/foto");
  return saved("Foto eliminata");
}
