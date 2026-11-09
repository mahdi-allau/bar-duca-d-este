import type { CakeConfig } from "./types";

/** One serving is about 400 cm³ of cake (e.g. 50 cm² of surface × 8 cm). */
export const SERVING_CM3 = 400;

export const SHARES: Record<number, number[]> = {
  1: [1],
  2: [0.62, 0.38],
  3: [0.5, 0.3, 0.2],
  4: [0.42, 0.28, 0.18, 0.12],
};

export const HEIGHT_RANGE = { min: 5, max: 14 };
export const LAYER_RANGE = { min: 2, max: 4 };

const areaOf = (diameter: number) => Math.PI * (diameter / 2) ** 2;
const diameterOf = (area: number) => 2 * Math.sqrt(area / Math.PI);

export function shareOf(tiers: number, index: number) {
  return (SHARES[tiers] ?? SHARES[1])[index] ?? 0;
}

export function diameterFromPersons(persons: number, heightCm: number, tiers: number) {
  const volume = persons * SERVING_CM3 * shareOf(tiers, 0);
  return diameterOf(volume / heightCm);
}

export function personsFromDiameter(diameterCm: number, heightCm: number, tiers: number) {
  const volume = areaOf(diameterCm) * heightCm;
  return volume / SERVING_CM3 / shareOf(tiers, 0);
}

export type TierSpec = { areaCm2: number; heightCm: number };

/** Footprint area and height of every tier, bottom first. */
export function tierSpecs(c: Pick<CakeConfig, "persons" | "heightCm" | "tiers">): TierSpec[] {
  const tiers = SHARES[c.tiers] ? c.tiers : 1;
  return Array.from({ length: tiers }, (_, i) => ({
    areaCm2: (c.persons * SERVING_CM3 * shareOf(tiers, i)) / c.heightCm,
    heightCm: c.heightCm,
  }));
}

export type SizeLabels = { side: string; rect: string; diameter: string; heart: string };
const IT_SIZE: SizeLabels = { side: "lato {n} cm", rect: "{w} × {h} cm", diameter: "diametro {n} cm", heart: "larghezza {n} cm" };
const put = (text: string, vars: Record<string, number>) => text.replace(/{(w+)}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** Human description of the bottom tier, for the size label. */
export function describeSize(shape: string, areaCm2: number, labels: SizeLabels = IT_SIZE) {
  const d = Math.round(diameterOf(areaCm2));
  switch (shape) {
    case "square":
      return put(labels.side, { n: Math.round(Math.sqrt(areaCm2)) });
    case "rectangle": {
      const w = Math.sqrt(areaCm2 / 1.4);
      return put(labels.rect, { w: Math.round(w), h: Math.round(w * 1.4) });
    }
    case "heart":
      return put(labels.heart, { n: Math.round(Math.sqrt(areaCm2) * 1.12) });
    default:
      return put(labels.diameter, { n: d });
  }
}
