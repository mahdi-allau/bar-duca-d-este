import "server-only";
import { randomUUID } from "node:crypto";
import { addDays, fromMinutes, isDate, isTime, nowInRome, toMinutes, weekdayOf } from "@/lib/dates";
import { getDict } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { query, transaction, type Q } from "./db";
import { getBookingSettings, getClosures, getOpeningHours, type BookingSettings } from "./settings";

export type Slot = { time: string; seatsLeft: number; available: boolean };

export type Availability = {
  /** false = nothing can be booked that day, see `reason`. */
  open: boolean;
  reason?: string;
  slots: Slot[];
};

type Config = {
  booking: BookingSettings;
  hours: Awaited<ReturnType<typeof getOpeningHours>>;
  closures: Awaited<ReturnType<typeof getClosures>>;
};

export async function loadConfig(): Promise<Config> {
  const [booking, hours, closures] = await Promise.all([getBookingSettings(), getOpeningHours(), getClosures()]);
  return { booking, hours, closures };
}

/** Why online booking is not possible at all (null = it is). */
export function bookingClosedReason({ booking, hours }: Config, lang: Locale = "it"): string | null {
  const m = getDict(lang).server;
  if (!booking.enabled) return m.suspended;
  if (hours.length === 0 || !booking.totalSeats) return m.notActive;
  return null;
}

function dayState(date: string, cfg: Config, admin = false, lang: Locale = "it") {
  const m = getDict(lang).server;
  const now = nowInRome();
  if (!isDate(date)) return { ok: false as const, reason: m.badDate };
  if (date < now.date) return { ok: false as const, reason: m.past };
  if (!admin && date > addDays(now.date, cfg.booking.maxDaysAhead)) {
    return { ok: false as const, reason: fmt(m.tooFar, { n: cfg.booking.maxDaysAhead }) };
  }
  const closure = cfg.closures.find((c) => c.from <= date && date <= c.to);
  if (closure) {
    // the reason was typed by the owner, in Italian: it is shown as written
    return { ok: false as const, reason: closure.reason ? fmt(m.closedFor, { reason: closure.reason }) : m.closed };
  }
  const ranges = cfg.hours.filter((h) => h.weekday === weekdayOf(date));
  if (ranges.length === 0) return { ok: false as const, reason: m.dayClosed };
  return { ok: true as const, ranges, now };
}

type Booked = { time: string; party_size: number };

/** People seated at minute `at`, counting every active reservation that covers it. */
function occupancyAt(at: number, booked: Booked[], duration: number) {
  return booked.reduce((sum, r) => {
    const start = toMinutes(r.time);
    return start <= at && at < start + duration ? sum + r.party_size : sum;
  }, 0);
}

function buildSlots(date: string, party: number, cfg: Config, booked: Booked[], admin = false, lang: Locale = "it"): Availability {
  const state = dayState(date, cfg, admin, lang);
  if (!state.ok) return { open: false, reason: state.reason, slots: [] };

  const { slotMinutes, durationMinutes, totalSeats, minNoticeHours } = cfg.booking;
  const seats = totalSeats ?? 0;
  const earliest = !admin && date === state.now.date ? state.now.minutes + minNoticeHours * 60 : 0;

  const slots: Slot[] = [];
  for (const r of state.ranges) {
    const open = toMinutes(r.open);
    const close = toMinutes(r.close);
    for (let t = open; t <= close - slotMinutes; t += slotMinutes) {
      if (t < earliest) continue;
      // A table is held for `durationMinutes`, so check every moment of that stay.
      let peak = 0;
      for (let m = t; m < t + durationMinutes; m += 15) peak = Math.max(peak, occupancyAt(m, booked, durationMinutes));
      const seatsLeft = Math.max(0, seats - peak);
      slots.push({ time: fromMinutes(t), seatsLeft, available: seatsLeft >= party });
    }
  }
  return { open: slots.length > 0, reason: slots.length ? undefined : getDict(lang).server.noMoreToday, slots };
}

const ACTIVE = `status IN ('pending','confirmed')`;

async function bookedOn(date: string, q: Q = query): Promise<Booked[]> {
  return q<Booked>(`SELECT time, party_size FROM reservations WHERE date = $1 AND ${ACTIVE}`, [date]);
}

export async function getAvailability(date: string, party: number, lang: Locale = "it"): Promise<Availability> {
  const cfg = await loadConfig();
  const closed = bookingClosedReason(cfg, lang);
  if (closed) return { open: false, reason: closed, slots: [] };
  if (!Number.isInteger(party) || party < 1 || party > cfg.booking.maxPartySize) {
    return { open: false, reason: fmt(getDict(lang).server.largeGroup, { n: cfg.booking.maxPartySize }), slots: [] };
  }
  return buildSlots(date, party, cfg, await bookedOn(date), false, lang);
}

/** Dates (next `maxDaysAhead` days) on which the venue is open for booking. */
export async function getOpenDays(): Promise<string[]> {
  const cfg = await loadConfig();
  if (bookingClosedReason(cfg)) return [];
  const today = nowInRome().date;
  const days: string[] = [];
  for (let i = 0; i <= cfg.booking.maxDaysAhead; i++) {
    const d = addDays(today, i);
    if (dayState(d, cfg).ok) days.push(d);
  }
  return days;
}

export type NewReservation = {
  date: string;
  time: string;
  partySize: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  /** Language the guest booked in: the e-mails to them use it. */
  lang?: Locale;
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newReference(prefix: string) {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}-${s}`;
}

export type ReservationOptions = {
  /** Booked by the staff (phone, walk-in): no notice period, no booking window. */
  admin?: boolean;
  /** Staff only: save it even when the table plan says the slot is full or not offered. */
  force?: boolean;
};

export async function createReservation(data: NewReservation, opts: ReservationOptions = {}) {
  const { admin = false, force = false } = opts;
  const lang = data.lang ?? "it";
  const m = getDict(lang).server;
  const cfg = await loadConfig();
  if (!admin) {
    const closed = bookingClosedReason(cfg, lang);
    if (closed) return { ok: false as const, error: closed };
  }
  if (!isDate(data.date) || !isTime(data.time)) return { ok: false as const, error: m.badDateTime };
  if (data.date < nowInRome().date) return { ok: false as const, error: m.past };
  if (!admin && (data.partySize < 1 || data.partySize > cfg.booking.maxPartySize)) {
    return { ok: false as const, error: fmt(m.largeGroup, { n: cfg.booking.maxPartySize }) };
  }
  if (data.partySize < 1 || data.partySize > 500) return { ok: false as const, error: m.badParty };

  return transaction(async (q) => {
    // Serialise bookings for the same day so two guests can never take the same last seats.
    await q(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`reservations:${data.date}`]);
    if (!(admin && force)) {
      const avail = buildSlots(data.date, data.partySize, cfg, await bookedOn(data.date, q), admin, lang);
      const slot = avail.slots.find((s) => s.time === data.time);
      if (!slot || !slot.available) {
        return {
          ok: false as const,
          error: admin
            ? "Orario pieno o fuori dagli orari di apertura. Spunta «Forza» per salvarla comunque."
            : m.slotGone,
        };
      }
    }
    const id = randomUUID();
    const reference = newReference("DE");
    await q(
      `INSERT INTO reservations (id, reference, date, time, party_size, first_name, last_name, phone, email, notes, source, status, lang)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id,
        reference,
        data.date,
        data.time,
        data.partySize,
        data.firstName,
        data.lastName,
        data.phone,
        data.email,
        data.notes,
        admin ? "staff" : "web",
        admin ? "confirmed" : "pending", // a booking taken by staff is already agreed with the guest
        lang,
      ],
    );
    return { ok: true as const, reference };
  });
}
