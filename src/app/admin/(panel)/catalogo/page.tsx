import Image from "next/image";
import { listProducts } from "@/server/catalog";
import { query } from "@/server/db";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Field, PageHeader } from "../ui";
import { createProduct, deleteProduct, saveProduct } from "./actions";

export const metadata = { title: "Prodotti" };

const CATS = [
  ["colazione", "Colazione"],
  ["pasticceria", "Pasticceria"],
  ["aperitivo", "Aperitivo"],
] as const;

const euro = (c: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(c / 100);

export default async function Catalogo() {
  const [products, media] = await Promise.all([
    listProducts(undefined, true),
    query<{ id: string; filename: string }>(`SELECT id, filename FROM media ORDER BY created_at DESC LIMIT 60`),
  ]);

  const imageField = (current: string | null) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Foto: scegli dalla libreria">
        <select name="imageUrl" defaultValue="" className="field">
          <option value="">{current ? "(mantieni quella attuale)" : "(nessuna foto)"}</option>
          <option value="/foto/colazione.webp">Foto del sito: cappuccino e cornetto</option>
          <option value="/foto/vetrina-dolci.webp">Foto del sito: vetrina dei dolci</option>
          <option value="/foto/tavolo-marmo.webp">Foto del sito: tavolo in marmo</option>
          <option value="/foto/aperitivo.webp">Foto del sito: aperitivo</option>
          {media.map((m) => (
            <option key={m.id} value={`/api/media/${m.id}`}>
              Caricata: {m.filename}
            </option>
          ))}
        </select>
      </Field>
      <Field label="…oppure carica una nuova foto" hint="JPG, PNG o WebP, massimo 4 MB.">
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="field" />
      </Field>
      <input type="hidden" name="currentImage" value={current ?? ""} />
    </div>
  );

  const fields = (p?: (typeof products)[number]) => (
    <>
      <Field label="Nome">
        <input name="name" defaultValue={p?.name} required className="field" />
      </Field>
      <Field label="Categoria (dove compare)">
        <select name="category" defaultValue={p?.category ?? "colazione"} className="field">
          {CATS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrizione" className="sm:col-span-2">
        <textarea name="description" defaultValue={p?.description} maxLength={600} className="field min-h-20" />
      </Field>
      <Field label="Prezzo in €" hint="Lascia vuoto per non mostrare il prezzo.">
        <input
          name="price"
          inputMode="decimal"
          placeholder="es. 3,50"
          defaultValue={p?.priceCents != null ? (p.priceCents / 100).toFixed(2).replace(".", ",") : ""}
          className="field"
        />
      </Field>
      <Field label="Posizione nell'elenco" hint="Numero più basso = più in alto.">
        <input name="sort" type="number" min={0} inputMode="numeric" defaultValue={p?.sort ?? 0} className="field" />
      </Field>
    </>
  );

  return (
    <>
      <PageHeader
        title="Prodotti"
        lead="I prodotti compaiono nelle pagine Colazione, Pasticceria e Aperitivo del sito. Tocca un prodotto per modificarlo. Un prodotto senza prezzo viene mostrato senza cifra: scrivi il prezzo solo quando lo hai deciso."
      />

      <Card className="mb-10">
        <details>
          <summary className="min-h-11 cursor-pointer font-display text-2xl">+ Nuovo prodotto</summary>
          <AdminForm action={createProduct} resetOnSuccess success="Prodotto aggiunto" className="mt-5 grid max-w-4xl gap-4 sm:grid-cols-2">
            {fields()}
            <div className="sm:col-span-2">{imageField(null)}</div>
            <div>
              <SaveButton>Aggiungi prodotto</SaveButton>
            </div>
          </AdminForm>
        </details>
      </Card>

      {CATS.map(([cat, label]) => {
        const list = products.filter((p) => p.category === cat);
        return (
          <section key={cat} className="mb-12">
            <h2 className="mb-1 font-display text-3xl">{label}</h2>
            <p className="mb-4 text-sm text-espresso/72">
              {list.length} {list.length === 1 ? "prodotto" : "prodotti"} · pagina «{label}» del sito
            </p>
            <div className="space-y-2">
              {list.map((p) => (
                <Card key={p.id} className="!p-0">
                  <details className="group">
                    <summary className="flex min-h-16 cursor-pointer items-center gap-4 p-3 sm:p-4">
                      <span className="relative h-12 w-16 shrink-0 bg-espresso/10">
                        {p.image && <Image src={p.image} alt="" fill sizes="64px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 grow">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="block text-sm text-espresso/72">
                          {p.priceCents != null ? euro(p.priceCents) : "senza prezzo"}
                          {!p.active && <span className="ml-2 font-semibold text-red-800">· nascosto sul sito</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm underline underline-offset-4 group-open:hidden">Modifica</span>
                      <span className="hidden shrink-0 text-sm underline underline-offset-4 group-open:inline">Chiudi</span>
                    </summary>
                    <div className="border-t border-espresso/10 p-4 sm:p-5">
                      <AdminForm action={saveProduct} success="Prodotto salvato" className="grid max-w-4xl gap-4 sm:grid-cols-2">
                        <input type="hidden" name="id" value={p.id} />
                        {fields(p)}
                        <div className="sm:col-span-2">{imageField(p.image)}</div>
                        <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
                          <input type="checkbox" name="active" defaultChecked={p.active} className="h-5 w-5 accent-[#a58a60]" />
                          <span>Visibile sul sito</span>
                        </label>
                        <div className="sm:col-span-2">
                          <SaveButton>Salva prodotto</SaveButton>
                        </div>
                      </AdminForm>
                      <AdminForm
                        action={deleteProduct}
                        confirm={`Eliminare «${p.name}»? Non si può annullare.`}
                        success="Prodotto eliminato"
                        className="mt-4 border-t border-espresso/10 pt-4"
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <SaveButton className="min-h-11 text-sm text-red-800 underline underline-offset-4" pendingText="Elimino…">
                          Elimina questo prodotto
                        </SaveButton>
                      </AdminForm>
                    </div>
                  </details>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
