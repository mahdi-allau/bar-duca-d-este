import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema-sql";

/**
 * One tiny query interface over two real PostgreSQL drivers:
 *  - production / staging: `postgres` (set DATABASE_URL, e.g. Supabase or Neon)
 *  - local development:    PGlite, a WASM build of Postgres stored in ./.data
 * Queries are plain parameterised SQL ($1, $2 …), so both behave the same.
 */
export type Q = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

interface Driver {
  query: Q;
  tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>;
  kind: "postgres" | "pglite";
}

const g = globalThis as unknown as {
  __deDriver?: Promise<Driver>;
  __deReady?: Promise<void>;
};

async function createDriver(): Promise<Driver> {
  // DATABASE_URL: any Postgres. NETLIFY_DB_URL: the database Netlify provisions for the site.
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, {
      max: process.env.NODE_ENV === "production" ? 3 : 5,
      prepare: false, // works behind transaction poolers (Supabase, Neon)
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
      onnotice: () => {},
      // Our queries pass JSON as text (`$1::jsonb` + JSON.stringify). By default this driver would
      // stringify that text a second time and store a JSON *string* instead of an object, so a
      // jsonb value must go through unchanged when it already is text. (PGlite never did this.)
      types: {
        json: {
          to: 114,
          from: [114, 3802],
          serialize: (x: unknown) => (typeof x === "string" ? x : JSON.stringify(x)),
          parse: (x: string) => JSON.parse(x),
        },
      },
    });
    const run =
      (conn: { unsafe: (t: string, p?: never[]) => PromiseLike<unknown> }): Q =>
      async (text, params = []) =>
        (await conn.unsafe(text, params as never[])) as never;
    return {
      kind: "postgres",
      query: run(sql as never),
      tx: (fn) => sql.begin((t) => fn(run(t as never))) as never,
    };
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB) {
    throw new Error(
      "DATABASE_URL is not set. Production needs a PostgreSQL database (see README).",
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  const run =
    (conn: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Q =>
    async (text, params = []) =>
      (await conn.query(text, params)).rows as never;
  return {
    kind: "pglite",
    query: run(db as never),
    tx: (fn) => db.transaction((t) => fn(run(t as never))),
  };
}

function driver() {
  g.__deDriver ??= createDriver().catch((e) => {
    g.__deDriver = undefined; // do not cache a failed start
    throw e;
  });
  return g.__deDriver;
}

/** Create tables, seed defaults and the first admin (once per process). */
export function ensureReady() {
  g.__deReady ??= (async () => {
    const d = await driver();
    for (const stmt of SCHEMA_SQL.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      await d.query(stmt);
    }
    const { seedDefaults } = await import("./seed");
    await seedDefaults(d.query);
  })().catch((e) => {
    g.__deReady = undefined; // allow a retry on the next request
    throw e;
  });
  return g.__deReady;
}

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
  await ensureReady();
  return (await driver()).query<T>(text, params);
}

export async function transaction<T>(fn: (q: Q) => Promise<T>) {
  await ensureReady();
  return (await driver()).tx(fn);
}

export async function one<T = Record<string, unknown>>(text: string, params?: unknown[]) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
