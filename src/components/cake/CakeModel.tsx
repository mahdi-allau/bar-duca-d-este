"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CakeConfig, CakeOption } from "@/lib/cake/types";
import { hasText } from "@/lib/cake/pricing";
import { tierSpecs } from "@/lib/cake/sizing";
import { centroid, keptPieces, outline, prism, scalePoly, wallPieces, area, type V2 } from "./geometry";
import { creamBumpTexture, crumbTexture, textTexture } from "./textures";
import Toppings, { type TierInfo } from "./Toppings";

const GAP = 1.0; // filling thickness, cm
const PLATE = 0.9; // cake board thickness, cm
const COVER = 0.45; // frosting thickness in the cut view, cm

const colorOf = (o: CakeOption | undefined, fallback: string) =>
  typeof o?.data.color === "string" ? (o.data.color as string) : fallback;

export type ModelInfo = { totalHeight: number; radius: number };

export default function CakeModel({
  config,
  options,
  cut,
  fontFamily,
  fontKey = 0,
  onInfo,
}: {
  config: CakeConfig;
  options: CakeOption[];
  cut: boolean;
  fontFamily: string;
  fontKey?: number;
  onInfo?: (info: ModelInfo) => void;
}) {
  const find = (kind: CakeOption["kind"], slug: string) => options.find((o) => o.kind === kind && o.slug === slug);

  const sponge = find("sponge", config.sponge);
  const cover = find("cover", config.cover);
  const naked = config.cover === "naked";
  const spongeColor = colorOf(sponge, "#e6c27d");
  const coverColor = naked ? "#fbf8f0" : colorOf(cover, "#fbf8f0");

  const crumbs = useMemo(() => crumbTexture(), []);
  useEffect(() => () => crumbs.dispose(), [crumbs]);
  const creamRelief = useMemo(() => creamBumpTexture(1), []);
  const ganacheRelief = useMemo(() => creamBumpTexture(0.35), []);
  useEffect(
    () => () => {
      creamRelief.dispose();
      ganacheRelief.dispose();
    },
    [creamRelief, ganacheRelief],
  );

  const tiers: TierInfo[] = useMemo(() => {
    const outlineShape = config.shape === "tiered" ? "round" : config.shape;
    return tierSpecs(config).map((t, i) => ({
      index: i,
      plan: outline(outlineShape, t.areaCm2),
      bottomY: PLATE + i * t.heightCm,
      height: t.heightCm,
      topY: PLATE + (i + 1) * t.heightCm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.shape, config.persons, config.heightCm, config.tiers]);

  const bottom = tiers[0];
  // the board is as wide as the farthest corner of the bottom tier, plus a margin
  const plateRadius = Math.max(...bottom.plan.map(([x, y]) => Math.hypot(x, y))) + 3.2;
  const totalHeight = PLATE + tiers.length * config.heightCm;

  useEffect(() => {
    onInfo?.({ totalHeight, radius: plateRadius });
  }, [onInfo, totalHeight, plateRadius]);

  // --- materials -----------------------------------------------------------
  const m = useMemo(() => {
    const spongeMat = new THREE.MeshStandardMaterial({
      color: spongeColor,
      map: crumbs,
      bumpMap: crumbs,
      bumpScale: 1.6,
      roughness: 0.96,
    });
    // whipped cream is matte with a soft sheen and a hand-spread relief; ganache is glossy and smooth
    const coverMat =
      config.cover === "ganache"
        ? new THREE.MeshPhysicalMaterial({
            color: coverColor,
            roughness: 0.3,
            clearcoat: 0.7,
            clearcoatRoughness: 0.22,
            bumpMap: ganacheRelief,
            bumpScale: 0.6,
          })
        : new THREE.MeshPhysicalMaterial({
            color: coverColor,
            roughness: 0.66,
            sheen: 1,
            sheenRoughness: 0.45,
            sheenColor: new THREE.Color("#fff8ea"),
            bumpMap: creamRelief,
            bumpScale: 1.4,
          });
    return { spongeMat, coverMat };
  },[spongeColor, coverColor, crumbs, creamRelief, ganacheRelief, config.cover]);
  useEffect(() => () => {
    m.spongeMat.dispose();
    m.coverMat.dispose();
  }, [m]);

  const fillingMats = useMemo(
    () =>
      config.fillings.map((slug) => {
        const f = find("filling", slug);
        const gloss = typeof f?.data.gloss === "number" ? (f.data.gloss as number) : 0.3;
        const mat = new THREE.MeshPhysicalMaterial({
          color: colorOf(f, "#f3d77c"),
          roughness: 1 - gloss * 0.8,
          clearcoat: gloss * 0.7,
          clearcoatRoughness: 0.35,
          bumpMap: creamRelief,
          bumpScale: 0.8,
        });
        return mat;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.fillings, options, creamRelief],
  );
  useEffect(() => () => fillingMats.forEach((x) => x.dispose()), [fillingMats]);

  // --- geometry ------------------------------------------------------------
  const parts = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const list: { key: string; geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
    const add = (key: string, geo: THREE.BufferGeometry, mat: THREE.Material) => {
      geos.push(geo);
      list.push({ key, geo, mat });
    };

    const n = config.spongeLayers;
    const H = config.heightCm;
    const ts = (H - (n - 1) * GAP) / n;

    tiers.forEach((tier) => {
      const c = centroid(tier.plan);
      const planFor = (k: number): V2[][] => {
        const p = k === 1 ? tier.plan : scalePoly(tier.plan, k, c);
        return cut ? keptPieces(p, config.shape) : [p];
      };

      if (!cut && !naked) {
        add(`t${tier.index}-body`, prism([tier.plan], tier.bottomY, H, 0.35), m.coverMat);
        return;
      }

      // with frosting the sponge sits just inside the wall, so the wall never fights it for the same pixels
      const inner = cut && !naked ? 1 - COVER / Math.sqrt(area(tier.plan) / Math.PI) : 1;
      for (let i = 0; i < n; i++) {
        const y0 = tier.bottomY + i * (ts + GAP);
        add(`t${tier.index}-s${i}`, prism(planFor(inner), y0, ts), m.spongeMat);
        if (i < n - 1) {
          const mat = fillingMats[i] ?? fillingMats[0] ?? m.spongeMat;
          // fillings sit a touch proud of the sponge, like real cream
          add(`t${tier.index}-f${i}`, prism(planFor(naked ? 1.012 : inner), y0 + ts, GAP), mat);
        }
      }

      if (cut && !naked) {
        // frosting: a thin wall around the outside and a plate on top, open at the cut
        const wall = wallPieces(tier.plan, COVER, config.shape);
        if (wall.length) add(`t${tier.index}-wall`, prism(wall, tier.bottomY, H), m.coverMat);
        add(`t${tier.index}-top`, prism(planFor(1), tier.topY - COVER, COVER), m.coverMat);
      }
    });
    return { list, geos };
  }, [tiers, config.spongeLayers, config.heightCm, config.shape, cut, naked, m, fillingMats]);

  useEffect(() => () => parts.geos.forEach((g) => g.dispose()), [parts]);

  // --- writing on top ------------------------------------------------------
  const top = tiers[tiers.length - 1];
  const writing = hasText(config);
  const textTex = useMemo(
    () => (writing ? textTexture(config.text, fontFamily) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [writing, config.text.name, config.text.age, config.text.dedication, config.text.message, config.text.color, fontFamily, fontKey],
  );
  useEffect(() => () => textTex?.dispose(), [textTex]);
  const textSize = Math.sqrt(area(top.plan) / Math.PI) * 1.55;

  return (
    <group scale={0.1}>
      {/* cake board */}
      <mesh position={[0, PLATE / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[plateRadius, plateRadius, PLATE, 64]} />
        <meshStandardMaterial color="#fbf8f2" roughness={0.25} />
      </mesh>
      <mesh position={[0, PLATE - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[plateRadius - 0.1, 0.12, 8, 96]} />
        <meshStandardMaterial color="#c9a45c" roughness={0.3} metalness={0.9} />
      </mesh>

      {parts.list.map((p) => (
        <mesh key={p.key} geometry={p.geo} material={p.mat} castShadow receiveShadow />
      ))}

      {textTex && !cut && (
        <mesh position={[centroid(top.plan)[0], top.topY + 0.06, -centroid(top.plan)[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[textSize, textSize]} />
          <meshBasicMaterial map={textTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      <Toppings
        tiers={tiers}
        toppings={config.toppings}
        hasText={writing}
        seedKey={`${config.shape}-${config.persons}-${config.tiers}`}
        cut={cut}
        shape={config.shape}
      />
    </group>
  );
}
