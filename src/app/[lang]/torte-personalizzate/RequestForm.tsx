"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Honeypot, PrivacyConsent } from "@/components/forms";
import { localePath, type Locale } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/format";
import type { Dict } from "@/lib/i18n/it";
import { requestAction } from "./actions";

const VALUES = ["compleanno", "personalizzata", "anniversario", "battesimo", "evento-privato", "catering"];

export default function RequestForm({
  lang,
  d,
  defaultKind = "",
  cakeReference = "",
}: {
  lang: Locale;
  d: Pick<Dict, "request" | "forms" | "common">;
  defaultKind?: string;
  cakeReference?: string;
}) {
  const t = d.request;
  const [state, action, pending] = useActionState(requestAction, null);
  const fields = state && !state.ok ? (state.fields ?? {}) : {};

  if (state?.ok) {
    return (
      <div role="status" className="border border-champagne/50 p-8">
        <h3 className="t-h3">{t.sentTitle}</h3>
        <p className="mt-3 text-ivory/85">{t.sentText}</p>
        <p dir="ltr" className="mt-4 font-display text-4xl tracking-wide text-champagne rtl:text-end">
          {state.reference}
        </p>
        <Link href={`${localePath(lang, "/prenota/stato")}?codice=${state.reference}`} className="btn btn-gold mt-6">
          {d.common.checkStatus}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-5">
      <Honeypot label={d.common.honeypot} />
      <input type="hidden" name="lang" value={lang} />
      {cakeReference && (
        <>
          <input type="hidden" name="cakeReference" value={cakeReference} />
          <p className="border border-champagne/40 p-4 text-sm text-ivory/85">
            {rich(t.linked, { b: (c) => <strong dir="ltr">{c}</strong>, ref: cakeReference })}
          </p>
        </>
      )}
      <Field label={t.kind} error={fields.kind} tone="dark">
        <select name="kind" required defaultValue={defaultKind} className="field field-dark">
          <option value="" disabled>
            {t.choose}
          </option>
          {t.kinds.map((k, i) => (
            <option key={VALUES[i]} value={VALUES[i]} className="text-ink">
              {k}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.name} error={fields.name} tone="dark">
          <input name="name" autoComplete="name" required className="field field-dark" />
        </Field>
        <Field label={t.phone} error={fields.phone} tone="dark">
          <input name="phone" type="tel" dir="ltr" autoComplete="tel" required className="field field-dark" />
        </Field>
      </div>
      <Field label={t.email} error={fields.email} tone="dark">
        <input name="email" type="email" dir="ltr" autoComplete="email" required className="field field-dark" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.eventDate} error={fields.eventDate} tone="dark">
          <input name="eventDate" type="date" lang={lang} className="field field-dark [color-scheme:dark]" />
        </Field>
        <Field label={t.guests} error={fields.guests} tone="dark">
          <input name="guests" type="number" min={1} inputMode="numeric" className="field field-dark" />
        </Field>
      </div>
      <Field label={t.message} error={fields.message} tone="dark">
        <textarea name="message" required minLength={10} maxLength={1500} className="field field-dark min-h-32" />
      </Field>
      <PrivacyConsent text={d.forms.consentRequest} lang={lang} error={fields.privacy} tone="dark" />
      {state && !state.ok && !state.fields && (
        <p role="alert" className="font-medium text-red-300">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-gold disabled:opacity-60">
        {pending ? d.common.sending : t.submit}
      </button>
    </form>
  );
}
