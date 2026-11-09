import { WEEKDAYS, WEEK_ORDER } from "@/lib/dates";
import { getBookingSettings, getClosures, getOpeningHours } from "@/server/settings";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Field, Notice, PageHeader, fmtDate } from "../ui";
import { addClosure, deleteClosure, saveAllWeekdays, saveBookingSettings, saveWeekday } from "./actions";

export const metadata = { title: "Orari, posti e chiusure" };

export default async function OrariPage() {
  const [booking, hours, closures] = await Promise.all([getBookingSettings(), getOpeningHours(), getClosures()]);
  const ready = hours.length > 0 && !!booking.totalSeats && booking.enabled;

  return (
    <>
      <PageHeader
        title="Orari, posti e chiusure"
        lead="Il sito offre le prenotazioni solo in base a questi dati: orari di apertura, posti a sedere e giorni di chiusura. Nessuna disponibilità inventata."
      />

      {ready ? (
        <Notice tone="ok">
          <strong>Prenotazioni online attive.</strong> I clienti vedono i giorni e gli orari in base a quello che imposti qui sotto.
        </Notice>
      ) : (
        <Notice tone="warn">
          <strong>Le prenotazioni online non sono ancora attive.</strong>{" "}
          {hours.length === 0 && "Mancano gli orari di apertura. "}
          {!booking.totalSeats && "Manca il numero di posti. "}
          {!booking.enabled && "Le prenotazioni sono sospese (spunta «Prenotazioni online attive»). "}
          Completa i passaggi 1 e 2 qui sotto.
        </Notice>
      )}

      <Card>
        <h2 className="font-display text-2xl">1. Posti e regole</h2>
        <AdminForm action={saveBookingSettings} className="mt-5 grid max-w-3xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Posti a sedere totali" hint="Quante persone possono sedersi in contemporanea.">
            <input name="totalSeats" type="number" min={1} inputMode="numeric" defaultValue={booking.totalSeats ?? ""} required className="field" />
          </Field>
          <Field label="Persone massime per prenotazione" hint="Oltre questo numero il sito invita a chiamare.">
            <input name="maxPartySize" type="number" min={1} inputMode="numeric" defaultValue={booking.maxPartySize} required className="field" />
          </Field>
          <Field label="Durata di un tavolo (minuti)" hint="Per quanto tempo un tavolo resta occupato.">
            <input name="durationMinutes" type="number" min={30} inputMode="numeric" defaultValue={booking.durationMinutes} required className="field" />
          </Field>
          <Field label="Orari proposti ogni (minuti)" hint="Con 30 il cliente sceglie 12:00, 12:30, 13:00…">
            <input name="slotMinutes" type="number" min={10} inputMode="numeric" defaultValue={booking.slotMinutes} required className="field" />
          </Field>
          <Field label="Preavviso minimo (ore)" hint="0 = si può prenotare anche per tra poco.">
            <input name="minNoticeHours" type="number" min={0} inputMode="numeric" defaultValue={booking.minNoticeHours} required className="field" />
          </Field>
          <Field label="Si prenota fino a (giorni)" hint="Quanto in anticipo i clienti possono prenotare.">
            <input name="maxDaysAhead" type="number" min={1} inputMode="numeric" defaultValue={booking.maxDaysAhead} required className="field" />
          </Field>
          <label className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <input type="checkbox" name="enabled" defaultChecked={booking.enabled} className="h-5 w-5 accent-[#a58a60]" />
            <span>
              <strong>Prenotazioni online attive.</strong> Togli la spunta per sospenderle (per esempio in vacanza).
            </span>
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <SaveButton>Salva regole</SaveButton>
          </div>
        </AdminForm>
      </Card>

      <Card className="mt-8">
        <h2 className="font-display text-2xl">2. Orari di apertura</h2>
        <p className="mt-1 text-sm text-espresso/70">
          Fino a due fasce per giorno (per esempio mattina e sera). Un giorno senza orari è un giorno di chiusura.
        </p>

        <details className="mt-5 border border-espresso/15 bg-[#f3efe6]/60">
          <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold">Scorciatoia: stesso orario su più giorni</summary>
          <AdminForm action={saveAllWeekdays} className="grid gap-4 px-4 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Apre">
              <input type="time" name="open1" className="field" />
            </Field>
            <Field label="Chiude">
              <input type="time" name="close1" className="field" />
            </Field>
            <Field label="Seconda fascia: apre (facoltativa)">
              <input type="time" name="open2" className="field" />
            </Field>
            <Field label="Chiude">
              <input type="time" name="close2" className="field" />
            </Field>
            <fieldset className="sm:col-span-2 lg:col-span-4">
              <legend className="mb-2 text-sm font-semibold">Applica a questi giorni</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {WEEK_ORDER.map((wd) => (
                  <label key={wd} className="flex min-h-11 items-center gap-2">
                    <input type="checkbox" name="days" value={wd} defaultChecked className="h-5 w-5 accent-[#a58a60]" />
                    {WEEKDAYS[wd]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="sm:col-span-2 lg:col-span-4">
              <SaveButton>Applica agli orari</SaveButton>
              <p className="mt-2 text-xs text-espresso/72">Sostituisce gli orari dei giorni spuntati. Poi puoi ritoccare un giorno singolo qui sotto.</p>
            </div>
          </AdminForm>
        </details>

        <div className="mt-4 divide-y divide-espresso/10">
          {WEEK_ORDER.map((wd) => {
            const ranges = hours.filter((h) => h.weekday === wd);
            return (
              <AdminForm
                key={wd}
                action={saveWeekday}
                success="Orari del giorno salvati"
                className="grid gap-3 py-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
              >
                <input type="hidden" name="weekday" value={wd} />
                <div className="flex items-center gap-3 sm:block">
                  <p className="font-semibold">{WEEKDAYS[wd]}</p>
                  {ranges.length === 0 && <p className="text-sm text-red-800">Chiuso</p>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-xs text-espresso/70">{i === 0 ? "Apre" : "Apre (2ª fascia)"}</span>
                        <input type="time" name={`open${i + 1}`} defaultValue={ranges[i]?.open ?? ""} className="field" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-espresso/70">Chiude</span>
                        <input type="time" name={`close${i + 1}`} defaultValue={ranges[i]?.close ?? ""} className="field" />
                      </label>
                    </div>
                  ))}
                </div>
                <SaveButton>Salva</SaveButton>
              </AdminForm>
            );
          })}
        </div>
      </Card>

      <Card className="mt-8">
        <h2 className="font-display text-2xl">3. Giorni di chiusura</h2>
        <p className="mt-1 text-sm text-espresso/70">Ferie, festività, giorni speciali: in questi giorni non si prenota e non si ritirano torte.</p>
        <AdminForm action={addClosure} resetOnSuccess success="Chiusura aggiunta" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[11rem_11rem_1fr_auto] lg:items-end">
          <Field label="Dal">
            <input type="date" name="from" required className="field" />
          </Field>
          <Field label="Al (facoltativo)">
            <input type="date" name="to" className="field" />
          </Field>
          <Field label="Motivo (facoltativo)" className="sm:col-span-2 lg:col-span-1">
            <input name="reason" maxLength={120} placeholder="es. Ferie estive" className="field" />
          </Field>
          <SaveButton>Aggiungi chiusura</SaveButton>
        </AdminForm>
        {closures.length === 0 ? (
          <p className="mt-6 text-sm text-espresso/72">Nessuna chiusura programmata.</p>
        ) : (
          <ul className="mt-6 divide-y divide-espresso/10">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <span>
                  <strong>{fmtDate(c.from)}</strong>
                  {c.to !== c.from && <> → <strong>{fmtDate(c.to)}</strong></>}
                  {c.reason && <span className="text-espresso/70"> · {c.reason}</span>}
                </span>
                <AdminForm action={deleteClosure} confirm="Rimuovere questa chiusura?" success="Chiusura rimossa">
                  <input type="hidden" name="id" value={c.id} />
                  <SaveButton className="min-h-11 px-2 text-sm text-red-800 underline underline-offset-4" pendingText="…">
                    Rimuovi
                  </SaveButton>
                </AdminForm>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
