import Link from "next/link";
import { nowInRome } from "@/lib/dates";
import { query } from "@/server/db";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Empty, LABELS, PageHeader, Status, fmtDate, fmtDateTime } from "../ui";
import { quickReservation, updateReservation } from "./actions";
import PhoneBooking from "./PhoneBooking";

export const metadata = { title: "Prenotazioni tavoli" };

type Row = {
  id: string;
  reference: string;
  date: string;
  time: string;
  party_size: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
  status: string;
  admin_notes: string;
  created_at: Date;
  source: string;
};

/** Digits only; Italian mobiles get the country code, for a wa.me link. */
const whatsapp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return `https://wa.me/${digits.startsWith("00") ? digits.slice(2) : digits.startsWith("3") ? `39${digits}` : digits}`;
};

const STATES = ["pending", "confirmed", "cancelled", "completed", "no_show"] as const;

const linkBtn =
  "inline-flex min-h-11 items-center justify-center border border-espresso/30 bg-white/60 px-4 text-sm font-semibold hover:border-espresso";

function Quick({ id, status, children, tone }: { id: string; status: string; children: string; tone?: "main" | "danger" }) {
  return (
    <AdminForm action={quickReservation} success={children === "Conferma" ? "Prenotazione confermata" : undefined}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SaveButton
        pendingText="…"
        className={
          tone === "main"
            ? "btn btn-dark min-h-11 w-full"
            : tone === "danger"
              ? "btn btn-line min-h-11 w-full !border-red-800 !text-red-800"
              : "btn btn-line min-h-11 w-full !border-ink !text-ink"
        }
      >
        {children}
      </SaveButton>
    </AdminForm>
  );
}

export default async function Prenotazioni({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; quando?: string }>;
}) {
  const { stato, quando = "future" } = await searchParams;
  const today = nowInRome().date;
  const where: string[] = [];
  const params: unknown[] = [];
  if (stato && (STATES as readonly string[]).includes(stato)) {
    params.push(stato);
    where.push(`status = $${params.length}`);
  }
  if (quando === "future") {
    params.push(today);
    where.push(`date >= $${params.length}`);
  } else if (quando === "past") {
    params.push(today);
    where.push(`date < $${params.length}`);
  }
  const rows = await query<Row>(
    `SELECT id, reference, date, time, party_size, first_name, last_name, phone, email, notes, status, admin_notes, created_at, source
     FROM reservations ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY date ${quando === "past" ? "DESC" : "ASC"}, time ASC LIMIT 300`,
    params,
  );

  const link = (next: { stato?: string; quando?: string }) => {
    const sp = new URLSearchParams();
    const s = "stato" in next ? next.stato : stato;
    const q = "quando" in next ? next.quando : quando;
    if (s) sp.set("stato", s);
    if (q) sp.set("quando", q);
    return `/admin/prenotazioni?${sp}`;
  };
  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center border px-4 text-sm ${active ? "border-ink bg-ink text-ivory" : "border-espresso/25 bg-white/50 hover:border-espresso"}`;

  return (
    <>
      <PageHeader
        title="Prenotazioni tavoli"
        lead="Le richieste arrivate dal sito. Una prenotazione «In attesa» va confermata o annullata: con «Conferma» il tavolo è tuo e, se le email sono attive, il cliente lo sa subito."
      />
      <PhoneBooking today={today} />

      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ["future", "Da oggi"],
          ["past", "Passate"],
          ["all", "Tutte"],
        ].map(([v, l]) => (
          <Link key={v} href={link({ quando: v })} className={chip(quando === v)}>
            {l}
          </Link>
        ))}
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href={link({ stato: undefined })} className={chip(!stato)}>
          Ogni stato
        </Link>
        {STATES.map((s) => (
          <Link key={s} href={link({ stato: s })} className={chip(stato === s)}>
            {LABELS[s]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>Nessuna prenotazione con questi filtri.</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const heading = i === 0 || rows[i - 1].date !== r.date ? fmtDate(r.date) : null;
            const wa = whatsapp(r.phone);
            return (
              <div key={r.id}>
                {heading && (
                  <h2 className="mb-2 mt-8 font-display text-2xl capitalize first:mt-0">
                    {r.date === today ? "Oggi · " : ""}
                    {heading}
                  </h2>
                )}
                <Card className="grid gap-5 lg:grid-cols-[1fr_20rem]">
                  <div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-display text-4xl leading-none">{r.time}</span>
                      <span className="text-lg font-semibold">
                        {r.party_size} {r.party_size === 1 ? "persona" : "persone"}
                      </span>
                      <Status value={r.status} />
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      {r.first_name} {r.last_name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.phone && (
                        <a href={`tel:${r.phone.replace(/\s/g, "")}`} className={linkBtn}>
                          Chiama {r.phone}
                        </a>
                      )}
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className={linkBtn}>
                          WhatsApp
                        </a>
                      )}
                      {r.email && (
                        <a href={`mailto:${r.email}`} className={linkBtn}>
                          Email
                        </a>
                      )}
                    </div>
                    {r.notes && (
                      <p className="mt-3 border-l-2 border-gold pl-3 text-[0.95rem]">
                        <span className="text-espresso/72">Note del cliente: </span>
                        {r.notes}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-espresso/72">
                      Codice {r.reference} · {r.source === "staff" ? "inserita dal locale" : `ricevuta il ${fmtDateTime(r.created_at)}`}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {r.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Quick id={r.id} status="confirmed" tone="main">
                          Conferma
                        </Quick>
                        <Quick id={r.id} status="cancelled" tone="danger">
                          Annulla
                        </Quick>
                      </div>
                    )}
                    {r.status === "confirmed" && (
                      <div className="grid grid-cols-3 gap-2">
                        <Quick id={r.id} status="completed">
                          Arrivato
                        </Quick>
                        <Quick id={r.id} status="no_show">
                          Non venuto
                        </Quick>
                        <Quick id={r.id} status="cancelled" tone="danger">
                          Annulla
                        </Quick>
                      </div>
                    )}
                    <details className="border border-espresso/15 bg-[#f3efe6]/50">
                      <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold">Cambia stato o scrivi una nota</summary>
                      <AdminForm action={updateReservation} success="Prenotazione aggiornata" className="grid gap-2 p-3 pt-1">
                        <input type="hidden" name="id" value={r.id} />
                        <select name="status" defaultValue={r.status} className="field" aria-label="Stato">
                          {STATES.map((s) => (
                            <option key={s} value={s}>
                              {LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <input name="adminNotes" defaultValue={r.admin_notes} placeholder="Nota interna (il cliente non la vede)" className="field" />
                        <SaveButton>Salva</SaveButton>
                      </AdminForm>
                    </details>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
