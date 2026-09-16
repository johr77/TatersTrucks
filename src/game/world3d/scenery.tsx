import { Html, useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { KIT } from "./kit";
import { DirtSlabs, Prop, TiledGround } from "./props";
import { SHOP_YARD } from "./shopYard";
import type { DirtSlab, WallBox } from "./testTrack";

function FarmModel({
  url,
  position,
  rotation,
  scale,
  tint,
}: {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  tint?: string;
}) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
      const src = Array.isArray(o.material) ? o.material : [o.material];
      const mats = src.map((m) => {
        const n = m.clone() as THREE.MeshStandardMaterial;
        if (n instanceof THREE.MeshStandardMaterial) {
          n.side = THREE.DoubleSide;
          n.needsUpdate = true;
          if (tint && /red/i.test(m.name)) n.color = new THREE.Color(tint);
        }
        return n;
      });
      o.material = mats.length === 1 ? mats[0] : mats;
    });
    return s;
  }, [scene, tint]);
  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />;
}

function TireStack({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.38, 0.16, 8, 14]} />
          <meshStandardMaterial color={i % 2 ? "#ecece8" : "#1c1c1c"} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function fenceAlongBox(b: { x: number; z: number; w: number; d: number }) {
  const alongX = b.w >= b.d;
  const len = alongX ? b.w : b.d;
  const segs = Math.max(1, Math.round(len / 5.6));
  const step = len / segs;
  const out: { x: number; z: number; rot: number; sx: number }[] = [];
  for (let i = 0; i < segs; i++) {
    const t = -len / 2 + step * (i + 0.5);
    out.push({
      x: alongX ? b.x + t : b.x,
      z: alongX ? b.z : b.z + t,
      rot: alongX ? 0 : Math.PI / 2,
      sx: step / 5.85,
    });
  }
  return out;
}

function onDirt(x: number, z: number, slabs: DirtSlab[], pad: number) {
  for (const s of slabs) {
    const dx = x - s.x;
    const dz = z - s.z;
    const c = Math.cos(-s.rot);
    const sn = Math.sin(-s.rot);
    const lx = dx * c - dz * sn;
    const lz = dx * sn + dz * c;
    if (Math.abs(lx) < s.w / 2 + pad && Math.abs(lz) < s.d / 2 + pad) return true;
  }
  return false;
}

function treesOffDirt(slabs: DirtSlab[], wallBoxes: WallBox[]) {
  const pts: { x: number; z: number; s: number; large: boolean }[] = [];
  const used: { x: number; z: number }[] = [];
  const minGap = 8.5;

  const take = (x: number, z: number, s: number, large: boolean) => {
    if (onDirt(x, z, slabs, 5.2)) return;
    if (used.some((u) => (u.x - x) ** 2 + (u.z - z) ** 2 < minGap * minGap)) return;
    used.push({ x, z });
    pts.push({ x, z, s, large });
  };

  for (let i = 0; i < wallBoxes.length; i += 3) {
    const w = wallBoxes[i];
    const ox = Math.cos(w.rot);
    const oz = -Math.sin(w.rot);
    const dist = 8.2;
    const cands = [
      { x: w.x + ox * dist, z: w.z + oz * dist },
      { x: w.x - ox * dist, z: w.z - oz * dist },
    ].filter((p) => !onDirt(p.x, p.z, slabs, 5.2));
    if (!cands.length) continue;
    // One grass side (the infield or the outer apron). If both are grass, keep the outer.
    cands.sort((a, b) => b.x * b.x + b.z * b.z - (a.x * a.x + a.z * a.z));
    const p = cands[0];
    take(p.x, p.z, 4.6 + (i % 5) * 0.28, i % 2 === 0);
  }

  const maxR = wallBoxes.reduce((m, w) => Math.max(m, Math.hypot(w.x, w.z)), 18);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.18;
    take(Math.cos(a) * (maxR + 10), Math.sin(a) * (maxR + 10) * 0.72, 5.1 + (i % 3) * 0.25, i % 2 === 0);
  }
  return pts;
}

export function ShopScenery({ walls }: { walls: { x: number; z: number; w: number; d: number; h: number }[] }) {
  const fences = useMemo(() => walls.flatMap(fenceAlongBox), [walls]);
  const trees = useMemo(() => {
    const pts: { x: number; z: number; s: number; large: boolean }[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.4;
      pts.push({
        x: Math.cos(a) * 42,
        z: Math.sin(a) * 36,
        s: 4.6 + (i % 4) * 0.55,
        large: i % 2 === 0,
      });
    }
    return pts;
  }, []);

  return (
    <group>
      <TiledGround url={KIT.grass} w={SHOP_YARD.ground.w + 48} d={SHOP_YARD.ground.d + 48} y={0} repeat={18} />
      <TiledGround url={KIT.dirt} w={20} d={52} y={0.02} repeat={6} color="#e0c090" />
      <TiledGround url={KIT.dirt} w={46} d={30} y={0.025} repeat={8} color="#d4b07a" />

      <FarmModel url={KIT.barn} position={[-12.5, 0, -8]} rotation={[0, Math.PI, 0]} scale={[1.2, 1.05, 1.35]} />
      <FarmModel url={KIT.openBarn} position={[12.5, 0, -8]} rotation={[0, Math.PI, 0]} scale={[1.45, 1.15, 1.65]} tint="#3d6a38" />
      <Prop url={KIT.silo} position={[22.5, 0, -16]} scale={0.85} />
      <Prop url={KIT.windmill} position={[-30, 0, 18]} rotation={[0, 0.6, 0]} scale={0.9} />
      <Prop url={KIT.waterTower} position={[28, 0, 16]} scale={0.8} />

      {SHOP_YARD.buildings.map((b) => (
        <Html key={b.id} position={[b.x, 6.6, b.z + b.d / 2 + 0.6]} center distanceFactor={28}>
          <div className="whitespace-nowrap rounded-xs bg-surface/90 px-2 py-1 font-display text-lg tracking-wide text-fg">
            {b.name}
          </div>
        </Html>
      ))}

      {fences.map((f, i) => (
        <Prop key={i} url={KIT.farmFence} position={[f.x, 0, f.z]} rotation={[0, f.rot, 0]} scale={[f.sx, 2.35, 1]} />
      ))}

      <TireStack x={-6} z={6} />
      <TireStack x={6} z={6} />
      <TireStack x={-18} z={4} />
      <TireStack x={18} z={4} />
      <Prop url={KIT.cone} position={[-4.2, 0, 14]} scale={1.8} />
      <Prop url={KIT.cone} position={[4.2, 0, 14]} scale={1.8} />
      <Prop url={KIT.crate} position={[8.4, 0.45, -1.5]} scale={1.4} />
      <Prop url={KIT.crate} position={[-8.6, 0.45, -1.2]} scale={1.2} />

      {trees.map((t, i) => (
        <Prop key={i} url={t.large ? KIT.treeLarge : KIT.treeSmall} position={[t.x, 0, t.z]} scale={t.s} recenter />
      ))}

      <Html position={[0, 2.4, -26]} center distanceFactor={22}>
        <div className="whitespace-nowrap rounded-xs bg-surface/90 px-2 py-1 font-mono text-xs tracking-widest text-muted">
          TO MENU
        </div>
      </Html>
    </group>
  );
}

export function TestScenery({
  slabs,
  wallBoxes,
  spawn,
}: {
  slabs: DirtSlab[];
  wallBoxes: WallBox[];
  spawn: { x: number; z: number; yaw: number };
}) {
  const trees = useMemo(() => treesOffDirt(slabs, wallBoxes), [slabs, wallBoxes]);

  const fx = -Math.sin(spawn.yaw);
  const fz = -Math.cos(spawn.yaw);
  const rx = Math.cos(spawn.yaw);
  const rz = -Math.sin(spawn.yaw);

  return (
    <group>
      <TiledGround url={KIT.grass} w={170} d={130} y={0} repeat={22} />
      <DirtSlabs slabs={slabs} />

      {wallBoxes.map((w, i) => (
        <mesh key={`w${i}`} position={[w.x, w.h / 2, w.z]} rotation={[0, w.rot, 0]} castShadow>
          <boxGeometry args={[w.thick, w.h, w.len]} />
          <meshStandardMaterial color={i % 2 ? "#ecece8" : "#1c1c1c"} roughness={0.85} />
        </mesh>
      ))}

      {trees.map((t, i) => (
        <Prop
          key={`t${i}`}
          url={t.large ? KIT.treeLarge : KIT.treeSmall}
          position={[t.x, 0, t.z]}
          scale={t.s}
          recenter
        />
      ))}

      <Prop
        url={KIT.flagCheckers}
        position={[spawn.x + rx * 3.4, 0, spawn.z + rz * 3.4]}
        rotation={[0, spawn.yaw, 0]}
        scale={2.8}
      />
      <Prop
        url={KIT.flagRed}
        position={[spawn.x - rx * 3.4, 0, spawn.z - rz * 3.4]}
        rotation={[0, spawn.yaw, 0]}
        scale={2.8}
      />
      <Prop
        url={KIT.grandStand}
        position={[spawn.x + rx * 14 + fx * -6, 0, spawn.z + rz * 14 + fz * -6]}
        rotation={[0, spawn.yaw + Math.PI / 2, 0]}
        scale={7.5}
      />
      <Prop
        url={KIT.tent}
        position={[spawn.x - rx * 16 + fx * -4, 0, spawn.z - rz * 16 + fz * -4]}
        rotation={[0, spawn.yaw, 0]}
        scale={4.2}
      />
      <Prop
        url={KIT.garage}
        position={[spawn.x + rx * 18 + fx * 8, 0, spawn.z + rz * 18 + fz * 8]}
        rotation={[0, spawn.yaw + Math.PI, 0]}
        scale={6}
      />
      <Prop
        url={KIT.lightPost}
        position={[spawn.x + rx * 5.5 + fx * -2, 0, spawn.z + rz * 5.5 + fz * -2]}
        scale={3.2}
      />
      <Prop
        url={KIT.lightPost}
        position={[spawn.x - rx * 5.5 + fx * -2, 0, spawn.z - rz * 5.5 + fz * -2]}
        scale={3.2}
      />
    </group>
  );
}
