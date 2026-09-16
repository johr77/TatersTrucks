import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { ALL_GLB, KIT } from "./kit";

if (typeof window !== "undefined") {
  for (const url of ALL_GLB) useGLTF.preload(url);
  useTexture.preload(KIT.grass);
  useTexture.preload(KIT.dirt);
}

type Vec3 = [number, number, number];

function prep(scene: THREE.Object3D, recenter = false) {
  const s = scene.clone(true);
  if (recenter) {
    s.position.set(0, 0, 0);
    s.rotation.set(0, 0, 0);
    for (const c of s.children) {
      c.position.set(0, 0, 0);
      c.rotation.set(0, 0, 0);
    }
  }
  s.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
    const src = Array.isArray(o.material) ? o.material : [o.material];
    const mats = src.map((m) => {
      const n = m.clone();
      if (n instanceof THREE.MeshStandardMaterial) {
        n.side = THREE.DoubleSide;
        n.needsUpdate = true;
      }
      return n;
    });
    o.material = mats.length === 1 ? mats[0] : mats;
  });
  return s;
}

export function Prop({
  url,
  position,
  rotation,
  scale = 1,
  recenter = false,
}: {
  url: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  recenter?: boolean;
}) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => prep(scene, recenter), [scene, recenter]);
  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />;
}

export function TiledGround({
  url,
  w,
  d,
  y = 0,
  repeat = 12,
  color = "#ffffff",
}: {
  url: string;
  w: number;
  d: number;
  y?: number;
  repeat?: number;
  color?: string;
}) {
  const src = useTexture(url);
  const tex = useMemo(() => {
    const t = src.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.repeat.set(repeat, repeat * (d / Math.max(1, w)));
    t.needsUpdate = true;
    return t;
  }, [src, repeat, w, d]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={tex} color={color} roughness={0.95} />
    </mesh>
  );
}

export function DirtSlabs({
  slabs,
}: {
  slabs: { x: number; z: number; rot: number; w: number; d: number }[];
}) {
  const src = useTexture(KIT.dirt);
  const tex = useMemo(() => {
    const t = src.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(2.4, 2.4);
    t.needsUpdate = true;
    return t;
  }, [src]);
  return (
    <>
      {slabs.map((s, i) => (
        <mesh key={i} position={[s.x, 0.05, s.z]} rotation={[0, s.rot, 0]} receiveShadow>
          <boxGeometry args={[s.w, 0.1, s.d]} />
          <meshStandardMaterial map={tex} color="#e2c080" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}
