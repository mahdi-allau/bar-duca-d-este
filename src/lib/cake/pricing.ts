import { z } from "zod";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { DEFAULT_CONFIG } from "./defaults";
import {
  HEIGHT_RANGE,
  LAYER_RANGE,
  diameterFromPersons,
} from "./sizing";
import type { CakeConfig, CakeOption, CakePricing, PriceBreakdown, PriceLine } from "./types";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const cakeConfigSchema = z.object({
  shape: z.string().min(1).max(40),
  persons: z.number().int(),
  diameterCm: z.number(),
  heightCm: z.number(),
  tiers: z.number().int(),
  sponge: z.string().min(1).max(40),
  spongeLayers: z.number().int(),
  fillings: z.array(z.string().max(40)).max(6),
  cover: z.string().min(1).max(40),
  toppings: z.array(z.string().max(40)).max(20),
  text: z.object({
    name: z.string().max(40),
    age: z.string().max(6),
    dedication: z.string().max(80),
    message: z.string().max(60),
    color: hex,
  }),
  custom: z.string().max(500),
});

const find = (options: CakeOption[], kind: CakeOption["kind"], slug: string) =>
  options.find((o) => o.kind === kind && o.slug === slug && o.active);

const firstActive = (options: CakeOption[], kind: CakeOption["kind"]) =>
  options.filter((o) => o.kind === kind && o.active).sort((a, b) => a.sort - b.sort)[0];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Brings any configuration (from the browser, or from an older saved order)
 * back to something valid: unknown or disabled options are replaced, numbers
 * are clamped, and the filling list always matches the number of layers.
 */
export function normalizeConfig(
  raw: Partial<CakeConfig>,
  options: CakeOption[],
  pricing: CakePricing,
): CakeConfig {
  const base = { ...DEFAULT_CONFIG, ...raw, text: { ...DEFAULT_CONFIG.text, ...raw.text } };

  const shape = find(options, "shape", base.shape) ?? firstActive(options, "shape");
  const sponge = find(options, "sponge", base.sponge) ?? firstActive(options, "sponge");
  const cover = find(options, "cover", base.cover) ?? firstActive(options, "cover");

  const shapeSlug = shape?.slug ?? "round";
  const tiers =
    shapeSlug === "tiered" ? clamp(Math.round(base.tiers) || 2, 2, 4) : 1;
  const heightCm = clamp(Number(base.heightCm) || 8, HEIGHT_RANGE.min, HEIGHT_RANGE.max);
  const persons = clamp(Math.round(base.persons) || 10, pricing.minPersons, pricing.maxPersons);
  const spongeLayers = clamp(
    Math.round(base.spongeLayers) || 3,
    LAYER_RANGE.min,
    LAYER_RANGE.max,
  );

  const activeFillings = options.filter((o) => o.kind === "filling" && o.active);
  const fallback = activeFillings[0]?.slug ?? "";
  const fillings = Array.from({ length: spongeLayers - 1 }, (_, i) => {
    const wanted = base.fillings[i];
    return activeFillings.some((f) => f.slug === wanted) ? wanted : fallback;
  });

  const toppings = [...new Set(base.toppings)].filter((t) => find(options, "topping", t));

  return {
    shape: shapeSlug,
    persons,
    diameterCm: Math.round(diameterFromPersons(persons, heightCm, tiers)),
    heightCm,
    tiers,
    sponge: sponge?.slug ?? "classico",
    spongeLayers,
    fillings,
    cover: cover?.slug ?? "panna",
    toppings,
    text: {
      name: base.text.name.trim(),
      age: base.text.age.trim(),
      dedication: base.text.dedication.trim(),
      message: base.text.message.trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(base.text.color) ? base.text.color : "#4a2a1b",
    },
    custom: base.custom.trim(),
  };
}

export const hasText = (c: CakeConfig) =>
  Boolean(c.text.name || c.text.age || c.text.dedication || c.text.message);

/** Wording of the price lines. The order saved for the pastry chef always uses the Italian default. */
export type PriceLabels = { shape: string; sponge: string; cover: string; filling: string; topping: string; text: string };
const IT_LABELS: PriceLabels = {
  shape: "Forma: ",
  sponge: "Pan di Spagna: ",
  cover: "Copertura: ",
  filling: "Farcitura: ",
  topping: "Decorazione: ",
  text: "Scritta personalizzata",
};

/** Price of a configuration: the base price plus every option that was added. */
export function computePrice(
  config: CakeConfig,
  options: CakeOption[],
  pricing: CakePricing,
  labels: PriceLabels = IT_LABELS,
): PriceBreakdown {
  const extraPersons = Math.max(0, config.persons - pricing.includedPersons);
  const baseCents =
    pricing.basePriceCents +
    extraPersons * pricing.extraPersonCents +
    (config.tiers - 1) * pricing.extraTierCents;

  const lines: PriceLine[] = [];
  const add = (kind: CakeOption["kind"], slug: string, prefix = "") => {
    const o = find(options, kind, slug);
    if (o) lines.push({ label: prefix + o.name, cents: o.priceCents });
  };

  add("shape", config.shape, labels.shape);
  add("sponge", config.sponge, labels.sponge);
  add("cover", config.cover, labels.cover);
  // A filling is charged once, however many layers use it.
  for (const slug of [...new Set(config.fillings)]) add("filling", slug, labels.filling);
  for (const slug of config.toppings) add("topping", slug, labels.topping);
  if (hasText(config)) lines.push({ label: labels.text, cents: pricing.textPriceCents });

  const extrasCents = lines.reduce((sum, l) => sum + l.cents, 0);
  return { baseCents, lines, extrasCents, totalCents: baseCents + extrasCents };
}

export const euro = (cents: number, lang: Locale = "it") =>
  new Intl.NumberFormat(intlLocale(lang), { style: "currency", currency: "EUR" }).format(cents / 100);
