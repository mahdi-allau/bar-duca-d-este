import Link from "next/link";
import { query } from "@/server/db";
import { Card, Empty, LABELS, PageHeader, Status, fmtDate, fmtDateTime } from "../ui";
import AdminForm, { SaveButton } from "../AdminForm";
import { updateRequest } from "./actions";

export const metadata = { title: "Richieste ed eventi" };

type Row = {
  id: string;
  reference: string;
  kind: string;
  name: string;
  phone: string;
  email: string;
  event_date: string;
  guests: number | null;
  message: string;
  status: string;
  admin_notes: string;
  created_at: Date;
  cake_reference: string;
};

const STATES = ["new", "in_progress", "quoted", "confirmed", "done", "rejected"] as const;

export default async function Richieste({ searchParams }: { searchParams: Promise<{ stato?: string }> }) {
  const { stato } = await searchParams;
  const filtered = stato && (STATES as readonly string[]).includes(stato);
  const rows = await query<Row>(
    `SELECT id, reference, kind, name, phone, email, event_date, guests, message, status, admin_notes, created_at, cake_reference
     FROM event_requests ${filtered ? "WHERE status = $1" : ""} ORDER BY created_at DESC LIMIT 200`,
    filtered ? [stato] : [],
  );
  const chip = (on: boolean) =>
    `border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-ivory" : "border-espresso/25 hover:border-espresso"}`;

  return (
    <>
      <PageHeader
        title="Richieste ed eventi"
        lead="Messaggi dal modulo «Torte ed eventi»: compleanni, battesimi, rinfreschi, eventi privati. Rispondi al cliente per telefono o email, poi aggiorna lo stato."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/richieste" className={chip(!filtered)}>
          Tutte
        </Link>
        {STATES.map((s) => (
          <Link key={s} href={`/admin/richieste?stato=${s}`} className={chip(stato === s)}>
            {LABELS[s]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>Nessuna richiesta.</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-2xl">{r.kind}</span>
                  <Status value={r.status} />
                  <span className="text-sm text-espresso/72">{r.reference}</span>
                </p>
                <p className="mt-2 font-semibold">{r.name}</p>
                <p className="text-sm">
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-block py-2 underline underline-offset-4">
                    {r.phone}
                  </a>{" "}
                  ·{" "}
                  <a href={`mailto:${r.email}`} className="inline-block py-2 underline underline-offset-4">
                    {r.email}
                  </a>
                </p>
                {(r.event_date || r.guests) && (
                  <p className="mt-1 text-sm">
                    {r.event_date && <>Data: {fmtDate(r.event_date)}</>}
                    {r.event_date && r.guests ? " · " : ""}
                    {r.guests ? `${r.guests} persone` : ""}
                  </p>
                )}
                {r.cake_reference && (
                  <p className="mt-2 text-sm">
                    Torta collegata:{" "}
                    <Link href={`/admin/torte?codice=${r.cake_reference}`} className="font-semibold underline underline-offset-4">
                      {r.cake_reference}
                    </Link>{" "}
                    (apri l&rsquo;ordine con le anteprime 3D)
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap">{r.message}</p>
                <p className="mt-2 text-xs text-espresso/72">Ricevuta il {fmtDateTime(r.created_at)}</p>
              </div>
              <AdminForm action={updateRequest} success="Richiesta aggiornata" className="flex min-w-[16rem] flex-col gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className="field" aria-label="Stato">
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {LABELS[s]}
                    </option>
                  ))}
                </select>
                <textarea name="adminNotes" defaultValue={r.admin_notes} placeholder="Nota interna" className="field min-h-20" />
                <SaveButton>Salva</SaveButton>
              </AdminForm>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
