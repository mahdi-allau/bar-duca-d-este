import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { formatDateLong } from "@/lib/dates";
import { getDict } from "@/lib/i18n";
import { DEFAULT_LOCALE, localePath, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { SITE } from "@/lib/site";
import { query } from "./db";
import { queuePush } from "./push";

/**
 * Optional e-mail notifications, through Resend (https://resend.com).
 * Nothing is sent, and nothing breaks, until these variables are set:
 *   RESEND_API_KEY   the API key
 *   MAIL_FROM        a verified sender, e.g. "Duca d'Este <prenotazioni@tuodominio.it>"
 *   NOTIFY_EMAIL_TO  where the pastry shop wants to be told about new requests
 * Every attempt is written to the `mail_log` table, so the admin can see what went out and what did not.
 */

/* ------------------------------------------------------------------ status */

export function mailStatus() {
  const from = process.env.MAIL_FROM || "";
  const owner = process.env.NOTIFY_EMAIL_TO || "";
  const hasKey = Boolean(process.env.RESEND_API_KEY);
  const enabled = hasKey && Boolean(from);
  // Resend's shared test sender can only write to the address of the Resend account itself.
  const sandbox = /@resend\.dev\b/i.test(from);
  return { hasKey, from, owner, enabled, sandbox, customersReachable: enabled && !sandbox };
}

export const mailEnabled = () => mailStatus().enabled;

/* --------------------------------------------------------------- templates */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Body = {
  /** First line, e.g. "Ciao Maria," */
  greeting?: string;
  paragraphs: string[];
  /** Label / value pairs shown as a small table. */
  facts?: [string, string][];
  button?: { label: string; href: string };
  /** Small print under the button. */
  note?: string;
  /** Owner mails skip the customer signature. */
  internal?: boolean;
  /** Language of the message: sets lang/dir of the HTML version. */
  lang?: Locale;
};

const INK = "#171715";
const GOLD = "#A58A60";
const ESPRESSO = "#382A22";

function render(subject: string, b: Body): { text: string; html: string } {
  const text = [
    b.greeting,
    ...b.paragraphs,
    b.facts?.map(([k, v]) => `${k}: ${v}`).join("\n"),
    b.button ? `${b.button.label}: ${b.button.href}` : undefined,
    b.note,
    b.internal ? undefined : `${SITE.name}\n${SITE.addressLine}\n${SITE.phone}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const p = (s: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${ESPRESSO};white-space:pre-wrap">${esc(s)}</p>`;
  const facts = b.facts?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 22px;border-top:1px solid #E4DCCB">${b.facts
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #E4DCCB;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a6a5b;vertical-align:top;width:34%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #E4DCCB;font-size:16px;color:${INK};white-space:pre-wrap">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const button = b.button
    ? `<p style="margin:6px 0 22px"><a href="${esc(b.button.href)}" style="display:inline-block;background:${INK};color:#F4F0E7;text-decoration:none;font-size:15px;letter-spacing:.04em;padding:14px 26px">${esc(b.button.label)}</a></p>`
    : "";
  const note = b.note ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#7a6a5b">${esc(b.note)}</p>` : "";
  const footer = b.internal
    ? ""
    : `<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #E4DCCB;font-size:13px;line-height:1.6;color:#7a6a5b">${esc(SITE.name)}<br>${esc(SITE.addressLine)}<br>${esc(SITE.phone)}</p>`;

  const lang = b.lang ?? DEFAULT_LOCALE;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F0E7">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F4F0E7"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" dir="${dir}" style="max-width:560px;background:#FAF8F3;border:1px solid #E4DCCB;font-family:Georgia,'Times New Roman','Noto Naskh Arabic',serif;text-align:${align}">
<tr><td style="padding:30px 32px 0;text-align:center">
<div style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:${GOLD}">Bar &middot; Pasticceria</div>
<div style="font-size:30px;line-height:1.2;color:${INK};margin-top:6px">Duca d&rsquo;Este</div>
<div style="width:48px;height:1px;background:${GOLD};margin:18px auto 0"></div>
</td></tr>
<tr><td style="padding:28px 32px 30px">
${b.greeting ? `<p style="margin:0 0 16px;font-size:18px;color:${INK}">${esc(b.greeting)}</p>` : ""}
${b.paragraphs.map(p).join("")}${facts}${button}${note}${footer}
</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

/* ----------------------------------------------------------------- sending */

type Mail = { kind: string; to: string; subject: string; body: Body; replyTo?: string };
export type SendResult = { ok: true } | { ok: false; skipped?: boolean; error: string };

async function record(m: Mail, status: "sent" | "failed" | "skipped", error = "") {
  try {
    await query(`INSERT INTO mail_log (id, kind, to_email, subject, status, error) VALUES ($1,$2,$3,$4,$5,$6)`, [
      randomUUID(),
      m.kind,
      m.to,
      m.subject,
      status,
      error.slice(0, 400),
    ]);
    await query(`DELETE FROM mail_log WHERE created_at < now() - interval '90 days'`);
  } catch (e) {
    console.error("[mail] could not write the log:", (e as Error).message);
  }
}

/** What Resend answered, in words an owner can act on. */
function explain(status: number, raw: string): string {
  let msg = raw;
  try {
    msg = (JSON.parse(raw) as { message?: string }).message ?? raw;
  } catch {
    /* keep the raw text */
  }
  if (status === 401 || status === 403) {
    if (/domain|verify|testing emails|own email/i.test(msg)) {
      return "Resend rifiuta il destinatario: finché il dominio non è verificato può scrivere solo all'indirizzo dell'account Resend.";
    }
    return "Resend non accetta la chiave (RESEND_API_KEY): controlla che sia quella giusta e attiva.";
  }
  if (status === 422) return `Indirizzo o mittente non valido (${msg.slice(0, 160)}).`;
  if (status === 429) return "Troppi invii in poco tempo: Resend ha rallentato.";
  return `Resend ha risposto ${status}: ${msg.slice(0, 160)}`;
}

async function send(mail: Mail): Promise<SendResult> {
  const st = mailStatus();
  if (!mail.to) return { ok: false, skipped: true, error: "Nessun destinatario" };
  if (!st.enabled) return { ok: false, skipped: true, error: "Le email non sono attive" };

  const subject = mail.subject.replace(/[\r\n]+/g, " ").trim();
  const mailToSend = { ...mail, subject };

  if (st.sandbox && mail.to.toLowerCase() !== st.owner.toLowerCase()) {
    const error = "Mittente di prova: i messaggi ai clienti partono solo con un dominio verificato su Resend.";
    await record(mailToSend, "skipped", error);
    return { ok: false, skipped: true, error };
  }

  const { text, html } = render(subject, mail.body);
  try {
    // RESEND_API_URL exists only so the tests can point at a fake mail server
    const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: st.from,
        to: [mail.to],
        subject,
        text,
        html,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const error = explain(res.status, (await res.text()).slice(0, 400));
      console.error("[mail] not sent:", res.status, error);
      await record(mailToSend, "failed", error);
      return { ok: false, error };
    }
    await record(mailToSend, "sent");
    return { ok: true };
  } catch (e) {
    const error = `Non sono riuscito a contattare Resend (${(e as Error).message}).`;
    console.error("[mail] could not send:", (e as Error).message);
    await record(mailToSend, "failed", error);
    return { ok: false, error };
  }
}

/** Sends right now and reports the outcome (the admin's "send a test" button). */
export const sendMailNow = send;

/** Sends after the response has gone out, so a slow mail server never slows the customer down. */
function queueMail(...mails: Mail[]) {
  if (!mailEnabled()) return;
  const run = async () => {
    for (const m of mails) await send(m);
  };
  try {
    after(run);
  } catch {
    // outside a request (scripts): send right away
    void run();
  }
}

/* ------------------------------------------------------------- the e-mails */

const owner = () => process.env.NOTIFY_EMAIL_TO || "";
/** Customers who answer a message write to the pastry shop, not to a no-reply address. */
const replies = () => owner() || SITE.email;
const statusLink = (ref: string, lang: Locale = DEFAULT_LOCALE) =>
  `${SITE.url}${localePath(lang, "/prenota/stato")}?codice=${encodeURIComponent(ref)}`;
const eur = (c: number, lang: Locale = DEFAULT_LOCALE) => {
  const tag = { it: "it-IT", en: "en-GB", es: "es-ES", de: "de-DE", ar: "ar-u-nu-latn" }[lang];
  return new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }).format(c / 100);
};
// The messages to the pastry shop itself stay in Italian.
const persons = (n: number) => `${n} ${n === 1 ? "persona" : "persone"}`;
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

type Res = { reference: string; date: string; time: string; partySize: number; name: string; phone: string; email: string; notes?: string; lang?: Locale };

export function reservationReceived(r: Res) {
  const lang = r.lang ?? DEFAULT_LOCALE;
  const e = getDict(lang).email;
  queuePush({
    title: "Nuova prenotazione",
    body: `${r.name} · ${persons(r.partySize)} · ${shortDate(r.date)} ${r.time}`,
    url: "/admin/prenotazioni?stato=pending",
    tag: r.reference,
  });
  queueMail(
    {
      kind: "reservation",
      to: r.email,
      subject: fmt(e.resReceivedSubject, { ref: r.reference }),
      replyTo: replies(),
      body: {
        lang,
        greeting: fmt(e.hello, { name: r.name }),
        paragraphs: [e.resReceived],
        facts: [
          [e.when, fmt(e.whenValue, { date: formatDateLong(r.date, lang), time: r.time })],
          [e.people, String(r.partySize)],
          [e.code, r.reference],
        ],
        button: { label: e.checkStatus, href: statusLink(r.reference, lang) },
        note: e.statusNote,
      },
    },
    {
      kind: "reservation-owner",
      to: owner(),
      subject: `Nuova prenotazione ${r.reference}: ${formatDateLong(r.date)} ${r.time}, ${persons(r.partySize)}`,
      replyTo: r.email,
      body: {
        internal: true,
        paragraphs: ["Nuova richiesta di prenotazione dal sito."],
        facts: [
          ["Cliente", r.name],
          ["Telefono", r.phone],
          ["Email", r.email],
          ["Quando", `${formatDateLong(r.date)} alle ${r.time}`],
          ["Persone", String(r.partySize)],
          ...(r.notes ? ([["Note", r.notes]] as [string, string][]) : []),
          ...(lang !== DEFAULT_LOCALE ? ([["Lingua", lang.toUpperCase()]] as [string, string][]) : []),
        ],
        button: { label: "Apri le prenotazioni", href: `${SITE.url}/admin/prenotazioni` },
      },
    },
  );
}

export function reservationStatusChanged(r: Res, status: string) {
  const lang = r.lang ?? DEFAULT_LOCALE;
  const e = getDict(lang).email;
  const line = e.resStatus[status];
  if (!line) return;
  queueMail({
    kind: "reservation-status",
    to: r.email,
    subject: fmt(e.resUpdateSubject, { ref: r.reference }),
    replyTo: replies(),
    body: {
      lang,
      greeting: fmt(e.hello, { name: r.name }),
      paragraphs: [fmt(line, { date: formatDateLong(r.date, lang), time: r.time })],
      facts: [
        [e.when, fmt(e.whenValue, { date: formatDateLong(r.date, lang), time: r.time })],
        [e.people, String(r.partySize)],
        [e.code, r.reference],
      ],
      button: { label: e.details, href: statusLink(r.reference, lang) },
    },
  });
}

type Cake = { reference: string; name: string; phone: string; email: string; pickupDate: string; pickupTime: string; totalCents: number; confirmedPrices: boolean; lang?: Locale };
const pickup = (o: Cake, lang: Locale = DEFAULT_LOCALE) => {
  const e = getDict(lang).email;
  const date = formatDateLong(o.pickupDate, lang);
  return o.pickupTime ? fmt(e.pickupValueAt, { date, time: o.pickupTime }) : fmt(e.pickupValue, { date });
};

export function cakeOrderReceived(o: Cake) {
  const lang = o.lang ?? DEFAULT_LOCALE;
  const e = getDict(lang).email;
  queuePush({
    title: "Nuovo ordine di torta",
    body: `${o.name} · ritiro ${shortDate(o.pickupDate)} · ${eur(o.totalCents)}`,
    url: `/admin/torte?codice=${encodeURIComponent(o.reference)}`,
    tag: o.reference,
  });
  queueMail(
    {
      kind: "cake",
      to: o.email,
      subject: fmt(e.cakeReceivedSubject, { ref: o.reference }),
      replyTo: replies(),
      body: {
        lang,
        greeting: fmt(e.hello, { name: o.name }),
        paragraphs: [e.cakeReceived],
        facts: [
          [e.pickup, pickup(o, lang)],
          [e.total, `${eur(o.totalCents, lang)}${o.confirmedPrices ? "" : e.indicativeTag}`],
          [e.code, o.reference],
        ],
        button: { label: e.checkStatus, href: statusLink(o.reference, lang) },
        note: o.confirmedPrices ? e.cakeNoteConfirmed : e.cakeNoteIndicative,
      },
    },
    {
      kind: "cake-owner",
      to: owner(),
      subject: `Nuovo ordine torta ${o.reference}: ritiro ${formatDateLong(o.pickupDate)}`,
      replyTo: o.email,
      body: {
        internal: true,
        paragraphs: ["Nuovo ordine di torta dal sito, con le anteprime 3D nell'area admin."],
        facts: [
          ["Cliente", o.name],
          ["Telefono", o.phone],
          ["Email", o.email],
          ["Ritiro", pickup(o)],
          ["Totale", eur(o.totalCents)],
          ...(lang !== DEFAULT_LOCALE ? ([["Lingua", lang.toUpperCase()]] as [string, string][]) : []),
        ],
        button: { label: "Apri l'ordine", href: `${SITE.url}/admin/torte?codice=${encodeURIComponent(o.reference)}` },
      },
    },
  );
}

export function cakeStatusChanged(o: Cake & { finalCents?: number | null }, status: string) {
  const lang = o.lang ?? DEFAULT_LOCALE;
  const e = getDict(lang).email;
  const line = e.cakeStatus[status];
  if (!line) return;
  const price = o.finalCents != null ? o.finalCents : o.totalCents;
  queueMail({
    kind: "cake-status",
    to: o.email,
    subject: fmt(e.cakeUpdateSubject, { ref: o.reference }),
    replyTo: replies(),
    body: {
      lang,
      greeting: fmt(e.hello, { name: o.name }),
      paragraphs: [fmt(line, { date: formatDateLong(o.pickupDate, lang) })],
      facts: [
        [e.pickup, pickup(o, lang)],
        [e.price, eur(price, lang)],
        [e.code, o.reference],
      ],
      button: { label: e.details, href: statusLink(o.reference, lang) },
    },
  });
}

const KIND_VALUES = ["compleanno", "personalizzata", "anniversario", "battesimo", "evento-privato", "catering"];

export function requestReceived(r: {
  reference: string;
  kind: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  lang?: Locale;
  kindValue?: string;
}) {
  const lang = r.lang ?? DEFAULT_LOCALE;
  const e = getDict(lang).email;
  const idx = r.kindValue ? KIND_VALUES.indexOf(r.kindValue) : -1;
  const kindForCustomer = idx >= 0 ? getDict(lang).request.kinds[idx] : r.kind;
  queuePush({ title: "Nuova richiesta", body: `${r.kind} · ${r.name}`, url: "/admin/richieste?stato=new", tag: r.reference });
  queueMail(
    {
      kind: "request",
      to: r.email,
      subject: fmt(e.requestSubject, { ref: r.reference, kind: kindForCustomer }),
      replyTo: replies(),
      body: {
        lang,
        greeting: fmt(e.hello, { name: r.name }),
        paragraphs: [e.requestReceived],
        facts: [
          [e.request, kindForCustomer],
          [e.code, r.reference],
        ],
      },
    },
    {
      kind: "request-owner",
      to: owner(),
      subject: `Nuova richiesta ${r.reference}: ${r.kind}`,
      replyTo: r.email,
      body: {
        internal: true,
        paragraphs: ["Nuova richiesta dal sito."],
        facts: [
          ["Cliente", r.name],
          ["Telefono", r.phone],
          ["Email", r.email],
          ["Richiesta", r.kind],
          ["Messaggio", r.message],
          ...(lang !== DEFAULT_LOCALE ? ([["Lingua", lang.toUpperCase()]] as [string, string][]) : []),
        ],
        button: { label: "Apri le richieste", href: `${SITE.url}/admin/richieste` },
      },
    },
  );
}

export function alertOwner(subject: string, text: string) {
  queuePush({ title: subject, body: text, url: "/admin" });
  queueMail({ kind: "alert", to: owner(), subject, body: { internal: true, paragraphs: [text] } });
}

/** The message behind the admin's "send a test" button. */
export function testMail(to: string): Mail {
  return {
    kind: "test",
    to,
    subject: "Prova email dal sito Duca d'Este",
    replyTo: replies(),
    body: {
      greeting: "Ciao,",
      paragraphs: [
        "questa è una email di prova inviata dall'area admin del sito.",
        "Se la stai leggendo, le email funzionano: da ora le prenotazioni e gli ordini arrivano anche qui.",
      ],
      facts: [["Inviata il", new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date())]],
      button: { label: "Apri l'area admin", href: `${SITE.url}/admin` },
    },
  };
}
