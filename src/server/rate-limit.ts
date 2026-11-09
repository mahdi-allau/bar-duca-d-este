import "server-only";
import { headers } from "next/headers";
import { one, query } from "./db";

/** Best-effort client address (behind Netlify/Vercel the first hop is the visitor). */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Sliding-window limiter backed by the database, so it also works across
 * serverless instances. Returns false when the caller is over the limit.
 */
export async function allow(key: string, max: number, windowSeconds: number) {
  const row = await one<{ n: number | string }>(
    `SELECT count(*) AS n FROM rate_limits WHERE key = $1 AND at > now() - ($2 || ' seconds')::interval`,
    [key, String(windowSeconds)],
  );
  if (Number(row?.n ?? 0) >= max) return false;
  await query(`INSERT INTO rate_limits (key) VALUES ($1)`, [key]);
  // opportunistic cleanup
  if (Math.random() < 0.05) await query(`DELETE FROM rate_limits WHERE at < now() - interval '1 day'`);
  return true;
}
