import Link from "next/link";
import { addDays, nowInRome } from "@/lib/dates";
import { query } from "@/server/db";
import { mailStatus } from "@/server/notify";
import { pushConfigured } from "@/server/push";
import { getBookingSettings, getCakePricing, getOpeningHours } from "@/server/settings";
import InstallHint from "./InstallHint";
import { Card, PageHeader, Status, fmtDate } from "./ui";

export const metadata = { title: "Panoramica" };

const count = async (sql: string, params: unknown[] = []) =>
  Number((await query<{ n: number | string }>(sql, params))[0]?.n ?? 0);

type Res = { reference: string; date: string; time: string; party_size: number; first_name: string; last_name: string; phone: string; status: string };
type Cake = { reference: string; pickup_date: string; pickup_time: string; customer_name: string; phone: string; status: string };

export default async function Overview() {
  const today = nowInRome().date;
  const tomorrow = addDays(today, 1);
  const [pendingRes, upcomingRes, newCakes, newRequests, hours, booking, pricing, agenda, pickups, mailFailed, phones] = await Promise.all([
    count(`SELECT count(*) AS n FROM reservations WHERE status = 'pending'`),
    count(`SELECT count(*) AS n FROM reservations WHERE date >= $1 AND status IN ('pending','confirmed')`, [today]),
    count(`SELECT count(*) AS n FROM cake_orders WHERE status = 'new'`),
    count(`SELECT count(*) AS n FROM event_requests WHERE status = 'new'`),
    getOpeningHours(),
    getBookingSettings(),
    getCakePricing(),
    query<Res>(
      `SELECT reference, date, time, party_size, first_name, last_name, phone, status
       FROM reservations WHERE date IN ($1,$2) AND status IN ('pending','confirmed') ORDER BY date, time`,
      [today, tomorrow],
    ),
    query<Cake>(
      `SELECT reference, pickup_date, pickup_time, customer_name, phone, status
       FROM cake_orders WHERE pickup_date >= $1 AND pickup_date <= $2 AND status NOT IN ('cancelled','completed')
       ORDER BY pickup_date, pickup_time`,
      [today, addDays(today, 7)],
    ),
    count(`SELECT count(*) AS n FROM mail_log WHERE status = 'failed' AND created_at > now() - interval '7 days'`),
    count(`SELECT count(*) AS n FROM push_subscriptions`),
  ]);
  const mail = mailStatus();

  const todo = [
    hours.length === 0 && {
      text: "Inserisci gli orari di apertura: senza orari non si può prenotare.",
      href: "/admin/orari",
    },
    !booking.totalSeats && {
      text: "Imposta il numero di posti disponibili per le prenotazioni.",
      href: "/admin/orari",
    },
    !pricing.pricesConfirmed && {
      text: "I prezzi delle torte sono ancora di esempio: controllali e conferma.",
      href: "/admin/prezzi",
    },
    pushConfigured() && phones === 0 && {
      text: "Attiva gli avvisi sul telefono: ricevi una notifica appena arriva una prenotazione.",
      href: "/admin/avvisi",
    },
    !mail.enabled && {
      text: "Le email non sono attive: né il locale né i clienti ricevono messaggi. Attivale.",
      href: "/admin/email",
    },
    mail.enabled && !mail.owner && {
      text: "Le email sono attive ma manca l'indirizzo del locale che deve ricevere gli avvisi.",
      href: "/admin/email",
    },
    mailFailed > 0 && {
      text: `${mailFailed === 1 ? "Una email non è partita" : `${mailFailed} email non sono partite`} negli ultimi 7 giorni: guarda perché.`,
      href: "/admin/email",
    },
  ].filter(Boolean) as { text: string; href: string }[];

  const tiles = [
    { label: "Prenotazioni da confermare", value: pendingRes, href: "/admin/prenotazioni?stato=pending", urgent: true },
    { label: "Prenotazioni future", value: upcomingRes, href: "/admin/prenotazioni", urgent: false },
    { label: "Nuovi ordini di torte", value: newCakes, href: "/admin/torte?stato=new", urgent: true },
    { label: "Nuove richieste", value: newRequests, href: "/admin/richieste?stato=new", urgent: true },
  ];

  return (
    <>
      <PageHeader
        title="Panoramica"
        lead="Il riepilogo di oggi: cosa aspetta una tua risposta e cosa è in arrivo nei prossimi giorni."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`block border p-4 transition-colors sm:p-5 hover:border-gold ${t.urgent && t.value > 0 ? "border-amber-600/60 bg-amber-50" : "border-espresso/15 bg-cream"}`}
          >
            <p className="font-display text-4xl font-light sm:text-5xl">{t.value}</p>
            <p className="mt-1 text-sm text-espresso/75">{t.label}{t.urgent && t.value > 0 ? " · da gestire" : ""}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Tavoli di oggi e domani</h2>
          {agenda.length === 0 ? (
            <p className="mt-3 text-sm text-espresso/70">Nessuna prenotazione in programma.</p>
          ) : (
            <ul className="mt-3 divide-y divide-espresso/10">
              {agenda.map((r) => (
                <li key={r.reference} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                  <span className="w-28 text-sm text-espresso/70">{r.date === today ? "Oggi" : "Domani"}</span>
                  <span className="font-display text-2xl">{r.time}</span>
                  <span className="font-semibold">{r.party_size} pers.</span>
                  <span>
                    {r.first_name} {r.last_name}
                  </span>
                  {r.phone && (
                    <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="text-sm underline underline-offset-4">
                      {r.phone}
                    </a>
                  )}
                  <Status value={r.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/prenotazioni" className="mt-4 inline-block text-sm underline underline-offset-4">
            Tutte le prenotazioni
          </Link>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">Ritiri torte nei prossimi 7 giorni</h2>
          {pickups.length === 0 ? (
            <p className="mt-3 text-sm text-espresso/70">Nessun ritiro in programma.</p>
          ) : (
            <ul className="mt-3 divide-y divide-espresso/10">
              {pickups.map((c) => (
                <li key={c.reference} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                  <span className="w-40 text-sm text-espresso/70">
                    {fmtDate(c.pickup_date)}
                    {c.pickup_time && ` · ${c.pickup_time}`}
                  </span>
                  <Link href={`/admin/torte?codice=${c.reference}`} className="font-semibold underline underline-offset-4">
                    {c.reference}
                  </Link>
                  <span>{c.customer_name}</span>
                  <Status value={c.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/torte" className="mt-4 inline-block text-sm underline underline-offset-4">
            Tutti gli ordini
          </Link>
        </Card>
      </div>

      {todo.length > 0 && (
        <Card className="mt-8">
          <h2 className="font-display text-2xl">Da completare</h2>
          <ul className="mt-3 space-y-2">
            {todo.map((t) => (
              <li key={t.text}>
                <Link href={t.href} className="underline underline-offset-4">
                  {t.text}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <InstallHint />
    </>
  );
}
