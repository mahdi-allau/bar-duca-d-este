"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { intlLocale, type Locale } from "@/lib/i18n/config";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Month calendar where only the dates in `openDays` can be chosen.
 * Dates are plain "YYYY-MM-DD" strings, never Date objects, so time zones cannot shift them.
 */
export default function DayPicker({
  lang,
  labels,
  openDays,
  value,
  onChange,
  tone = "light",
}: {
  lang: Locale;
  labels: { prev: string; next: string; group: string };
  openDays: string[];
  value: string;
  onChange: (date: string) => void;
  tone?: "light" | "dark";
}) {
  const locale = intlLocale(lang);
  const rtl = lang === "ar";
  // Monday first; 1 January 2024 was a Monday
  const dow = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i)))),
    [locale],
  );
  const open = useMemo(() => new Set(openDays), [openDays]);
  const first = openDays[0] ?? new Date().toISOString().slice(0, 10);
  const last = openDays[openDays.length - 1] ?? first;
  const [view, setView] = useState(() => {
    const [y, m] = (value || first).split("-").map(Number);
    return { y, m };
  });

  const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(view.y, view.m - 1, 1)),
  );
  const startOffset = (new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const [fy, fm] = first.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);
  const canPrev = view.y > fy || (view.y === fy && view.m > fm);
  const canNext = view.y < ly || (view.y === ly && view.m < lm);

  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m - 1 + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });

  const dark = tone === "dark";
  return (
    <div className="w-full max-w-md select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label={labels.prev}
          className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
        >
          {rtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <p className="font-display text-2xl capitalize" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label={labels.next}
          className="flex h-10 w-10 items-center justify-center disabled:opacity-30"
        >
          {rtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold opacity-60">
        {dow.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label={labels.group}>
        {Array.from({ length: startOffset }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const iso = `${view.y}-${pad(view.m)}-${pad(day)}`;
          const enabled = open.has(iso);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={!enabled}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(
                new Date(`${iso}T12:00:00Z`),
              )}
              className={cn(
                "aspect-square min-h-10 text-sm transition-colors",
                selected
                  ? "bg-champagne font-semibold text-ink"
                  : enabled
                    ? dark
                      ? "border border-ivory/30 hover:border-champagne"
                      : "border border-espresso/30 hover:border-gold hover:bg-champagne/25"
                    : "cursor-not-allowed opacity-25",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
