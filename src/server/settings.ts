import "server-only";
import { DEFAULT_PRICING } from "@/lib/cake/defaults";
import { asJson } from "@/lib/json";
import type { CakeOption, CakePricing } from "@/lib/cake/types";
import { one, query } from "./db";

export type BookingSettings = {
  enabled: boolean;
  slotMinutes: number;
  durationMinutes: number;
  totalSeats: number | null;
  maxPartySize: number;
  minNoticeHours: number;
  maxDaysAhead: number;
};

const BOOKING_FALLBACK: BookingSettings = {
  enabled: true,
  slotMinutes: 30,
  durationMinutes: 90,
  totalSeats: null,
  maxPartySize: 10,
  minNoticeHours: 2,
  maxDaysAhead: 60,
};

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await one<{ value: unknown }>(`SELECT value FROM settings WHERE key = $1`, [key]);
  return { ...fallback, ...asJson<Partial<T>>(row?.value, {}) };
}

export async function setSetting(key: string, value: unknown) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1,$2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

export const getBookingSettings = () => getSetting("booking", BOOKING_FALLBACK);
export const getCakePricing = () => getSetting<CakePricing>("cake_pricing", DEFAULT_PRICING);

type OptionRow = {
  id: number;
  kind: CakeOption["kind"];
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  active: boolean;
  sort: number;
  data: Record<string, unknown>;
};

export async function getCakeOptions(includeInactive = false): Promise<CakeOption[]> {
  const rows = await query<OptionRow>(
    `SELECT id, kind, slug, name, description, price_cents, active, sort, data
     FROM cake_options ${includeInactive ? "" : "WHERE active = TRUE"} ORDER BY kind, sort, id`,
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    slug: r.slug,
    name: r.name,
    description: r.description,
    priceCents: r.price_cents,
    active: r.active,
    sort: r.sort,
    data: asJson<Record<string, unknown>>(r.data, {}),
  }));
}

export async function getCakeCatalog() {
  const [options, pricing] = await Promise.all([getCakeOptions(), getCakePricing()]);
  return { options, pricing };
}

export type OpeningRange = { id: number; weekday: number; open: string; close: string };

export async function getOpeningHours(): Promise<OpeningRange[]> {
  const rows = await query<{ id: number; weekday: number; open_time: string; close_time: string }>(
    `SELECT id, weekday, open_time, close_time FROM opening_hours ORDER BY weekday, open_time`,
  );
  return rows.map((r) => ({ id: r.id, weekday: r.weekday, open: r.open_time, close: r.close_time }));
}

export type Closure = { id: number; from: string; to: string; reason: string };

export async function getClosures(): Promise<Closure[]> {
  const rows = await query<{ id: number; date_from: string; date_to: string; reason: string }>(
    `SELECT id, date_from, date_to, reason FROM closures ORDER BY date_from`,
  );
  return rows.map((r) => ({ id: r.id, from: r.date_from, to: r.date_to, reason: r.reason }));
}
