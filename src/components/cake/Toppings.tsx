"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { strawberryBump, strawberryTexture } from "./textures";
import {
  alongPerimeter,
  keptPieces,
  area,
  centroid,
  hashString,
  pointInPoly,
  prism,
  rng,
  scalePoly,
  type V2,
} from "./geometry";

export type TierInfo = { index: number; plan: V2[]; bottomY: number; height: number; topY: number };

type Spot = { x: number; z: number; y: number; yaw: number; nx: number; nz: number; r: number };

const RING = ["fragole", "macaron", "panna", "fiori"];
const SIZE: Record<string, number> = { fragole: 3.0, macaron: 3.5, panna: 3.1, fiori: 3.5 };
// natural macaron shells: pistachio, raspberry, vanilla, chocolate, coffee, rose
const PASTEL = ["#a9b87a", "#b8485f", "#efe0b8", "#5a3a28", "#c19a72", "#e2b9ac"];

const toWorld = (x: number, y: number): [number, number] => [x, -y];

/** Where on a tier's free top surface (not covered by the tier above) things can sit. */
function surfaceSpots(tier: TierInfo, upper: TierInfo | null, hasText: boolean) {
  const c = centroid(tier.plan);
  const rEq = Math.sqrt(area(tier.plan) / Math.PI);
  const covered = upper ? scalePoly(upper.plan, 1.1, centroid(upper.plan)) : null;
  const text = hasText && !upper ? { c, r: rEq * 0.46 } : null;
  const free = (p: V2) =>
    (!covered || !pointInPoly(p, covered)) && (!text || Math.hypot(p[0] - text.c[0], p[1] - text.c[1]) > text.r);
  return { c, rEq, free };
}

function useMaterials() {
  return useMemo(
    () => ({
      strawberry: new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        map: strawberryTexture(),
        bumpMap: strawberryBump(),
        bumpScale: 1.4,
        roughness: 0.32,
        clearcoat: 0.55,
        clearcoatRoughness: 0.3,
      }),
      raspberry: new THREE.MeshPhysicalMaterial({ color: "#a8123a", roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#ff7a96") }),
      blueberry: new THREE.MeshPhysicalMaterial({ color: "#2b3a6b", roughness: 0.5, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color("#9fb0dc") }),
      blueCrown: new THREE.MeshStandardMaterial({ color: "#141a33", roughness: 0.7 }),
      chocolate: new THREE.MeshPhysicalMaterial({ color: "#2b160d", roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 }),
      shaveDark: new THREE.MeshStandardMaterial({ color: "#3a1e12", roughness: 0.35, side: THREE.DoubleSide }),
      shaveMilk: new THREE.MeshStandardMaterial({ color: "#7b4a2c", roughness: 0.35, side: THREE.DoubleSide }),
      pistachio: new THREE.MeshStandardMaterial({ color: "#8fb552", roughness: 0.8, flatShading: true }),
      cream: new THREE.MeshStandardMaterial({ color: "#fffaf0", roughness: 0.45 }),
      petal: new THREE.MeshStandardMaterial({ color: "#fdf2f4", roughness: 0.6, side: THREE.DoubleSide }),
      petalPink: new THREE.MeshStandardMaterial({ color: "#e9c4cb", roughness: 0.6, side: THREE.DoubleSide }),
      flowerCenter: new THREE.MeshStandardMaterial({ color: "#f0c23a", roughness: 0.6 }),
      leaf: new THREE.MeshStandardMaterial({ color: "#5d8f3a", roughness: 0.6, side: THREE.DoubleSide }),
      calyx: new THREE.MeshStandardMaterial({ color: "#4f8a2f", roughness: 0.6 }),
      pearl: new THREE.MeshStandardMaterial({ color: "#d4af5a", roughness: 0.25, metalness: 0.85 }),
      shells: PASTEL.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 })),
    }),
    [],
  );
}

function useGeometries() {
  return useMemo(() => {
    // a strawberry: rounded shoulders tapering to a tip, smooth enough to read as fruit
    const profile = new THREE.SplineCurve(
      [
        [0.02, 0],
        [0.32, 0.1],
        [0.78, 0.62],
        [1.18, 1.4],
        [1.34, 2.05],
        [1.2, 2.55],
        [0.78, 2.88],
        [0.02, 2.98],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    ).getPoints(36);
    const berry = new THREE.LatheGeometry(profile, 28);
    // a raspberry: a cluster of small drupelets over a dome
    const drupelets: THREE.BufferGeometry[] = [];
    const golden = 2.399963;
    const N = 46;
    for (let i = 0; i < N; i++) {
      const theta = Math.acos(1 - ((i + 0.5) / N) * (1 - Math.cos(1.95)));
      const phi = i * golden;
      const d = new THREE.SphereGeometry(0.27, 8, 6);
      d.translate(
        Math.sin(theta) * Math.cos(phi) * 0.62,
        Math.cos(theta) * 0.7,
        Math.sin(theta) * Math.sin(phi) * 0.62,
      );
      drupelets.push(d);
    }
    const raspberry = mergeGeometries(drupelets)!;
    drupelets.forEach((d) => d.dispose());
    const calyx = new THREE.ConeGeometry(0.95, 0.35, 7);
    const dome = new THREE.SphereGeometry(1.7, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 0.5, 1);
    const cream = new THREE.CylinderGeometry(1.55, 1.55, 0.4, 24);
    const petal = new THREE.SphereGeometry(0.9, 12, 8);
    petal.scale(1, 0.14, 0.55);
    const leaf = new THREE.SphereGeometry(0.8, 10, 6);
    leaf.scale(1, 0.08, 0.4);
    return {
      berry,
      calyx,
      dome,
      cream,
      petal,
      leaf,
      raspberry,
      blueberry: new THREE.SphereGeometry(0.66, 20, 14),
      crown: new THREE.TorusGeometry(0.17, 0.05, 6, 5),
      foot: new THREE.CylinderGeometry(1.72, 1.66, 0.14, 28),
      shave: new THREE.BoxGeometry(1.5, 0.05, 0.8),
      crumb: new THREE.DodecahedronGeometry(0.17, 0),
      pearl: new THREE.SphereGeometry(0.34, 12, 10),
      center: new THREE.SphereGeometry(0.42, 12, 8),
      ring: new THREE.TorusGeometry(1, 0.4, 10, 22),
      tip: new THREE.ConeGeometry(0.4, 0.8, 12),
    };
  }, []);
}

/** Many identical small pieces in one draw call. */
function Instanced({
  geometry,
  material,
  items,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: { p: [number, number, number]; r: [number, number, number]; s: number }[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    items.forEach((it, i) => {
      e.set(...it.r);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(it.s, it.s, it.s));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items]);
  if (items.length === 0) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} castShadow />;
}

export default function Toppings({
  tiers,
  toppings,
  hasText,
  seedKey,
  cut,
  shape,
}: {
  tiers: TierInfo[];
  toppings: string[];
  hasText: boolean;
  seedKey: string;
  cut: boolean;
  shape: string;
}) {
  const mat = useMaterials();
  const geo = useGeometries();

  const rawLayout = useMemo(() => {
    const rand = rng(hashString(seedKey));
    const ringKinds = RING.filter((t) => toppings.includes(t));
    const out = {
      ring: [] as (Spot & { kind: string })[],
      rasp: [] as Spot[],
      blue: [] as Spot[],
      shaves: [] as { p: [number, number, number]; r: [number, number, number]; s: number; milk: boolean }[],
      crumbs: [] as { p: [number, number, number]; r: [number, number, number]; s: number }[],
      pearls: [] as { p: [number, number, number]; r: [number, number, number]; s: number }[],
      drips: [] as { x: number; z: number; len: number; topY: number }[],
    };

    const glazed = toppings.includes("cioccolato");
    tiers.forEach((tier, ti) => {
      const upper = tiers[ti + 1] ?? null;
      // the glaze is 0.35 cm thick: decorations on the top tier sit on it, not in it
      const top = tier.topY + (!upper && glazed ? 0.35 : 0);
      const { c, rEq, free } = surfaceSpots(tier, upper, hasText);

      if (ringKinds.length) {
        const spacing = Math.max(...ringKinds.map((k) => SIZE[k])) * 1.08;
        const inset = Math.max(0.4, 1 - 2.1 / rEq);
        const ring = alongPerimeter(scalePoly(tier.plan, inset, c), spacing).filter((s) => free(s.pos));
        ring.forEach((s, i) => {
          const [wx, wz] = toWorld(s.pos[0], s.pos[1]);
          out.ring.push({
            kind: ringKinds[i % ringKinds.length],
            x: wx,
            z: wz,
            y: top,
            yaw: rand() * Math.PI * 2,
            nx: s.normal[0],
            nz: -s.normal[1],
            r: rand(),
          });
        });
      }

      const scatter = (count: number, k: number, push: (x: number, z: number, r: number) => void) => {
        const plan = scalePoly(tier.plan, k, c);
        const xs = plan.map((p) => p[0]);
        const ys = plan.map((p) => p[1]);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        let placed = 0;
        for (let tries = 0; tries < count * 14 && placed < count; tries++) {
          const p: V2 = [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];
          if (!pointInPoly(p, plan) || !free(p)) continue;
          const [wx, wz] = toWorld(p[0], p[1]);
          push(wx, wz, rand());
          placed++;
        }
      };
      const A = area(tier.plan);

      if (toppings.includes("lamponi")) {
        scatter(Math.max(5, Math.min(34, Math.round(A / 34))), 0.78, (x, z, r) =>
          out.rasp.push({ x, z, y: top, yaw: r * 6, nx: 0, nz: 0, r }),
        );
      }
      if (toppings.includes("mirtilli")) {
        scatter(Math.max(6, Math.min(40, Math.round(A / 28))), 0.8, (x, z, r) =>
          out.blue.push({ x, z, y: top, yaw: r * 6, nx: 0, nz: 0, r }),
        );
      }
      if (toppings.includes("scaglie")) {
        scatter(Math.max(12, Math.min(90, Math.round(A / 9))), 0.9, (x, z, r) =>
          out.shaves.push({
            p: [x, top + 0.3 + r * 0.4, z],
            r: [(r - 0.5) * 0.9, r * 12, (rand() - 0.5) * 0.9],
            s: 0.6 + rand() * 0.8,
            milk: rand() > 0.55,
          }),
        );
      }
      if (toppings.includes("granella")) {
        scatter(Math.max(60, Math.min(420, Math.round(A / 1.6))), 0.93, (x, z, r) =>
          out.crumbs.push({ p: [x, top + 0.08, z], r: [r * 6, r * 9, r * 4], s: 0.7 + rand() * 0.9 }),
        );
      }
      if (toppings.includes("personalizzata")) {
        scatter(Math.max(8, Math.min(40, Math.round(A / 24))), 0.88, (x, z, r) =>
          out.pearls.push({ p: [x, top + 0.3, z], r: [0, 0, 0], s: 0.7 + r * 0.7 }),
        );
      }

      if (toppings.includes("cioccolato") && !upper) {
        for (const d of alongPerimeter(tier.plan, 3.1)) {
          const [wx, wz] = toWorld(d.pos[0] + d.normal[0] * 0.12, d.pos[1] + d.normal[1] * 0.12);
          out.drips.push({ x: wx, z: wz, len: 1.6 + rand() * Math.min(4.2, tier.height * 0.7), topY: tier.topY });
        }
      }
    });
    return out;
  }, [tiers, toppings, hasText, seedKey]);

  // When the cake is cut open nothing may float over the removed wedge.
  const layout = useMemo(() => {
    const gone = (x: number, z: number) => cut && x > 0 && (shape === "heart" || z > 0);
    return {
      ring: rawLayout.ring.filter((s) => !gone(s.x, s.z)),
      rasp: rawLayout.rasp.filter((s) => !gone(s.x, s.z)),
      blue: rawLayout.blue.filter((s) => !gone(s.x, s.z)),
      shaves: rawLayout.shaves.filter((s) => !gone(s.p[0], s.p[2])),
      crumbs: rawLayout.crumbs.filter((s) => !gone(s.p[0], s.p[2])),
      pearls: rawLayout.pearls.filter((s) => !gone(s.p[0], s.p[2])),
      drips: rawLayout.drips.filter((d) => !gone(d.x, d.z)),
    };
  }, [rawLayout, cut, shape]);

  const darkShaves = useMemo(() => layout.shaves.filter((s) => !s.milk), [layout.shaves]);
  const milkShaves = useMemo(() => layout.shaves.filter((s) => s.milk), [layout.shaves]);

  const topTier = tiers[tiers.length - 1];
  const glaze = useMemo(() => {
    if (!toppings.includes("cioccolato")) return null;
    const p = scalePoly(topTier.plan, 0.985, centroid(topTier.plan));
    return prism(cut ? keptPieces(p, shape) : [p], topTier.topY - 0.05, 0.4, 0.15);
  }, [toppings, topTier, cut, shape]);

  return (
    <group>
      {glaze && <mesh geometry={glaze} material={mat.chocolate} castShadow />}
      {layout.drips.map((d, i) => (
        <group key={i} position={[d.x, d.topY - d.len / 2 - 0.15, d.z]}>
          <mesh material={mat.chocolate}>
            <capsuleGeometry args={[0.46, d.len, 4, 8]} />
          </mesh>
        </group>
      ))}

      {layout.ring.map((s, i) => {
        const tilt = 0.18;
        if (s.kind === "fragole")
          return (
            <group key={i} position={[s.x, s.y, s.z]} rotation={[0, s.yaw, 0]}>
              <group rotation={[Math.PI + tilt * s.nx, 0, tilt * s.nz]} position={[0, 3.0, 0]} scale={0.95 + s.r * 0.15}>
                <mesh geometry={geo.berry} material={mat.strawberry} castShadow />
              </group>
            </group>
          );
        if (s.kind === "macaron")
          return (
            <group key={i} position={[s.x, s.y + 0.05, s.z]} rotation={[0, s.yaw, 0]}>
              <mesh geometry={geo.dome} material={mat.shells[i % mat.shells.length]} rotation={[Math.PI, 0, 0]} position={[0, 0.85, 0]} castShadow />
              <mesh geometry={geo.cream} material={mat.cream} position={[0, 0.5, 0]} />
              <mesh geometry={geo.foot} material={mat.shells[i % mat.shells.length]} position={[0, 0.18, 0]} />
              <mesh geometry={geo.foot} material={mat.shells[i % mat.shells.length]} position={[0, 0.98, 0]} />
              <mesh geometry={geo.dome} material={mat.shells[i % mat.shells.length]} position={[0, 0.65, 0]} castShadow />
            </group>
          );
        if (s.kind === "panna")
          return (
            <group key={i} position={[s.x, s.y, s.z]}>
              {[1.05, 0.8, 0.52].map((r, k) => (
                <mesh key={k} geometry={geo.ring} material={mat.cream} position={[0, 0.4 + k * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[r, r, 0.9]} castShadow />
              ))}
              <mesh geometry={geo.tip} material={mat.cream} position={[0, 2.15, 0]} castShadow />
            </group>
          );
        return (
          <group key={i} position={[s.x, s.y + 0.12, s.z]} rotation={[0, s.yaw, 0]}>
            {Array.from({ length: 6 }, (_, k) => (
              <mesh
                key={k}
                geometry={geo.petal}
                material={s.r > 0.5 ? mat.petal : mat.petalPink}
                position={[Math.cos((k / 6) * Math.PI * 2) * 0.85, 0, Math.sin((k / 6) * Math.PI * 2) * 0.85]}
                rotation={[0, -(k / 6) * Math.PI * 2, 0.12]}
              />
            ))}
            <mesh geometry={geo.center} material={mat.flowerCenter} position={[0, 0.12, 0]} />
            <mesh geometry={geo.leaf} material={mat.leaf} position={[1.5, -0.02, 0.2]} rotation={[0, 0.6, 0]} />
            <mesh geometry={geo.leaf} material={mat.leaf} position={[-1.4, -0.02, -0.4]} rotation={[0, 2.4, 0]} />
          </group>
        );
      })}

      {layout.rasp.map((s, i) => (
        <mesh key={`r${i}`} geometry={geo.raspberry} material={mat.raspberry} position={[s.x, s.y + 0.62, s.z]} rotation={[0, s.yaw, 0]} scale={1.05} castShadow />
      ))}
      {layout.blue.map((s, i) => (
        <group key={`b${i}`} position={[s.x, s.y + 0.58, s.z]} rotation={[0, s.yaw, 0]} scale={[1, 0.9, 1]}>
          <mesh geometry={geo.blueberry} material={mat.blueberry} castShadow />
          <mesh geometry={geo.crown} material={mat.blueCrown} position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      ))}

      <Instanced
        geometry={geo.shave}
        material={mat.shaveDark}
        items={darkShaves}
      />
      <Instanced
        geometry={geo.shave}
        material={mat.shaveMilk}
        items={milkShaves}
      />
      <Instanced geometry={geo.crumb} material={mat.pistachio} items={layout.crumbs} />
      <Instanced geometry={geo.pearl} material={mat.pearl} items={layout.pearls} />
    </group>
  );
}
