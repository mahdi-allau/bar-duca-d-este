import "server-only";
import { after } from "next/server";
import { sendNotification, setVapidDetails } from "web-push";
import { SITE } from "@/lib/site";
import { query } from "./db";

/**
 * Notifications on the owner's phone (Web Push). Needs two keys in the environment:
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   generate a pair with `npx web-push generate-vapid-keys`
 * Optional: VAPID_SUBJECT (a mailto: or https: address; defaults to the shop e-mail).
 * Without the keys nothing is sent and nothing breaks.
 */

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/**
 * A subscription's endpoint is a URL the browser vendor gave to the device, but it comes from the
 * browser, so the server only ever calls the real push services. (PUSH_EXTRA_ORIGIN is for tests.)
 */
export function isPushEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (process.env.PUSH_EXTRA_ORIGIN && u.origin === process.env.PUSH_EXTRA_ORIGIN) return true;
    if (u.protocol !== "https:" || u.port) return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "fcm.googleapis.com" ||
      h === "updates.push.services.mozilla.com" ||
      h === "web.push.apple.com" ||
      h.endsWith(".push.apple.com") ||
      h.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}

export type SubRow = { endpoint: string; p256dh: string; auth: string; label: string; admin_email: string; created_at: string; last_ok_at: string | null; last_error: string };

let configuredFor = "";
function configure() {
  const subject = process.env.VAPID_SUBJECT || `mailto:${SITE.email}`;
  const key = `${subject}|${pushPublicKey()}`;
  if (configuredFor === key) return;
  setVapidDetails(subject, pushPublicKey(), process.env.VAPID_PRIVATE_KEY || "");
  configuredFor = key;
}

export type PushResult = { sent: number; failed: number; removed: number; error?: string };

/** Sends one notification to every phone that has turned them on. Dead subscriptions are removed. */
export async function sendPush(payload: PushPayload): Promise<PushResult> {
  if (!pushConfigured()) return { sent: 0, failed: 0, removed: 0, error: "Gli avvisi non sono configurati sul sito." };
  configure();
  const subs = await query<SubRow>(`SELECT * FROM push_subscriptions`);
  if (subs.length === 0) return { sent: 0, failed: 0, removed: 0, error: "Nessun telefono ha attivato gli avvisi." };

  // the number on the app icon: everything that is waiting for an answer
  const [{ n }] = await query<{ n: number | string }>(
    `SELECT (SELECT count(*) FROM reservations WHERE status = 'pending')
          + (SELECT count(*) FROM cake_orders WHERE status = 'new')
          + (SELECT count(*) FROM event_requests WHERE status = 'new') AS n`,
  );
  const body = JSON.stringify({ ...payload, badge: Number(n) });

  const out: PushResult = { sent: 0, failed: 0, removed: 0 };
  await Promise.all(
    subs.map(async (s) => {
      if (!isPushEndpoint(s.endpoint)) {
        await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [s.endpoint]);
        out.removed++;
        return;
      }
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 12,
          urgency: "high",
          timeout: 10000,
        });
        out.sent++;
        await query(`UPDATE push_subscriptions SET last_ok_at = now(), last_error = '' WHERE endpoint = $1`, [s.endpoint]);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // the phone removed the app or turned the notifications off
          await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [s.endpoint]);
          out.removed++;
        } else {
          out.failed++;
          out.error = status ? `Il servizio di notifiche ha risposto ${status}.` : `Non sono riuscito a contattare il servizio di notifiche (${(e as Error).message}).`;
          console.error("[push] not sent:", status ?? (e as Error).message);
          await query(`UPDATE push_subscriptions SET last_error = $2 WHERE endpoint = $1`, [s.endpoint, out.error.slice(0, 300)]);
        }
      }
    }),
  );
  return out;
}

/** Sends after the response has gone out, so the customer never waits for it. */
export function queuePush(payload: PushPayload) {
  if (!pushConfigured()) return;
  const run = async () => {
    try {
      await sendPush(payload);
    } catch (e) {
      console.error("[push] failed:", (e as Error).message);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
