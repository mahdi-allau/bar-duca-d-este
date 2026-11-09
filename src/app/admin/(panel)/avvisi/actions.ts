"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth";
import { query } from "@/server/db";
import { isPushEndpoint, pushConfigured, sendPush } from "@/server/push";
import { failed, saved, type ActionResult } from "../result";

const b64url = z.string().min(8).max(300).regex(/^[A-Za-z0-9_-]+={0,2}$/);
const subscription = z.object({
  endpoint: z.string().url().max(1200),
  keys: z.object({ p256dh: b64url, auth: b64url }),
});

/** Called by the page right after the phone has agreed to receive notifications. */
export async function savePushSubscription(input: unknown, label: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!pushConfigured()) return failed("Gli avvisi non sono ancora configurati sul sito.");
  const parsed = subscription.safeParse(input);
  if (!parsed.success || !isPushEndpoint(parsed.data.endpoint)) return failed("Il telefono ha mandato dati non validi. Riprova.");
  const { endpoint, keys } = parsed.data;

  const [{ n }] = await query<{ n: number | string }>(`SELECT count(*) AS n FROM push_subscriptions`);
  if (Number(n) >= 20) return failed("Ci sono già troppi telefoni collegati. Disattiva quelli che non usi più.");

  await query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, label, admin_email)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, label = EXCLUDED.label,
       admin_email = EXCLUDED.admin_email, last_error = ''`,
    [endpoint, keys.p256dh, keys.auth, String(label ?? "").slice(0, 60), admin.email],
  );
  revalidatePath("/admin/avvisi");
  revalidatePath("/admin");
  return saved("Avvisi attivati su questo telefono");
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  await requireAdmin();
  if (typeof endpoint !== "string" || endpoint.length > 1200) return failed("Dati non validi.");
  await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
  revalidatePath("/admin/avvisi");
  revalidatePath("/admin");
  return saved("Avvisi disattivati");
}

export async function sendTestPush(): Promise<ActionResult> {
  await requireAdmin();
  const res = await sendPush({
    title: "Prova avvisi",
    body: "Se leggi questo messaggio, gli avvisi funzionano.",
    url: "/admin/avvisi",
    tag: "prova",
  });
  revalidatePath("/admin/avvisi");
  if (res.sent > 0) return saved(res.sent === 1 ? "Avviso di prova inviato: guarda il telefono" : `Avviso di prova inviato a ${res.sent} telefoni`);
  return failed(res.error ?? "Non è partito nessun avviso.");
}
