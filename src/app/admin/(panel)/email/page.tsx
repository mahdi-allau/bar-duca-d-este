import type { ReactNode } from "react";
import { query } from "@/server/db";
import { mailStatus } from "@/server/notify";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Empty, Field, Notice, PageHeader, Status, fmtDateTime } from "../ui";
import { sendTestEmail } from "./actions";

export const metadata = { title: "Email" };

type Log = { id: string; created_at: string; kind: string; to_email: string; subject: string; status: string; error: string };

const KIND: Record<string, string> = {
  reservation: "Conferma al cliente",
  "reservation-owner": "Avviso al locale",
  "reservation-status": "Aggiornamento al cliente",
  cake: "Conferma al cliente",
  "cake-owner": "Avviso al locale",
  "cake-status": "Aggiornamento al cliente",
  request: "Conferma al cliente",
  "request-owner": "Avviso al locale",
  alert: "Avviso al locale",
  test: "Prova",
};

export default async function EmailPage() {
  const st = mailStatus();
  const log = await query<Log>(
    `SELECT id, created_at, kind, to_email, subject, status, error FROM mail_log ORDER BY created_at DESC LIMIT 30`,
  );
  const failures = log.filter((l) => l.status === "failed").length;

  const row = (label: string, value: ReactNode, ok: boolean | null) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-espresso/10 py-3 last:border-0">
      <dt className="text-sm text-espresso/70">{label}</dt>
      <dd className="flex items-center gap-2 font-semibold break-all">
        {ok !== null && (
          <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-600" : "bg-amber-500"}`} />
        )}
        {value}
      </dd>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Email"
        lead="Le email avvisano il locale quando arriva una prenotazione, un ordine di torta o una richiesta, e scrivono al cliente per confermare o aggiornare. Qui vedi se sono attive, puoi fare una prova e controllare cosa è partito."
      />

      {!st.enabled ? (
        <Notice tone="warn">
          <strong>Le email non sono ancora attive.</strong> Il sito funziona lo stesso: prenotazioni e ordini arrivano in
          questa area admin, ma nessuno riceve un messaggio. Per attivarle servono pochi passi (in fondo alla pagina).
        </Notice>
      ) : !st.owner ? (
        <Notice tone="warn">
          <strong>Manca l&rsquo;indirizzo del locale.</strong> I clienti ricevono le email, ma il locale non viene avvisato
          delle nuove richieste: imposta <code>NOTIFY_EMAIL_TO</code>.
        </Notice>
      ) : st.sandbox ? (
        <Notice tone="warn">
          <strong>Modalità di prova.</strong> Gli avvisi al locale partono, ma le email ai clienti no: con il mittente di
          prova di Resend si può scrivere solo al proprio indirizzo. Per scrivere ai clienti serve un dominio verificato.
        </Notice>
      ) : failures > 0 ? (
        <Notice tone="warn">
          <strong>
            {failures === 1 ? "Un invio non è andato a buon fine" : `${failures} invii non sono andati a buon fine`}
          </strong>{" "}
          tra gli ultimi 30. Guarda il motivo nell&rsquo;elenco qui sotto.
        </Notice>
      ) : (
        <Notice tone="ok">
          <strong>Le email sono attive.</strong> Il locale riceve gli avvisi e i clienti ricevono conferme e aggiornamenti.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">Stato</h2>
          <dl className="mt-2">
            {row("Invio email", st.enabled ? "Attivo" : "Non attivo", st.enabled)}
            {row("Mittente", st.from || "Non impostato", st.enabled && !st.sandbox ? true : st.from ? false : null)}
            {row("Avvisi al locale", st.owner || "Non impostato", Boolean(st.owner))}
            {row(
              "Email ai clienti",
              st.customersReachable ? "Attive" : st.sandbox ? "Non attive (mittente di prova)" : "Non attive",
              st.customersReachable,
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="font-display text-2xl">Invia una prova</h2>
          <p className="mt-1 mb-4 text-sm text-espresso/70">
            Manda un messaggio di esempio, per controllare che arrivi e che non finisca tra la posta indesiderata.
          </p>
          <AdminForm action={sendTestEmail} success="Email di prova inviata" className="flex flex-wrap items-end gap-3">
            <Field label="Invia a" className="w-full sm:w-80">
              <input
                name="to"
                type="email"
                required
                defaultValue={st.owner}
                placeholder="nome@esempio.it"
                autoComplete="email"
                className="field"
              />
            </Field>
            <SaveButton pendingText="Invio…">Invia prova</SaveButton>
          </AdminForm>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-3xl">Ultimi invii</h2>
        <p className="mb-4 text-sm text-espresso/72">Gli ultimi 30 messaggi. Quelli più vecchi di 90 giorni vengono cancellati.</p>
        {log.length === 0 ? (
          <Empty>Nessuna email inviata finora.</Empty>
        ) : (
          <ul className="divide-y divide-espresso/10 border border-espresso/15 bg-cream">
            {log.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Status value={l.status} />
                  <span className="text-sm text-espresso/70">{fmtDateTime(l.created_at)}</span>
                  <span className="text-sm text-espresso/70">· {KIND[l.kind] ?? l.kind}</span>
                </div>
                <p className="mt-1 font-semibold break-words">{l.subject}</p>
                <p className="text-sm break-all text-espresso/75">a {l.to_email}</p>
                {l.error && <p className="mt-1 text-sm text-red-800">{l.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!(st.enabled && st.owner && st.customersReachable) && (
        <Card className="mt-10">
          <h2 className="font-display text-2xl">Come attivarle</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem] leading-relaxed">
            <li>
              Crea un account gratuito su <strong>resend.com</strong> (3.000 email al mese, più che sufficienti).
            </li>
            <li>
              In <strong>API Keys</strong> crea una chiave e salvala: il sito la usa come <code>RESEND_API_KEY</code>.
            </li>
            <li>
              Per scrivere anche ai clienti serve un dominio del locale (ad esempio <code>ducadeste.it</code>), da
              verificare in <strong>Domains</strong> aggiungendo i record DNS che Resend indica. Senza dominio si può
              provare tutto, ma le email partono solo verso l&rsquo;indirizzo dell&rsquo;account Resend.
            </li>
            <li>
              Imposta nel sito <code>MAIL_FROM</code> (es. <code>Duca d&rsquo;Este &lt;prenotazioni@ducadeste.it&gt;</code>)
              e <code>NOTIFY_EMAIL_TO</code> (l&rsquo;indirizzo che deve ricevere gli avvisi), poi pubblica di nuovo.
            </li>
            <li>Torna qui e premi «Invia prova».</li>
          </ol>
        </Card>
      )}
    </>
  );
}
