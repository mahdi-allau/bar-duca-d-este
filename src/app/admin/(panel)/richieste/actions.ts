"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { failed, saved, type ActionResult } from "../result";

const schema = z.object({
  id: z.string().min(8).max(64),
  status: z.enum(["new", "in_progress", "quoted", "confirmed", "done", "rejected"]),
  adminNotes: z.string().max(2000).default(""),
});

export async function updateRequest(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") ?? "",
  });
  if (!parsed.success) return failed("Dati non validi: ricarica la pagina e riprova.");
  await query(`UPDATE event_requests SET status = $2, admin_notes = $3, updated_at = now() WHERE id = $1`, [
    parsed.data.id,
    parsed.data.status,
    parsed.data.adminNotes.trim(),
  ]);
  revalidatePath("/admin/richieste");
  revalidatePath("/admin");
  return saved("Richiesta aggiornata");
}
