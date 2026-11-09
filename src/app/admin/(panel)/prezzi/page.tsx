import { getCakePricing } from "@/server/settings";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Field, Notice, PageHeader } from "../ui";
import { savePricing } from "./actions";

export const metadata = { title: "Prezzi e ritiri torte" };

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default async function Prezzi() {
  const p = await getCakePricing();
  const num = (name: string, label: string, value: number, hint?: string) => (
    <Field label={label} hint={hint}>
      <input name={name} type="number" inputMode="numeric" min={0} defaultValue={value} required className="field" />
    </Field>
  );
  const money = (name: string, label: string, cents: number, hint?: string) => (
    <Field label={label} hint={hint}>
      <input name={name} inputMode="decimal" defaultValue={eur(cents)} required className="field" />
    </Field>
  );

  return (
    <>
      <PageHeader
        title="Prezzi e ritiri torte"
        lead={
          <>
            Il prezzo di una torta è: <strong>prezzo base</strong> (fino al numero di persone incluse) + persone in più +
            piani aggiuntivi + ingredienti scelti. Il supplemento di ogni ingrediente si cambia in «Ingredienti».
          </>
        }
      />

      {p.pricesConfirmed ? (
        <Notice tone="ok">
          <strong>Prezzi confermati.</strong> Il configuratore mostra i prezzi senza avvisi.
        </Notice>
      ) : (
        <Notice tone="warn">
          <strong>Prezzi ancora indicativi.</strong> I valori qui sotto sono di partenza: controllali e poi spunta «Prezzi
          confermati» in fondo. Finché non lo fai, il sito dice ai clienti che il prezzo lo conferma la pasticceria.
        </Notice>
      )}

      <Card>
        <AdminForm action={savePricing} className="grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="font-display text-2xl sm:col-span-2 lg:col-span-3">Prezzi</h2>
          {money("basePriceCents", "Prezzo base (€)", p.basePriceCents, "Comprende le persone incluse.")}
          {num("includedPersons", "Persone incluse nel prezzo base", p.includedPersons)}
          {money("extraPersonCents", "Per ogni persona in più (€)", p.extraPersonCents)}
          {money("extraTierCents", "Per ogni piano aggiuntivo (€)", p.extraTierCents)}
          {money("textPriceCents", "Scritta personalizzata (€)", p.textPriceCents, "Una sola volta, se c'è almeno una scritta.")}

          <h2 className="mt-4 font-display text-2xl sm:col-span-2 lg:col-span-3">Persone e ritiro</h2>
          {num("minPersons", "Persone minime", p.minPersons)}
          {num("maxPersons", "Persone massime", p.maxPersons)}
          <span className="hidden lg:block" />
          {num("minNoticeDays", "Giorni di preavviso per il ritiro", p.minNoticeDays, "Il cliente non può scegliere date più vicine.")}
          {num("maxOrdersPerDay", "Ordini massimi per giorno di ritiro", p.maxOrdersPerDay, "0 = nessun limite.")}

          <label className="mt-2 flex items-start gap-3 border border-espresso/20 bg-[#f3efe6]/70 p-4 sm:col-span-2 lg:col-span-3">
            <input type="checkbox" name="pricesConfirmed" defaultChecked={p.pricesConfirmed} className="mt-1 h-5 w-5 shrink-0 accent-[#a58a60]" />
            <span>
              <strong>Prezzi confermati.</strong> Spunta quando i prezzi sono quelli veri: il configuratore smette di
              avvisare che sono indicativi.
            </span>
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <SaveButton>Salva prezzi</SaveButton>
          </div>
        </AdminForm>
      </Card>
      <p className="mt-6 max-w-2xl text-sm text-espresso/70">
        I giorni di chiusura (in cui non si ritira) si impostano in «Orari, posti e chiusure».
      </p>
    </>
  );
}
