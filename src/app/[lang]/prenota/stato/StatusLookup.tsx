"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { euro } from "@/lib/cake/pricing";
import { describeSize, tierSpecs } from "@/lib/cake/sizing";
import { formatDateLong } from "@/lib/dates";
import { localePath, type Locale } from "@/lib/i18n/config";
import { fmt, pl } from "@/lib/i18n/format";
import type { Dict } from "@/lib/i18n/it";
import { cancelAction, lookupAction, type LookupState } from "./actions";

export default function StatusLookup({
  lang,
  t,
  cake,
  forms,
  defaultCode = "",
}: {
  lang: Locale;
  t: Dict["status"];
  cake: Dict["cake"];
  forms: Dict["forms"];
  defaultCode?: string;
}) {
  const [state, lookup, looking] = useActionState<LookupState, FormData>(lookupAction, null);
  const [after, cancel, cancelling] = useActionState<LookupState, FormData>(cancelAction, null);
  const [email, setEmail] = useState("");
  // after a cancellation the fresh data replaces the lookup it came from, but never a newer lookup
  const refreshed = after?.ok && state?.ok && after.found.reference === state.found.reference ? after : null;
  const shown = refreshed ?? state;
  const cancelError = after && !after.ok ? after.error : null;
  const when = (date: string, time?: string) =>
    time ? fmt(t.atTime, { date: formatDateLong(date, lang), time }) : formatDateLong(date, lang);

  return (
    <div className="max-w-2xl">
      <form action={lookup} className="space-y-5">
        <input type="hidden" name="lang" value={lang} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.code}</span>
          <input name="code" dir="ltr" defaultValue={defaultCode} required className="field uppercase" autoComplete="off" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.email}</span>
          <input
            name="email"
            type="email"
            dir="ltr"
            required
            className="field"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn btn-dark" disabled={looking}>
          {looking ? t.looking : t.check}
        </button>
      </form>

      {cancelError && (
        <p role="alert" className="mt-8 font-medium text-red-700">
          {cancelError}
        </p>
      )}

      {shown && !shown.ok && (
        <p role="alert" className="mt-8 font-medium text-red-700">
          {shown.error}
        </p>
      )}

      {shown?.ok && (
        <div className="mt-10 border border-gold/50 bg-cream p-6 sm:p-8" role="status">
          {shown.message && <p className="mb-4 font-semibold text-emerald-800">{shown.message}</p>}
          <p dir="ltr" className="text-sm tracking-widest text-espresso/72 rtl:text-end">
            {shown.found.reference}
          </p>
          <p className="mt-1 font-display text-4xl">{t.labels[shown.found.status] ?? shown.found.status}</p>

          {shown.found.kind === "reservation" && (
            <dl className="mt-5 space-y-1.5">
              <Row k={t.tableFor} v={pl(lang, forms.persons, shown.found.partySize)} />
              <Row k={t.when} v={when(shown.found.date, shown.found.time)} />
              <Row k={t.heldBy} v={shown.found.name} />
              {shown.found.notes && <Row k={t.notes} v={shown.found.notes} />}
            </dl>
          )}

          {shown.found.kind === "cake" && (
            <CakeDetails lang={lang} t={t} cake={cake} forms={forms} found={shown.found} names={shown.names} when={when} />
          )}

          {shown.found.kind === "request" && (
            <dl className="mt-5 space-y-1.5">
              <Row k={t.type} v={shown.found.type} />
              {shown.found.eventDate && <Row k={t.date} v={formatDateLong(shown.found.eventDate, lang)} />}
              <Row k={t.message} v={shown.found.message} />
              {shown.found.cakeReference && <Row k={t.linkedCake} v={shown.found.cakeReference} />}
            </dl>
          )}

          {(shown.found.kind === "reservation" || shown.found.kind === "cake") && shown.found.canCancel && (
            <form
              action={cancel}
              className="mt-8 border-t border-espresso/15 pt-6"
              onSubmit={(e) => {
                if (!window.confirm(t.confirmCancel)) e.preventDefault();
              }}
            >
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="code" value={shown.found.reference} />
              <input type="hidden" name="email" value={email} />
              <button className="btn btn-line btn-sm !border-red-800 !text-red-800 hover:!bg-red-800 hover:!text-ivory" disabled={cancelling}>
                {cancelling ? t.cancelling : shown.found.kind === "cake" ? t.cancelOrder : t.cancelBooking}
              </button>
            </form>
          )}

          {(shown.found.kind === "reservation" || shown.found.kind === "cake") &&
            !shown.found.canCancel &&
            (shown.found.status === "pending" || shown.found.status === "confirmed" || shown.found.status === "new") && (
              <p className="mt-6 text-sm text-espresso/70">{t.tooLate}</p>
            )}

          <p className="mt-6 text-sm">
            <Link href={localePath(lang, "/prenota")} className="underline underline-offset-4">
              {t.another}
            </Link>{" "}
            ·{" "}
            <Link href={localePath(lang, "/crea-la-tua-torta")} className="underline underline-offset-4">
              {t.makeCake}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3">
      <dt className="text-espresso/72">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function CakeDetails({
  lang,
  t,
  cake,
  forms,
  found,
  names,
  when,
}: {
  lang: Locale;
  t: Dict["status"];
  cake: Dict["cake"];
  forms: Dict["forms"];
  found: Extract<NonNullable<Extract<LookupState, { ok: true }>["found"]>, { kind: "cake" }>;
  names: Record<string, string>;
  when: (date: string, time?: string) => string;
}) {
  const c = found.config;
  const n = (kind: string, slug: string) => names[`${kind}:${slug}`] ?? slug;
  const spec = tierSpecs(c)[0];
  const price = found.finalCents ?? found.totalCents;
  const size = describeSize(c.shape === "tiered" ? "round" : c.shape, spec.areaCm2, cake.size);
  const text = [c.text.message, c.text.name, c.text.age, c.text.dedication].filter(Boolean).join(" · ");
  return (
    <div className="mt-5">
      <dl className="space-y-1.5">
        <Row k={t.pickup} v={when(found.pickupDate, found.pickupTime)} />
        <Row k={t.shape} v={n("shape", c.shape)} />
        <Row
          k={t.size}
          v={fmt(t.sizeLine, {
            persons: pl(lang, forms.persons, c.persons),
            size,
            tiers: c.tiers > 1 ? fmt(t.tiersPart, { n: c.tiers }) : "",
          })}
        />
        <Row k={t.sponge} v={fmt(t.layersPart, { name: n("sponge", c.sponge), n: c.spongeLayers })} />
        <Row k={t.fillings} v={c.fillings.map((f) => n("filling", f)).join(lang === "ar" ? " ← " : " → ")} />
        <Row k={t.cover} v={n("cover", c.cover)} />
        <Row k={t.toppings} v={c.toppings.length ? c.toppings.map((x) => n("topping", x)).join(", ") : t.none} />
        <Row k={t.text} v={text || t.none} />
      </dl>
      <p className="mt-4 font-display text-3xl">
        {euro(price, lang)}
        {found.breakdown.pricesConfirmed === false && found.finalCents == null && (
          <span className="ms-2 font-sans text-sm text-espresso/72">{t.indicative}</span>
        )}
      </p>
      {found.previews.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {found.previews.map((src, i) => (
            <Image
              key={i}
              src={src}
              alt={i === 0 ? t.imgWhole : t.imgCut}
              width={450}
              height={360}
              unoptimized
              className="h-auto w-full border border-espresso/15"
            />
          ))}
        </div>
      )}
    </div>
  );
}
