import { getCakeOptions } from "@/server/settings";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Field, PageHeader } from "../ui";
import { addOption, saveOption } from "./actions";

export const metadata = { title: "Ingredienti torta" };

const GROUPS = [
  ["sponge", "Pan di Spagna", "Il gusto dell'impasto.", true],
  ["filling", "Farciture", "Le creme tra gli strati.", true],
  ["cover", "Coperture", "Come viene rivestita la torta.", false],
  ["topping", "Decorazioni", "Frutta, cioccolato e dettagli sopra la torta.", false],
  ["shape", "Forme", "La forma della torta.", false],
] as const;

export default async function Ingredienti() {
  const options = await getCakeOptions(true);

  return (
    <>
      <PageHeader
        title="Ingredienti"
        lead="Quello che il cliente trova nel configuratore. «Prezzo +€» si aggiunge al prezzo base. Togli la spunta da «Attivo» per far sparire un ingrediente dal sito. Per Pan di Spagna e farciture puoi aggiungere varianti nuove; forme, coperture e decorazioni hanno un modello 3D fisso: di queste si cambiano nome, prezzo e disponibilità."
      />

      {GROUPS.map(([kind, label, sub, canAdd]) => (
        <section key={kind} className="mb-12">
          <h2 className="font-display text-3xl">{label}</h2>
          <p className="mb-4 text-sm text-espresso/72">{sub}</p>
          <div className="space-y-2">
            {options
              .filter((o) => o.kind === kind)
              .map((o) => (
                <Card key={o.id} className="!p-0">
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer items-center gap-3 p-3 sm:px-4">
                      {typeof o.data.color === "string" ? (
                        <span className="h-6 w-6 shrink-0 rounded-full border border-espresso/20" style={{ background: o.data.color }} aria-hidden />
                      ) : (
                        <span className="h-6 w-6 shrink-0" aria-hidden />
                      )}
                      <span className="min-w-0 grow">
                        <span className={`block truncate font-semibold ${o.active ? "" : "text-espresso/70 line-through"}`}>{o.name}</span>
                        <span className="block text-sm text-espresso/72">
                          {o.priceCents > 0 ? `+${(o.priceCents / 100).toFixed(2).replace(".", ",")} €` : "nessun supplemento"}
                          {!o.active && <span className="ml-2 font-semibold text-red-800">· non attivo</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm underline underline-offset-4 group-open:hidden">Modifica</span>
                      <span className="hidden shrink-0 text-sm underline underline-offset-4 group-open:inline">Chiudi</span>
                    </summary>
                    <AdminForm
                      action={saveOption}
                      success="Ingrediente salvato"
                      className="grid items-end gap-3 border-t border-espresso/10 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.6fr_7rem_5rem_4.5rem_auto_auto]"
                    >
                      <input type="hidden" name="id" value={o.id} />
                      <Field label="Nome">
                        <input name="name" defaultValue={o.name} required className="field" />
                      </Field>
                      <Field label="Descrizione">
                        <input name="description" defaultValue={o.description} className="field" />
                      </Field>
                      <Field label="Prezzo +€">
                        <input name="price" inputMode="decimal" defaultValue={(o.priceCents / 100).toFixed(2).replace(".", ",")} className="field" />
                      </Field>
                      <Field label="Posizione">
                        <input name="sort" type="number" min={0} inputMode="numeric" defaultValue={o.sort} className="field" />
                      </Field>
                      {typeof o.data.color === "string" ? (
                        <Field label="Colore">
                          <input name="color" type="color" defaultValue={o.data.color} className="h-12 w-full cursor-pointer border border-espresso/30" />
                        </Field>
                      ) : (
                        <span className="hidden lg:block" />
                      )}
                      <label className="flex h-12 items-center gap-2">
                        <input type="checkbox" name="active" defaultChecked={o.active} className="h-5 w-5 accent-[#a58a60]" />
                        <span className="text-sm">Attivo</span>
                      </label>
                      <SaveButton>Salva</SaveButton>
                    </AdminForm>
                  </details>
                </Card>
              ))}
          </div>

          {canAdd && (
            <Card className="mt-3 !p-4">
              <AdminForm action={addOption} resetOnSuccess success="Ingrediente aggiunto" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="kind" value={kind} />
                <Field label={`Nuovo: ${label.toLowerCase()}`} className="w-full sm:w-72">
                  <input name="name" required placeholder="es. Crema al caffè" className="field" />
                </Field>
                <Field label="Prezzo +€" className="w-28">
                  <input name="price" inputMode="decimal" defaultValue="0" className="field" />
                </Field>
                <Field label="Colore nella torta 3D" className="w-40">
                  <input name="color" type="color" defaultValue="#d9b27c" className="h-12 w-full cursor-pointer border border-espresso/30" />
                </Field>
                <SaveButton className="btn btn-line btn-sm !border-ink !text-ink hover:!bg-ink hover:!text-ivory">Aggiungi</SaveButton>
              </AdminForm>
            </Card>
          )}
        </section>
      ))}
    </>
  );
}
