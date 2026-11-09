import "server-only";
import { getDict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { addDays, isDate, isTime, nowInRome, toMinutes, weekdayOf } from "@/lib/dates";
import { query } from "./db";
import { getClosures, getOpeningHours } from "./settings";
import type { CakePricing } from "@/lib/cake/types";

const HORIZON_DAYS = 120;

/** Days on which a cake can be collected: after the notice period, on open days, not full. */
export async function getPickupDays(pricing: CakePricing): Promise<string[]> {
  const [hours, closures] = await Promise.all([getOpeningHours(), getClosures()]);
  const today = nowInRome().date;
  const first = addDays(today, pricing.minNoticeDays);
  const last = addDays(today, HORIZON_DAYS);

  const counts = new Map<string, number>();
  if (pricing.maxOrdersPerDay > 0) {
    const rows = await query<{ pickup_date: string; n: number | string }>(
      `SELECT pickup_date, count(*) AS n FROM cake_orders
       WHERE pickup_date BETWEEN $1 AND $2 AND status <> 'cancelled' GROUP BY pickup_date`,
      [first, last],
    );
    for (const r of rows) counts.set(r.pickup_date, Number(r.n));
  }

  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (closures.some((c) => c.from <= d && d <= c.to)) continue;
    if (hours.length > 0 && !hours.some((h) => h.weekday === weekdayOf(d))) continue;
    if (pricing.maxOrdersPerDay > 0 && (counts.get(d) ?? 0) >= pricing.maxOrdersPerDay) continue;
    days.push(d);
  }
  return days;
}

/** Throws a readable message when the chosen pickup date/time is not possible. */
export async function assertPickup(date: string, time: string, pricing: CakePricing, lang: Locale = "it") {
  const m = getDict(lang).server;
  if (!isDate(date)) throw new Error(m.pickDate);
  const days = await getPickupDays(pricing);
  if (!days.includes(date)) throw new Error(m.pickupUnavailable);
  if (time) {
    if (!isTime(time)) throw new Error(m.badPickupTime);
    const hours = (await getOpeningHours()).filter((h) => h.weekday === weekdayOf(date));
    if (hours.length > 0 && !hours.some((h) => toMinutes(time) >= toMinutes(h.open) && toMinutes(time) <= toMinutes(h.close))) {
      throw new Error(m.pickupOutside);
    }
  }
}
