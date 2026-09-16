import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TRUCK_PALETTE } from "../../constants";
import type { TruckColorId } from "../../types";
import type { Body3 } from "../drive";
import { KIT } from "../kit";

type Props = {
  color: TruckColorId;
  body: Body3;
  hide?: boolean;
};

type KitSpec = {
  url: string;
  y: number;
  rotY: number;
  scale: number;
  nitro: [number, number, number];
  tintMix: number;
};

function kitFor(body: Body3): KitSpec {
  if (body.isPlayer)
    return { url: KIT.tater, y: 0, rotY: Math.PI, scale: 1.62, nitro: [0, 0.48, -1.08], tintMix: 1 };
  if (body.color === "yellow")
    return { url: KIT.truckFlat, y: 1.02, rotY: Math.PI, scale: 1.16, nitro: [0, 0.55, 2.35], tintMix: 1 };
  if (body.color === "white")
    return { url: KIT.suv, y: 1.0, rotY: Math.PI, scale: 1.12, nitro: [0, 0.55, 2.35], tintMix: 1 };
  return { url: KIT.truck, y: 1.02, rotY: Math.PI, scale: 1.16, nitro: [0, 0.55, 2.35], tintMix: 1 };
}

const PAINT_MESH = /^(body|hood|cab|cabrroof|bedside|tailgate|bumper)$/i;

/** Scan mesh is one solid — no separate tires. Hubs in the baked player-truck frame. */
const PLAYER_HUBS: [number, number, number][] = [
  [0.51, 0.355, -0.62],
  [-0.51, 0.355, -0.62],
  [0.51, 0.355, 0.55],
  [-0.51, 0.355, 0.55],
];

function makeSpinningTire() {
  const g = new THREE.Group();
  const rubber = new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.94, metalness: 0.04 });
  const lug = new THREE.MeshStandardMaterial({ color: "#3a3a38", roughness: 0.9 });
  const rim = new THREE.MeshStandardMaterial({ color: "#cfcbc4", roughness: 0.32, metalness: 0.62 });

  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.11, 8, 18), rubber);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const wall = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 14), rubber);
  wall.rotation.y = Math.PI / 2;
  g.add(wall);

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.085), lug);
    block.position.set(0, Math.sin(a) * 0.335, Math.cos(a) * 0.335);
    block.rotation.x = -a;
    block.castShadow = true;
    g.add(block);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.16, 12), rim);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.17, 10), rim);
  cap.rotation.z = Math.PI / 2;
  g.add(cap);

  return g;
}

export function TruckModel({ color, body, hide = false }: Props) {
  const pal = TRUCK_PALETTE[color];
  const spec = kitFor(body);
  const gltf = useGLTF(spec.url);
  const root = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      }
    });
    return s;
  }, [gltf.scene]);

  const kitWheels = useMemo(() => {
    const list: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (/wheel-/i.test(o.name) || /^wheel$/i.test(o.name)) list.push(o);
    });
    return list;
  }, [root]);

  const playerTires = useMemo(() => {
    if (!body.isPlayer) return [] as THREE.Group[];
    return PLAYER_HUBS.map((p, i) => {
      const g = makeSpinningTire();
      g.name = `wheel-player-${i}`;
      g.position.set(p[0], p[1], p[2]);
      return g;
    });
  }, [body.isPlayer]);

  const group = useRef<THREE.Group>(null);
  const nitro = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const paint = new THREE.Color(body.isPlayer ? TRUCK_PALETTE.red.body : pal.body);
    const white = new THREE.Color("#f4f2ee");
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
        const n = `${mat.name} ${o.name}`;
        if (/rubber|wheel/i.test(n)) continue;
        if (/paint/i.test(n) || PAINT_MESH.test(o.name)) {
          if (spec.tintMix < 1) {
            mat.color.copy(white).lerp(paint, spec.tintMix);
            mat.roughness = 0.48;
            mat.metalness = 0.18;
            mat.emissive.copy(mat.color).multiplyScalar(0.06);
          } else {
            mat.color.copy(paint);
            if (mat.map) mat.color.lerp(new THREE.Color("#ffffff"), 0.15);
          }
        }
      }
    });
  }, [root, pal.body, spec.tintMix, body.isPlayer]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.visible = !hide;
    const hop = Math.sin(body.hop * Math.PI) * 0.12;
    g.position.set(body.x, spec.y + hop, body.z);
    g.rotation.y = body.yaw + spec.rotY;
    const spin = (body.speed / 0.48) * dt;
    for (const w of kitWheels) w.rotateX(spin);
    for (const w of playerTires) w.rotateX(spin);
    if (nitro.current) nitro.current.visible = body.isPlayer && body.speed > 16;
  });

  return (
    <group ref={group} scale={spec.scale}>
      <primitive object={root} />
      {playerTires.map((w) => (
        <primitive key={w.name} object={w} />
      ))}
      {body.isPlayer && (
        <mesh ref={nitro} position={spec.nitro} visible={false} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 1.05, 8]} />
          <meshStandardMaterial color="#ff7a18" emissive="#ff4a00" emissiveIntensity={1.4} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
