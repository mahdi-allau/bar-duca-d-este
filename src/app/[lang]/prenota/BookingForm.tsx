"use client";

import Link from "next/link";
import { useActionState, useCallback, useRef, useState } from "react";
import DayPicker from "@/components/DayPicker";
import { Field, Honeypot, PrivacyConsent } from "@/components/forms";
import { cn } from "@/lib/cn";
import { formatDateLong } from "@/lib/dates";
import { localePath, type Locale } from "@/lib/i18n/config";
import { fmt, pl } from "@/lib/i18n/format";
import type { Dict } from "@/lib/i18n/it";
import { reserveAction } from "./actions";

type Slot = { time: string; seatsLeft: number; available: boolean };
type Availability = { open: boolean; reason?: string; slots: Slot[] };

export default function BookingForm({
  lang,
  d,
  openDays,
  maxParty,
  defaultNotes = "",
}: {
  lang: Locale;
  d: Pick<Dict, "booking" | "forms" | "common">;
  openDays: string[];
  maxParty: number;
  defaultNotes?: string;
}) {
  const t = d.booking;
  const [state, action, pending] = useActionState(reserveAction, null);
  const [party, setParty] = useState(2);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [avail, setAvail] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);

  // Availability always comes from the server, which reads the database.
  const latest = useRef(0);
  const load = useCallback(
    async (day: string, people: number) => {
      const id = ++latest.current;
      setLoading(true);
      try {
        const data: Availability = await fetch(`/api/availability?date=${day}&party=${people}&lang=${lang}`).then((r) => r.json());
        if (id !== latest.current) return; // a newer request replaced this one
        setAvail(data);
        setTime((cur) => (data.slots.some((s) => s.time === cur && s.available) ? cur : ""));
      } catch {
        if (id === latest.current) setAvail({ open: false, reason: t.cantCheck, slots: [] });
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [lang, t.cantCheck],
  );

  if (state?.ok) {
    return (
      <div role="status" className="border border-gold/50 bg-cream p-8 sm:p-10">
        <h2 className="t-h3">{t.doneTitle}</h2>
        <p className="mt-4 max-w-xl">
          {fmt(t.doneText, { date: formatDateLong(date, lang), time, people: pl(lang, d.forms.persons, party) })}
        </p>
        <p dir="ltr" className="mt-6 font-display text-4xl tracking-wide">
          {state.reference}
        </p>
        <Link href={`${localePath(lang, "/prenota/stato")}?codice=${state.reference}`} className="btn btn-dark mt-8">
          {d.common.checkStatus}
        </Link>
      </div>
    );
  }

  const fields = state && !state.ok ? (state.fields ?? {}) : {};
  const slotsOfDay = avail?.slots ?? [];

  return (
    <form action={action} className="relative grid gap-12 lg:grid-cols-2 lg:gap-16">
      <Honeypot label={d.common.honeypot} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />

      <div className="space-y-10">
        <fieldset>
          <legend className="t-h3 mb-4">{t.step1}</legend>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setParty(n);
                  if (date) load(date, n);
                }}
                aria-pressed={party === n}
                className={cn(
                  "h-12 w-12 border text-base transition-colors",
                  party === n ? "border-champagne bg-champagne font-semibold" : "border-espresso/30 hover:border-gold",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <input type="hidden" name="partySize" value={party} />
          <p className="mt-3 text-sm text-espresso/70">{t.bigGroups}</p>
        </fieldset>

        <fieldset>
          <legend className="t-h3 mb-4">{t.step2}</legend>
          <DayPicker
            lang={lang}
            labels={{ prev: t.prevMonth, next: t.nextMonth, group: t.daysGroup }}
            openDays={openDays}
            value={date}
            onChange={(day) => {
              setDate(day);
              setTime("");
              load(day, party);
            }}
          />
          {fields.date && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{fields.date}</p>}
        </fieldset>

        <fieldset>
          <legend className="t-h3 mb-4">{t.step3}</legend>
          {!date && <p className="text-espresso/70">{t.pickDayFirst}</p>}
          {date && loading && <p className="text-espresso/70">{t.checking}</p>}
          {date && !loading && avail && !avail.open && <p className="font-medium">{avail.reason}</p>}
          {date && !loading && avail?.open && (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.slotsLabel}>
                {slotsOfDay.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setTime(s.time)}
                    aria-pressed={time === s.time}
                    title={s.available ? undefined : t.slotFull}
                    className={cn(
                      "min-h-11 min-w-[4.5rem] border px-3 text-sm transition-colors",
                      time === s.time
                        ? "border-champagne bg-champagne font-semibold"
                        : s.available
                          ? "border-espresso/30 hover:border-gold"
                          : "cursor-not-allowed border-espresso/15 line-through opacity-40",
                    )}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
              {slotsOfDay.every((s) => !s.available) && (
                <p className="mt-3 text-sm font-medium">{fmt(t.dayFull, { people: pl(lang, d.forms.persons, party) })}</p>
              )}
            </>
          )}
          {fields.time && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{fields.time}</p>}
        </fieldset>
      </div>

      <div className="space-y-5">
        <h2 className="t-h3">{t.step4}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.firstName} error={fields.firstName}>
            <input name="firstName" autoComplete="given-name" required className="field" />
          </Field>
          <Field label={t.lastName} error={fields.lastName}>
            <input name="lastName" autoComplete="family-name" required className="field" />
          </Field>
        </div>
        <Field label={t.phone} error={fields.phone}>
          <input name="phone" type="tel" dir="ltr" autoComplete="tel" required className="field" />
        </Field>
        <Field label={t.email} error={fields.email}>
          <input name="email" type="email" dir="ltr" autoComplete="email" required className="field" />
        </Field>
        <Field label={t.notes} hint={t.notesHint} error={fields.notes}>
          <textarea name="notes" maxLength={500} defaultValue={defaultNotes} className="field" />
        </Field>
        <PrivacyConsent text={d.forms.consentRequest} lang={lang} error={fields.privacy} />

        {state && !state.ok && !state.fields && (
          <p role="alert" className="font-medium text-red-700">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending || !date || !time} className="btn btn-dark w-full disabled:opacity-50 sm:w-auto">
          {pending ? d.common.sending : t.submit}
        </button>
        {(!date || !time) && <p className="text-sm text-espresso/70">{t.pickBoth}</p>}
      </div>
    </form>
  );
}
