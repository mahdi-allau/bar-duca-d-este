import Image from "next/image";
import Link from "next/link";
import { DEFAULT_CONFIG, TEXT_COLORS } from "@/lib/cake/defaults";
import { asJson } from "@/lib/json";
import { euro } from "@/lib/cake/pricing";
import { describeSize, tierSpecs } from "@/lib/cake/sizing";
import type { CakeConfig, PriceBreakdown } from "@/lib/cake/types";
import { query } from "@/server/db";
import { getCakeOptions } from "@/server/settings";
import { Card, Empty, LABELS, PageHeader, Status, fmtDate, fmtDateTime } from "../ui";
import AdminForm, { SaveButton } from "../AdminForm";
import { quickCakeStatus, updateCakeOrder } from "./actions";

export const metadata = { title: "Ordini torte" };

type Row = {
  id: string;
  reference: string;
  status: string;
  pickup_date: string;
  pickup_time: string;
  customer_name: string;
  phone: string;
  email: string;
  notes: string;
  config: CakeConfig;
  price_breakdown: PriceBreakdown & { pricesConfirmed?: boolean };
  total_cents: number;
  final_price_cents: number | null;
  preview_images: string[];
  admin_notes: string;
  created_at: Date;
};

/** The usual path of an order: one button moves it to the next step. */
const NEXT: Record<string, { status: string; label: string }> = {
  new: { status: "confirmed", label: "Conferma l'ordine" },
  confirmed: { status: "in_progress", label: "Metti in lavorazione" },
  in_progress: { status: "ready", label: "Segna come pronta" },
  ready: { status: "completed", label: "Segna come ritirata" },
};

const STATES = ["new", "in_progress", "confirmed", "ready", "completed", "cancelled"] as const;

export default async function Torte({ searchParams }: { searchParams: Promise<{ stato?: string; codice?: string }> }) {
  const { stato, codice } = await searchParams;
  const filtered = stato && (STATES as readonly string[]).includes(stato);
  const byCode = codice && /^TO-[A-Z0-9]{4,12}$/i.test(codice) ? codice.toUpperCase() : "";
  const [rawRows, options] = await Promise.all([
    query<Row>(
      `SELECT id, reference, status, pickup_date, pickup_time, customer_name, phone, email, notes, config,
              price_breakdown, total_cents, final_price_cents, preview_images, admin_notes, created_at
       FROM cake_orders ${byCode ? "WHERE reference = $1" : filtered ? "WHERE status = $1" : ""}
       ORDER BY pickup_date ASC, created_at DESC LIMIT 200`,
      byCode ? [byCode] : filtered ? [stato] : [],
    ),
    getCakeOptions(true),
  ]);
  // JSON columns can come back as text: normalise once so one odd row never breaks the page
  const rows = rawRows.map((r) => ({
    ...r,
    config: asJson<CakeConfig>(r.config, DEFAULT_CONFIG),
    price_breakdown: asJson<Row["price_breakdown"]>(r.price_breakdown, { baseCents: 0, lines: [], extrasCents: 0, totalCents: 0 }),
    preview_images: asJson<string[]>(r.preview_images, []),
  }));
  const name = (kind: string, slug: string) => options.find((o) => o.kind === kind && o.slug === slug)?.name ?? slug;
  const chip = (on: boolean) =>
    `border px-3 py-1.5 text-sm ${on ? "border-ink bg-ink text-ivory" : "border-espresso/25 hover:border-espresso"}`;

  return (
    <>
      <PageHeader
        title="Ordini torte"
        lead="Le torte progettate dai clienti nel configuratore 3D, con le anteprime e tutte le scelte. Il pulsante scuro di ogni ordine lo fa avanzare: conferma, lavorazione, pronta, ritirata."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/admin/torte" className={chip(!filtered)}>
          Tutti
        </Link>
        {STATES.map((s) => (
          <Link key={s} href={`/admin/torte?stato=${s}`} className={chip(stato === s)}>
            {LABELS[s]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>Nessun ordine di torte.</Empty>
      ) : (
        <div className="space-y-6">
          {rows.map((r) => {
            const c = r.config;
            const spec = tierSpecs(c)[0];
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-3xl">
                    Ritiro {fmtDate(r.pickup_date)}
                    {r.pickup_time && ` alle ${r.pickup_time}`}
                  </h2>
                  <Status value={r.status} />
                  <span className="text-sm text-espresso/72">{r.reference}</span>
                </div>
                <p className="mt-2">
                  <strong>{r.customer_name}</strong> ·{" "}
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-block py-2 underline underline-offset-4">
                    {r.phone}
                  </a>{" "}
                  ·{" "}
                  <a href={`mailto:${r.email}`} className="inline-block py-2 underline underline-offset-4">
                    {r.email}
                  </a>
                </p>
                {r.notes && <p className="mt-1 text-sm">Note del cliente: {r.notes}</p>}
                <p className="mt-1 text-xs text-espresso/72">Ricevuto il {fmtDateTime(r.created_at)}</p>

                <div className="mt-5 grid gap-6 lg:grid-cols-[18rem_1fr_16rem]">
                  <div className="space-y-2">
                    {r.preview_images.length === 0 && <p className="text-sm text-espresso/72">Nessuna anteprima.</p>}
                    {r.preview_images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                        <Image src={src} alt={i === 0 ? "Anteprima della torta" : "Sezione interna della torta"} width={288} height={230} unoptimized className="h-auto w-full border border-espresso/15" />
                        <span className="text-xs text-espresso/72">{i === 0 ? "Torta intera" : "Sezione interna"} · apri</span>
                      </a>
                    ))}
                  </div>

                  <div className="text-sm">
                    <dl className="space-y-1.5">
                      {[
                        ["Forma", name("shape", c.shape)],
                        ["Dimensioni", `${c.persons} persone · ${describeSize(c.shape === "tiered" ? "round" : c.shape, spec.areaCm2)} · altezza ${c.heightCm} cm${c.tiers > 1 ? ` · ${c.tiers} piani` : ""}`],
                        ["Pan di Spagna", `${name("sponge", c.sponge)} · ${c.spongeLayers} strati`],
                        ["Farciture (dal basso)", c.fillings.map((f) => name("filling", f)).join(" → ")],
                        ["Copertura", name("cover", c.cover)],
                        ["Decorazioni", c.toppings.length ? c.toppings.map((t) => name("topping", t)).join(", ") : "Nessuna"],
                        ["Scritta", [c.text.message, c.text.name, c.text.age, c.text.dedication].filter(Boolean).join(" · ") || "Nessuna"],
                        ...(c.text.message || c.text.name || c.text.age || c.text.dedication ? [["Colore scritta", TEXT_COLORS.find((x) => x.value === c.text.color)?.name ?? c.text.color]] : []),
                        ...(c.custom ? [["Decorazione personalizzata", c.custom]] : []),
                      ].map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[10rem_1fr] gap-3">
                          <dt className="text-espresso/72">{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <table className="mt-4 w-full">
                      <tbody>
                        <tr className="border-b border-espresso/10">
                          <td className="py-1">Prezzo base</td>
                          <td className="py-1 text-right">{euro(r.price_breakdown.baseCents)}</td>
                        </tr>
                        {r.price_breakdown.lines
                          .filter((l) => l.cents > 0)
                          .map((l, i) => (
                            <tr key={i} className="border-b border-espresso/10">
                              <td className="py-1">{l.label}</td>
                              <td className="py-1 text-right">+{euro(l.cents)}</td>
                            </tr>
                          ))}
                        <tr>
                          <td className="pt-2 font-semibold">Totale calcolato</td>
                          <td className="pt-2 text-right font-semibold">{euro(r.total_cents)}</td>
                        </tr>
                      </tbody>
                    </table>
                    {r.price_breakdown.pricesConfirmed === false && (
                      <p className="mt-2 text-xs text-amber-800">Al momento dell&rsquo;ordine i prezzi erano ancora indicativi.</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {NEXT[r.status] && (
                      <AdminForm action={quickCakeStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={NEXT[r.status].status} />
                        <SaveButton className="btn btn-dark min-h-12 w-full" pendingText="…">
                          {NEXT[r.status].label}
                        </SaveButton>
                      </AdminForm>
                    )}
                    {(r.status === "new" || r.status === "confirmed" || r.status === "in_progress") && (
                      <AdminForm action={quickCakeStatus} confirm="Annullare questo ordine?">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <SaveButton className="btn btn-line min-h-11 w-full !border-red-800 !text-red-800" pendingText="…">
                          Annulla ordine
                        </SaveButton>
                      </AdminForm>
                    )}
                    <details className="border border-espresso/15 bg-[#f3efe6]/50" open={r.status === "new"}>
                      <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold">Prezzo finale, stato e note</summary>
                      <AdminForm action={updateCakeOrder} success="Ordine aggiornato" className="flex flex-col gap-2 p-3 pt-1">
                        <input type="hidden" name="id" value={r.id} />
                        <select name="status" defaultValue={r.status} className="field" aria-label="Stato">
                          {STATES.map((s) => (
                            <option key={s} value={s}>
                              {LABELS[s]}
                            </option>
                          ))}
                        </select>
                        <label className="block">
                          <span className="mb-1 block text-xs text-espresso/70">
                            Prezzo finale in € (vuoto = totale calcolato, {euro(r.total_cents)})
                          </span>
                          <input name="finalPrice" inputMode="decimal" defaultValue={r.final_price_cents != null ? (r.final_price_cents / 100).toFixed(2).replace(".", ",") : ""} className="field" />
                        </label>
                        <textarea name="adminNotes" defaultValue={r.admin_notes} placeholder="Nota interna (il cliente non la vede)" className="field min-h-20" />
                        <SaveButton>Salva</SaveButton>
                      </AdminForm>
                    </details>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
