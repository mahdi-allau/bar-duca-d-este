import type { CakeConfig, CakeOption, CakePricing } from "./types";

/**
 * Starting catalogue for the configurator. Prices marked "esempio" come from
 * the examples in the project brief; the others are placeholders. Everything
 * can be changed from the admin panel, and `pricesConfirmed` stays false (so
 * the public site says "indicative prices") until the owner confirms them.
 */
export const DEFAULT_PRICING: CakePricing = {
  basePriceCents: 3000, // esempio del brief
  includedPersons: 6,
  extraPersonCents: 200,
  extraTierCents: 1500,
  textPriceCents: 200, // esempio del brief
  minPersons: 4,
  maxPersons: 60,
  minNoticeDays: 2,
  maxOrdersPerDay: 0,
  pricesConfirmed: false,
};

type Seed = Omit<CakeOption, "id" | "active">;

const s = (
  kind: CakeOption["kind"],
  slug: string,
  name: string,
  sort: number,
  priceCents = 0,
  data: Record<string, unknown> = {},
  description = "",
): Seed => ({ kind, slug, name, description, priceCents, sort, data });

export const DEFAULT_OPTIONS: Seed[] = [
  s("shape", "round", "Rotonda", 1),
  s("shape", "square", "Quadrata", 2),
  s("shape", "rectangle", "Rettangolare", 3),
  s("shape", "tiered", "A più piani", 4),

  s("sponge", "classico", "Pan di Spagna classico", 1, 0, { color: "#e6c27d" }),
  s("sponge", "cioccolato", "Cioccolato", 2, 0, { color: "#5b3a27" }),
  s("sponge", "vaniglia", "Vaniglia", 3, 0, { color: "#f1dc9c" }),
  s("sponge", "pistacchio", "Pistacchio", 4, 0, { color: "#b9c77e" }),
  s("sponge", "limone", "Limone", 5, 0, { color: "#f0df7a" }),
  s("sponge", "nocciola", "Nocciola", 6, 0, { color: "#b98c5e" }),

  s("filling", "crema-pasticcera", "Crema pasticcera", 1, 0, { color: "#f3d77c", gloss: 0.35 }),
  s("filling", "chantilly", "Crema chantilly", 2, 0, { color: "#fcf8ee", gloss: 0.5 }),
  s("filling", "crema-cioccolato", "Crema al cioccolato", 3, 0, { color: "#4a2a1b", gloss: 0.3 }),
  s("filling", "crema-pistacchio", "Crema al pistacchio", 4, 500, { color: "#a4bf68", gloss: 0.35 }), // esempio del brief
  s("filling", "crema-nocciola", "Crema alla nocciola", 5, 0, { color: "#a2744a", gloss: 0.3 }),
  s("filling", "crema-mascarpone", "Crema al mascarpone", 6, 0, { color: "#f7eedb", gloss: 0.45 }),
  s("filling", "marmellata", "Marmellata di frutti rossi", 7, 0, { color: "#a3182f", gloss: 0.15 }),
  s("filling", "crema-limone", "Crema al limone", 8, 0, { color: "#f0e168", gloss: 0.3 }),

  s("cover", "panna", "Panna montata", 1, 0, { color: "#fbf8f0" }),
  s("cover", "ganache", "Ganache al cioccolato", 2, 0, { color: "#3a2317" }),
  s("cover", "naked", "Naked cake (strati a vista)", 3, 0, { color: "#fbf8f0" }),

  s("topping", "fragole", "Fragole", 1, 400, {}, "Fragole fresche"), // esempio del brief
  s("topping", "lamponi", "Lamponi", 2, 0),
  s("topping", "mirtilli", "Mirtilli", 3, 0),
  s("topping", "cioccolato", "Cioccolato", 4, 300, {}, "Glassa lucida e colature"), // esempio del brief
  s("topping", "scaglie", "Scaglie di cioccolato", 5, 0),
  s("topping", "granella", "Granella di pistacchio", 6, 0),
  s("topping", "macaron", "Macaron", 7, 500), // esempio del brief
  s("topping", "fiori", "Fiori edibili", 8, 0),
  s("topping", "panna", "Ciuffi di panna", 9, 0),
  s("topping", "personalizzata", "Decorazione personalizzata", 10, 0, { note: true }, "Da concordare con la pasticceria"),
];

export const DEFAULT_CONFIG: CakeConfig = {
  shape: "round",
  persons: 10,
  diameterCm: 24,
  heightCm: 8,
  tiers: 1,
  sponge: "classico",
  spongeLayers: 3,
  fillings: ["crema-pasticcera", "chantilly"],
  cover: "panna",
  toppings: ["fragole"],
  text: { name: "", age: "", dedication: "", message: "", color: "#4a2a1b" },
  custom: "",
};

export const TEXT_COLORS = [
  { name: "Cioccolato", value: "#4a2a1b" },
  { name: "Bianco", value: "#ffffff" },
  { name: "Oro", value: "#b58a3b" },
  { name: "Bordeaux", value: "#5a1a26" },
];
