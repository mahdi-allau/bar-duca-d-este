import "server-only";
import { DEFAULT_OPTIONS, DEFAULT_PRICING } from "@/lib/cake/defaults";
import { hashPassword } from "../password";
import type { Q } from "./index";

type ProductSeed = {
  slug: string;
  category: "colazione" | "aperitivo" | "pasticceria";
  name: string;
  description: string;
  image: string;
};

/**
 * Product cards come from the lists in the project brief. They carry NO price:
 * the owner fills prices in from the admin panel, and a card without a price
 * simply does not show one.
 */
const PRODUCTS: ProductSeed[] = [
  { slug: "cappuccino", category: "colazione", name: "Cappuccino", description: "Espresso e latte montato, servito in tazza di porcellana.", image: "/foto/colazione.webp" },
  { slug: "caffe-espresso", category: "colazione", name: "Caffè espresso", description: "Il caffè al bancone o al tavolo, nella sua versione più semplice.", image: "/foto/dettaglio-caffe.webp" },
  { slug: "brioche", category: "colazione", name: "Brioche", description: "Brioche e cornetti, per cominciare la giornata con qualcosa di dolce.", image: "/foto/dettaglio-cornetti.webp" },
  { slug: "cornetti-farciti", category: "colazione", name: "Cornetti farciti", description: "Cornetti farciti, dalla vetrina.", image: "/foto/vetrina-dolci.webp" },
  { slug: "pasticceria-fresca", category: "colazione", name: "Pasticceria fresca", description: "Pasticcini e dolci monoporzione da scegliere in vetrina.", image: "/foto/dettaglio-pasticcini.webp" },
  { slug: "biscotti", category: "colazione", name: "Biscotti", description: "Biscotti da accompagnare al caffè o alla cioccolata.", image: "/foto/tavolo-marmo.webp" },
  { slug: "colazione-completa", category: "colazione", name: "Colazione completa", description: "Bevanda calda e dolce da abbinare, per una colazione senza fretta.", image: "/foto/colazione.webp" },

  { slug: "spritz", category: "aperitivo", name: "Spritz", description: "Il classico dell'aperitivo, servito freddo nel calice.", image: "/foto/aperitivo.webp" },
  { slug: "cocktail", category: "aperitivo", name: "Cocktail e drink", description: "Cocktail e drink per accompagnare la serata.", image: "/foto/dettaglio-cocktail.webp" },
  { slug: "calici", category: "aperitivo", name: "Calici", description: "Vino e bollicine al calice.", image: "/foto/aperitivo.webp" },
  { slug: "taglieri", category: "aperitivo", name: "Taglieri", description: "Taglieri da condividere al tavolo.", image: "/foto/dettaglio-cocktail.webp" },
  { slug: "tartine", category: "aperitivo", name: "Tartine", description: "Tartine e crostini per accompagnare il drink.", image: "/foto/aperitivo.webp" },
  { slug: "salumi-e-formaggi", category: "aperitivo", name: "Salumi e formaggi", description: "Salumi e formaggi serviti con l'aperitivo.", image: "/foto/dettaglio-cocktail.webp" },
  { slug: "stuzzichini", category: "aperitivo", name: "Stuzzichini", description: "Olive e stuzzichini per cominciare.", image: "/foto/aperitivo.webp" },

  { slug: "pasticcini", category: "pasticceria", name: "Pasticcini e mignon", description: "Piccola pasticceria da scegliere e assaggiare.", image: "/foto/dettaglio-pasticcini.webp" },
  { slug: "lievitati", category: "pasticceria", name: "Lievitati", description: "Brioche, cornetti e girelle dalla vetrina.", image: "/foto/dettaglio-cornetti.webp" },
  { slug: "biscotteria", category: "pasticceria", name: "Biscotteria", description: "Biscotti e frollini.", image: "/foto/tavolo-marmo.webp" },
  { slug: "torte-personalizzate", category: "pasticceria", name: "Torte personalizzate", description: "Torte su ordinazione, che puoi progettare dal configuratore 3D.", image: "/foto/vetrina-dolci.webp" },
];

const DEFAULT_BOOKING = {
  enabled: true,
  slotMinutes: 30,
  durationMinutes: 90,
  /** null = not configured yet: online booking stays closed until it is set. */
  totalSeats: null as number | null,
  maxPartySize: 10,
  minNoticeHours: 2,
  maxDaysAhead: 60,
};

/**
 * Repair for rows written while the production driver double-encoded JSON: a jsonb value that is a
 * JSON *string* holding an object or array becomes the object/array itself. Idempotent, and a no-op
 * once nothing is left to fix. Run twice in case a value was encoded more than once.
 */
const JSON_COLUMNS: [table: string, column: string][] = [
  ["cake_options", "data"],
  ["settings", "value"],
  ["cake_orders", "config"],
  ["cake_orders", "price_breakdown"],
  ["cake_orders", "preview_images"],
];

async function repairDoubleEncodedJson(q: Q) {
  for (let pass = 0; pass < 2; pass++) {
    for (const [table, column] of JSON_COLUMNS) {
      try {
        await q(
          `UPDATE ${table} SET ${column} = (${column} #>> '{}')::jsonb
           WHERE jsonb_typeof(${column}) = 'string' AND left(ltrim(${column} #>> '{}'), 1) IN ('{', '[')`,
        );
      } catch (e) {
        // never block the site from starting over a repair
        console.error(`[db] could not repair ${table}.${column}:`, (e as Error).message);
      }
    }
  }
}

export async function seedDefaults(q: Q) {
  await repairDoubleEncodedJson(q);

  for (const o of DEFAULT_OPTIONS) {
    await q(
      `INSERT INTO cake_options (kind, slug, name, description, price_cents, sort, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (kind, slug) DO NOTHING`,
      [o.kind, o.slug, o.name, o.description, o.priceCents, o.sort, JSON.stringify(o.data)],
    );
  }

  // One-off: the heart shape was dropped from the catalogue. Marked in settings so an owner who
  // re-enables it later is not overridden at the next cold start.
  const [done] = await q<{ n: number | string }>(
    `SELECT count(*) AS n FROM settings WHERE key = 'migrated_no_heart'`,
  );
  if (Number(done.n) === 0) {
    await q(`UPDATE cake_options SET active = false WHERE kind = 'shape' AND slug = 'heart'`);
    await q(`INSERT INTO settings (key, value) VALUES ('migrated_no_heart', 'true'::jsonb) ON CONFLICT (key) DO NOTHING`);
  }

  const defaults: Record<string, unknown> = {
    cake_pricing: DEFAULT_PRICING,
    booking: DEFAULT_BOOKING,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await q(`INSERT INTO settings (key, value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO NOTHING`, [
      key,
      JSON.stringify(value),
    ]);
  }

  const [{ count }] = await q<{ count: number | string }>(`SELECT count(*) AS count FROM products`);
  if (Number(count) === 0) {
    let sort = 0;
    for (const p of PRODUCTS) {
      await q(
        `INSERT INTO products (slug, category, name, description, image, sort)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO NOTHING`,
        [p.slug, p.category, p.name, p.description, p.image, sort++],
      );
    }
  }

  // First administrator: created only from environment variables, never from the web.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const [{ count: admins }] = await q<{ count: number | string }>(`SELECT count(*) AS count FROM admin_users`);
    if (Number(admins) === 0) {
      await q(`INSERT INTO admin_users (email, password_hash) VALUES ($1,$2)`, [
        email,
        await hashPassword(password),
      ]);
    }
  }
}
