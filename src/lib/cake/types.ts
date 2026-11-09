export type OptionKind = "shape" | "sponge" | "filling" | "topping" | "cover";

export type CakeOption = {
  id: number;
  kind: OptionKind;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  active: boolean;
  sort: number;
  /** Free-form data used by the 3D model, e.g. { color: "#e8c98a" }. */
  data: Record<string, unknown>;
};

export type CakePricing = {
  /** Price of a cake serving up to `includedPersons`. */
  basePriceCents: number;
  includedPersons: number;
  /** Added for every person above `includedPersons`. */
  extraPersonCents: number;
  /** Added for every tier after the first. */
  extraTierCents: number;
  /** Added once when any text (name, age, dedication, message) is written. */
  textPriceCents: number;
  minPersons: number;
  maxPersons: number;
  /** Earliest pickup, in days from today. */
  minNoticeDays: number;
  /** 0 = no limit. */
  maxOrdersPerDay: number;
  /** While false the site tells customers that prices are indicative. */
  pricesConfirmed: boolean;
};

export type CakeText = {
  name: string;
  age: string;
  dedication: string;
  message: string;
  color: string;
};

export type CakeConfig = {
  shape: string;
  persons: number;
  /** Equivalent-circle diameter of the bottom tier, in cm. */
  diameterCm: number;
  /** Height of each tier, in cm. */
  heightCm: number;
  tiers: number;
  sponge: string;
  /** Sponge layers per tier (the number of fillings is this minus one). */
  spongeLayers: number;
  fillings: string[];
  cover: string;
  toppings: string[];
  text: CakeText;
  /** Free-text request for custom decorations. */
  custom: string;
};

export type PriceLine = { label: string; cents: number };

export type PriceBreakdown = {
  baseCents: number;
  lines: PriceLine[];
  extrasCents: number;
  totalCents: number;
};

export type Catalog = {
  options: CakeOption[];
  pricing: CakePricing;
};
