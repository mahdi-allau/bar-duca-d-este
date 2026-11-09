"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { CakeConfig, CakeOption } from "@/lib/cake/types";
import CakeModel, { type ModelInfo } from "./CakeModel";
import { marbleTexture } from "./textures";

export type SceneApi = {
  /** Renders the cake from a fixed angle and returns it as a JPEG data URL. */
  capture: (view: "whole" | "cut") => string;
};

const VIEWS = {
  whole: { az: 0.5, el: 0.42 },
  cut: { az: 0.85, el: 0.5 },
};

const place = (target: THREE.Vector3, dist: number, az: number, el: number) =>
  new THREE.Vector3(
    target.x + dist * Math.sin(az) * Math.cos(el),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(az) * Math.cos(el),
  );

function Rig({
  info,
  zoom,
  autoRotate,
  apiRef,
}: {
  info: ModelInfo;
  zoom: number;
  autoRotate: boolean;
  apiRef: MutableRefObject<SceneApi | null>;
  label: string;
}) {
  const { camera, gl, scene, controls } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useRef(6);

  // Frame the cake: far enough for its width and its height, nearer when zoomed in.
  useEffect(() => {
    // decorations add about 4 cm on top of the cake itself
    const h = (info.totalHeight + 4) * 0.1;
    const w = info.radius * 0.1;
    target.set(0, h * 0.4, 0);
    desired.current = Math.max(w * 3.9, h * 3.1, 3.4) / zoom;
  }, [info, zoom, target]);

  useFrame(() => {
    const ctl = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    if (ctl) {
      ctl.target.lerp(target, 0.12);
    }
    const cur = camera.position.distanceTo(ctl?.target ?? target);
    if (Math.abs(cur - desired.current) > 0.004) {
      const dir = camera.position.clone().sub(ctl?.target ?? target).normalize();
      const next = cur + (desired.current - cur) * 0.1;
      camera.position.copy((ctl?.target ?? target).clone().add(dir.multiplyScalar(next)));
    }
  });

  useEffect(() => {
    apiRef.current = {
      capture: (view) => {
        const keepPos = camera.position.clone();
        const v = VIEWS[view];
        const t = target.clone();
        camera.position.copy(place(t, desired.current * 1.04, v.az, v.el));
        camera.lookAt(t);
        camera.updateMatrixWorld();
        gl.render(scene, camera);
        // always the same modest size, whatever the screen: keeps the stored image around 100 KB
        const src = gl.domElement;
        const out = document.createElement("canvas");
        out.width = 900;
        out.height = Math.max(1, Math.round((900 * src.height) / src.width));
        const ctx = out.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#efe4cf";
          ctx.fillRect(0, 0, out.width, out.height);
          ctx.drawImage(src, 0, 0, out.width, out.height);
        }
        const url = out.toDataURL("image/jpeg", 0.82);
        camera.position.copy(keepPos);
        camera.lookAt((controls as unknown as { target: THREE.Vector3 } | null)?.target ?? t);
        return url;
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, camera, gl, scene, controls, target]);

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={1.1}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.04}
    />
  );
}

export default function CakeScene({
  config,
  options,
  cut,
  zoom,
  autoRotate,
  fontFamily,
  fontKey = 0,
  apiRef,
  label,
}: {
  config: CakeConfig;
  options: CakeOption[];
  cut: boolean;
  zoom: number;
  autoRotate: boolean;
  fontFamily: string;
  fontKey?: number;
  apiRef: MutableRefObject<SceneApi | null>;
}) {
  const [info, setInfo] = useState<ModelInfo>({ totalHeight: 9, radius: 15 });
  const marble = useMemo(() => marbleTexture(), []);
  // lighter shadows on a phone: the picture is small, the graphics chip is not
  const shadowSize = useMemo(() => (window.matchMedia("(max-width: 767px)").matches ? 1024 : 2048), []);
  useEffect(() => () => marble.dispose(), [marble]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 32, position: [3.0, 4.4, 5.4], near: 0.1, far: 60 }}
      shadows
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      role="img"
      aria-label={label}
    >
      <ambientLight intensity={0.55} color="#fff1dc" />
      <directionalLight
        position={[5, 9, 6]}
        intensity={2.1}
        color="#fff0d6"
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.7} color="#d9e4ff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 4]} scale={[8, 3, 1]} color="#fff3de" />
        <Lightformer form="rect" intensity={1.2} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#ffe9c9" />
        <Lightformer form="ring" intensity={1} position={[5, 3, -3]} scale={4} color="#ffffff" />
      </Environment>

      {/* the marble table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial map={marble} roughness={0.35} color="#f6f1e8" />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.45} blur={2.4} far={3} scale={14} resolution={512} />

      <CakeModel config={config} options={options} cut={cut} fontFamily={fontFamily} fontKey={fontKey} onInfo={setInfo} />
      <Rig info={info} zoom={zoom} autoRotate={autoRotate} apiRef={apiRef} />
    </Canvas>
  );
}
