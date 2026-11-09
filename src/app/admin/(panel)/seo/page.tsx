import { query } from "@/server/db";
import AdminForm, { SaveButton } from "../AdminForm";
import { Card, Field, PageHeader } from "../ui";
import { saveSeo } from "./actions";

export const metadata = { title: "Titoli per Google" };

const PAGES = [
  ["home", "Home page", "/"],
  ["colazione", "Colazione", "/colazione"],
  ["pasticceria", "Pasticceria", "/pasticceria"],
  ["aperitivo", "Aperitivo", "/aperitivo"],
  ["prenota", "Prenotazioni", "/prenota"],
  ["torte-personalizzate", "Torte ed eventi", "/torte-personalizzate"],
  ["crea-la-tua-torta", "Crea la tua torta", "/crea-la-tua-torta"],
] as const;

export default async function Seo() {
  const rows = await query<{ slug: string; title: string; description: string }>(
    `SELECT slug, title, description FROM seo_pages`,
  );
  const by = new Map(rows.map((r) => [r.slug, r]));

  return (
    <>
      <PageHeader
        title="Titoli per Google"
        lead="Il titolo e la descrizione che Google mostra nei risultati e che compaiono quando il link viene condiviso. Se lasci un campo vuoto il sito usa il testo predefinito. Indicativamente: titolo fino a 60 caratteri, descrizione fino a 155."
      />
      <div className="space-y-4">
        {PAGES.map(([slug, label, path]) => (
          <Card key={slug}>
            <details>
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-display text-2xl">{label}</span>
                <span className="text-sm text-espresso/72">
                  {path} · {by.get(slug)?.title ? "personalizzato" : "testo predefinito"}
                </span>
              </summary>
              <AdminForm action={saveSeo} className="mt-4 grid max-w-3xl gap-4">
                <input type="hidden" name="slug" value={slug} />
                <Field label="Titolo" hint="Il titolo blu del risultato su Google.">
                  <input name="title" maxLength={120} defaultValue={by.get(slug)?.title ?? ""} className="field" />
                </Field>
                <Field label="Descrizione" hint="Il testo sotto il titolo.">
                  <textarea name="description" maxLength={320} defaultValue={by.get(slug)?.description ?? ""} className="field min-h-24" />
                </Field>
                <div>
                  <SaveButton>Salva</SaveButton>
                </div>
              </AdminForm>
            </details>
          </Card>
        ))}
      </div>
    </>
  );
}
