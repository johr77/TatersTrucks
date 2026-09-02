import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRUCK_PALETTE } from "../../constants";
import type { TruckColorId } from "../../types";
import type { Body3 } from "../drive";

type Props = {
  color: TruckColorId;
  body: Body3;
  hide?: boolean;
};

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.48, 0.48, 0.36, 14]} />
        <meshStandardMaterial color="#1a1614" roughness={0.92} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.38, 10]} />
        <meshStandardMaterial color="#3a3a36" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
        <meshStandardMaterial color="#d0ccc4" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function TruckModel({ color, body, hide = false }: Props) {
  const pal = TRUCK_PALETTE[color];
  const group = useRef<THREE.Group>(null);
  const nitroMesh = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.visible = !hide;
    const y = 0.48 + Math.sin(body.hop * Math.PI) * 0.12;
    g.position.set(body.x, y, body.z);
    g.rotation.y = body.yaw;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry.type === "CylinderGeometry") {
        obj.rotation.x += (body.speed / 0.48) * dt;
      }
    });
    if (nitroMesh.current) nitroMesh.current.visible = body.speed > 16;
  });

  return (
    <group ref={group}>
      <Wheel position={[-0.95, 0, -1.22]} />
      <Wheel position={[0.95, 0, -1.22]} />
      <Wheel position={[-0.95, 0, 1.18]} />
      <Wheel position={[0.95, 0, 1.18]} />

      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.55, 0.28, 3.7]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.28, -2.05]} castShadow>
        <boxGeometry args={[1.85, 0.32, 0.28]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 0.32, -2.22]}>
        <boxGeometry args={[0.42, 0.22, 0.18]} />
        <meshStandardMaterial color="#2a2a28" />
      </mesh>
      <mesh position={[0, 0.58, -1.35]} castShadow>
        <boxGeometry args={[1.62, 0.38, 1.15]} />
        <meshStandardMaterial color={pal.body} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.62, -1.94]}>
        <boxGeometry args={[1.05, 0.32, 0.08]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {[-0.32, 0, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.62, -1.97]}>
          <boxGeometry args={[0.16, 0.26, 0.05]} />
          <meshStandardMaterial color="#0c0c0c" />
        </mesh>
      ))}
      <mesh position={[-0.52, 0.58, -1.96]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#f6f0d4" emissive="#f2e8b0" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.52, 0.58, -1.96]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#f6f0d4" emissive="#f2e8b0" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-0.78, 0.62, -1.9]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e07a28" emissive="#c06018" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.78, 0.62, -1.9]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#e07a28" emissive="#c06018" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.95, -0.15]} castShadow>
        <boxGeometry args={[1.58, 0.95, 1.25]} />
        <meshStandardMaterial color={pal.body} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.12, -0.72]}>
        <boxGeometry args={[1.42, 0.55, 0.08]} />
        <meshStandardMaterial color="#243038" metalness={0.3} roughness={0.2} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.8, 1.08, -0.15]}>
        <boxGeometry args={[0.06, 0.42, 0.7]} />
        <meshStandardMaterial color="#1a2830" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.8, 1.08, -0.15]}>
        <boxGeometry args={[0.06, 0.42, 0.7]} />
        <meshStandardMaterial color="#1a2830" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.52, 1.15]} receiveShadow>
        <boxGeometry args={[1.62, 0.08, 1.7]} />
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </mesh>
      <mesh position={[-0.8, 0.78, 1.15]} castShadow>
        <boxGeometry args={[0.1, 0.52, 1.7]} />
        <meshStandardMaterial color={pal.body} roughness={0.6} />
      </mesh>
      <mesh position={[0.8, 0.78, 1.15]} castShadow>
        <boxGeometry args={[0.1, 0.52, 1.7]} />
        <meshStandardMaterial color={pal.body} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.78, 1.98]} castShadow>
        <boxGeometry args={[1.62, 0.52, 0.1]} />
        <meshStandardMaterial color={pal.body} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.55, -0.15]}>
        <boxGeometry args={[1.5, 0.05, 1.15]} />
        <meshStandardMaterial color="#1a1a18" />
      </mesh>
      <mesh position={[-0.38, 1.62, -0.68]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#f4f0dc" emissive="#fff2c0" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0.38, 1.62, -0.68]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#f4f0dc" emissive="#fff2c0" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-1.0, 1.05, -0.55]}>
        <boxGeometry args={[0.18, 0.14, 0.08]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      <mesh position={[1.0, 1.05, -0.55]}>
        <boxGeometry args={[0.18, 0.14, 0.08]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      <mesh ref={nitroMesh} position={[0, 0.55, 2.35]} visible={false} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 1.4, 8]} />
        <meshStandardMaterial color="#ff7a18" emissive="#ff4a00" emissiveIntensity={1.4} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
