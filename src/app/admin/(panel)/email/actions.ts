"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { mailStatus, sendMailNow, testMail } from "@/server/notify";
import { failed, saved, type ActionResult } from "../result";

const schema = z.object({ to: z.string().trim().toLowerCase().email().max(200) });

export async function sendTestEmail(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  if (!mailStatus().enabled) {
    return failed("Le email non sono ancora attive: mancano la chiave Resend e il mittente. Segui i passi qui sotto.");
  }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("Scrivi un indirizzo email valido.");

  // a test button must not turn into a mailing tool
  const [{ n }] = await query<{ n: number | string }>(
    `SELECT count(*) AS n FROM mail_log WHERE kind = 'test' AND created_at > now() - interval '1 hour'`,
  );
  if (Number(n) >= 10) return failed("Hai già inviato 10 prove nell'ultima ora. Riprova più tardi.");

  const res = await sendMailNow(testMail(parsed.data.to));
  revalidatePath("/admin/email");
  revalidatePath("/admin");
  return res.ok ? saved(`Email di prova inviata a ${parsed.data.to}`) : failed(res.error);
}
