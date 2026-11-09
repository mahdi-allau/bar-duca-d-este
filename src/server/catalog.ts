import "server-only";
import { query } from "./db";

export type ProductCategory = "colazione" | "aperitivo" | "pasticceria";

export type Product = {
  id: number;
  slug: string;
  category: ProductCategory;
  name: string;
  description: string;
  priceCents: number | null;
  image: string | null;
  sort: number;
  active: boolean;
};

type Row = {
  id: number;
  slug: string;
  category: ProductCategory;
  name: string;
  description: string;
  price_cents: number | null;
  image: string | null;
  sort: number;
  active: boolean;
};

const map = (r: Row): Product => ({
  id: r.id,
  slug: r.slug,
  category: r.category,
  name: r.name,
  description: r.description,
  priceCents: r.price_cents,
  image: r.image,
  sort: r.sort,
  active: r.active,
});

export async function listProducts(category?: ProductCategory, includeInactive = false) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (!includeInactive) where.push(`active = TRUE`);
  const rows = await query<Row>(
    `SELECT id, slug, category, name, description, price_cents, image, sort, active FROM products
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY category, sort, id`,
    params,
  );
  return rows.map(map);
}
