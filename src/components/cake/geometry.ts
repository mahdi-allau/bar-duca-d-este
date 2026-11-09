import * as THREE from "three";
import { mergeGeometries as mergeAll, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** All plan-view geometry is in centimetres, in the XY plane, counter-clockwise. */
export type V2 = [number, number];

export const signedArea = (p: V2[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};

export const area = (p: V2[]) => Math.abs(signedArea(p));

export function centroid(p: V2[]): V2 {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
    a += f;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}

const ccw = (p: V2[]) => (signedArea(p) < 0 ? [...p].reverse() : p);

function roundedRect(w: number, l: number, r: number, seg = 8): V2[] {
  const pts: V2[] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, l / 2 - r, 0],
    [-w / 2 + r, l / 2 - r, Math.PI / 2],
    [-w / 2 + r, -l / 2 + r, Math.PI],
    [w / 2 - r, -l / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = start + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** Footprint of one tier with the given area, centred on the origin. */
export function outline(shape: string, areaCm2: number): V2[] {
  switch (shape) {
    case "square": {
      const s = Math.sqrt(areaCm2);
      return ccw(roundedRect(s, s, Math.min(1.4, s * 0.08)));
    }
    case "rectangle": {
      const w = Math.sqrt(areaCm2 / 1.4);
      return ccw(roundedRect(w, w * 1.4, Math.min(1.4, w * 0.08)));
    }
    case "heart": {
      const raw: V2[] = [];
      const N = 160;
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        raw.push([
          16 * Math.sin(t) ** 3,
          13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
        ]);
      }
      const k = Math.sqrt(areaCm2 / area(raw));
      const [cx, cy] = centroid(raw);
      return ccw(raw.map(([x, y]) => [(x - cx) * k, (y - cy) * k] as V2));
    }
    default: {
      const r = Math.sqrt(areaCm2 / Math.PI);
      const N = 128;
      return Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        return [Math.cos(a) * r, Math.sin(a) * r] as V2;
      });
    }
  }
}

export const scalePoly = (p: V2[], k: number, about: V2 = [0, 0]): V2[] =>
  p.map(([x, y]) => [about[0] + (x - about[0]) * k, about[1] + (y - about[1]) * k] as V2);

/** Sutherland–Hodgman against the half-plane `axis >= 0` (keepPositive) or `axis <= 0`. */
export function clipHalf(p: V2[], axis: 0 | 1, keepPositive: boolean): V2[] {
  const inside = (v: V2) => (keepPositive ? v[axis] >= 0 : v[axis] <= 0);
  const out: V2[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (0 - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * The part of a plan that stays when the cake is cut open. World z is -y, so
 * the removed wedge x > 0, z > 0 is x > 0, y < 0. A heart loses its right half.
 */
export function keptPieces(p: V2[], shape: string): V2[][] {
  const left = clipHalf(p, 0, false);
  if (shape === "heart") return [left].filter((q) => q.length >= 3);
  const rightBack = clipHalf(clipHalf(p, 0, true), 1, true);
  return [left, rightBack].filter((q) => q.length >= 3);
}

export function pointInPoly([x, y]: V2, p: V2[]) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Points spaced evenly along a closed polygon. */
export function alongPerimeter(p: V2[], spacing: number): { pos: V2; normal: V2 }[] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    seg.push(len);
    total += len;
  }
  const n = Math.max(3, Math.floor(total / spacing));
  const step = total / n;
  const out: { pos: V2; normal: V2 }[] = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (acc + seg[i] < target) {
      acc += seg[i];
      i = (i + 1) % p.length;
    }
    const t = (target - acc) / seg[i];
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    out.push({ pos: [x1 + dx * t, y1 + dy * t], normal: [dy / len, -dx / len] });
  }
  return out;
}

/** Small deterministic random generator so decorations stay put between renders. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const hashString = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

function toShape(p: V2[]) {
  return new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y)));
}

/**
 * A prism of the given plan from y = bottom to y = bottom + height, in cm.
 * Optional bevel gives frosted edges.
 */
export function prism(plans: V2[][], bottom: number, height: number, bevel = 0): THREE.BufferGeometry {
  const geos = plans
    .filter((p) => p.length >= 3 && area(p) > 0.05)
    .map((p) => {
      const b = Math.min(bevel, height / 2.5);
      const g = new THREE.ExtrudeGeometry(toShape(p), {
        depth: Math.max(0.02, height - 2 * b),
        bevelEnabled: b > 0,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 3,
        curveSegments: 1,
      });
      g.translate(0, 0, b);
      return g;
    });
  const merged = geos.length === 1 ? geos[0] : mergeAll(geos);
  if (!merged) return new THREE.BufferGeometry();
  // extrusion runs along +z; stand it up so it runs along +y, then lift to `bottom`
  merged.rotateX(-Math.PI / 2);
  merged.translate(0, bottom, 0);
  return toCreasedNormals(merged, Math.PI / 5);
}

/**
 * The frosting "skin" of a tier when it is cut open: a thin wall around the
 * outline made of quads, each clipped to the part of the cake that remains.
 */
export function wallPieces(p: V2[], thickness: number, shape: string): V2[][] {
  const inner = scalePoly(p, 1 - thickness / Math.sqrt(area(p) / Math.PI), centroid(p));
  const pieces: V2[][] = [];
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length;
    const quad: V2[] = [p[i], p[j], inner[j], inner[i]];
    for (const kept of keptPieces(ccw(quad), shape)) pieces.push(kept);
  }
  return pieces;
}
