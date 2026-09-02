import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { PLAYER_COLORS } from "../constants";
import type { Engine } from "../engine";
import { wrapPi } from "../math";
import type { Actions, TruckColorId } from "../types";
import { applyCamera, nextCam, nudgeOrbit, type CamMode, type OrbitState } from "./cameras";
import { collideWalls, inZone, stepBody, type Body3, type WallSeg, type Zone } from "./drive";
import { SHOP_YARD, shopWallBoxes, shopWalls } from "./shopYard";
import { makeTestTrack3 } from "./testTrack";
import { TruckModel } from "./truck/TruckModel";

const EMPTY_PATH: { x: number; z: number }[] = [];

export type WorldKind = "shop" | "test";

type Props = {
  kind: WorldKind;
  color: TruckColorId;
  engine: Engine;
  onExit: () => void;
  onHint: (text: string | null) => void;
  camMode: CamMode;
  setCamMode: (m: CamMode) => void;
};

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

function ShopScenery({ walls }: { walls: { x: number; z: number; w: number; d: number; h: number }[] }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[SHOP_YARD.ground.w + 40, SHOP_YARD.ground.d + 40]} />
        <meshStandardMaterial color="#3a6a2c" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[18, 48]} />
        <meshStandardMaterial color="#c49648" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -2]} receiveShadow>
        <planeGeometry args={[42, 28]} />
        <meshStandardMaterial color="#b8894a" />
      </mesh>
      {SHOP_YARD.buildings.map((b) => (
        <group key={b.id} position={[b.x, b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.8} />
          </mesh>
          <mesh position={[0, b.h / 2 + 0.15, 0]}>
            <boxGeometry args={[b.w + 0.6, 0.3, b.d + 0.6]} />
            <meshStandardMaterial color="#2a2018" />
          </mesh>
          <mesh position={[0, 0.2, b.d / 2 + 0.04]}>
            <boxGeometry args={[2.4, 3.2, 0.08]} />
            <meshStandardMaterial color="#1a1410" />
          </mesh>
          <Html position={[0, 0.6, b.d / 2 + 0.2]} center distanceFactor={18}>
            <div className="whitespace-nowrap rounded-xs bg-surface/90 px-2 py-1 font-display text-lg tracking-wide text-fg">
              {b.name}
            </div>
          </Html>
        </group>
      ))}
      {walls.map((w, i) => (
        <mesh key={i} position={[w.x, w.h / 2, w.z]} castShadow>
          <boxGeometry args={[w.w, w.h, w.d]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      ))}
      <TireStack x={-6} z={6} />
      <TireStack x={6} z={6} />
      <TireStack x={-18} z={4} />
      <TireStack x={18} z={4} />
      <Html position={[0, 2.4, -26]} center distanceFactor={22}>
        <div className="whitespace-nowrap rounded-xs bg-surface/90 px-2 py-1 font-mono text-xs tracking-widest text-muted">
          TO MENU
        </div>
      </Html>
    </group>
  );
}

function TestScenery({
  slabs,
  wallBoxes,
}: {
  slabs: { x: number; z: number; rot: number; w: number; d: number }[];
  wallBoxes: { x: number; z: number; rot: number; len: number; thick: number; h: number }[];
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 120]} />
        <meshStandardMaterial color="#3a6a2c" />
      </mesh>
      {slabs.map((s, i) => (
        <mesh key={`d${i}`} position={[s.x, 0.05, s.z]} rotation={[0, s.rot, 0]} receiveShadow>
          <boxGeometry args={[s.w, 0.1, s.d]} />
          <meshStandardMaterial color="#c49648" roughness={0.95} />
        </mesh>
      ))}
      {wallBoxes.map((w, i) => (
        <mesh key={`w${i}`} position={[w.x, w.h / 2, w.z]} rotation={[0, w.rot, 0]} castShadow>
          <boxGeometry args={[w.thick, w.h, w.len]} />
          <meshStandardMaterial color={i % 2 ? "#ecece8" : "#1c1c1c"} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({
  body,
  mode,
  orbit,
}: {
  body: MutableRefObject<Body3>;
  mode: CamMode;
  orbit: MutableRefObject<OrbitState>;
}) {
  const { camera } = useThree();
  const prev = useRef(mode);
  useFrame((_, dt) => {
    const b = body.current;
    const snap = prev.current !== mode;
    prev.current = mode;
    applyCamera(camera, mode, b.x, b.z, b.yaw, Math.min(dt, 0.05), orbit.current, snap);
  });
  return null;
}

function DriveSim({
  kind,
  color,
  engine,
  onExit,
  onHint,
  camMode,
  setCamMode,
  bodies,
  player,
  walls,
  zones,
  path,
  orbit,
}: {
  kind: WorldKind;
  color: TruckColorId;
  engine: Engine;
  onExit: () => void;
  onHint: (text: string | null) => void;
  camMode: CamMode;
  setCamMode: (m: CamMode) => void;
  bodies: MutableRefObject<Body3[]>;
  player: MutableRefObject<Body3>;
  walls: WallSeg[];
  zones: Zone[];
  path: { x: number; z: number }[];
  orbit: MutableRefObject<OrbitState>;
}) {
  const acc = useRef(0);
  const left = useRef(false);
  const lastHint = useRef<string | null | undefined>(undefined);
  const camGrace = useRef(45);

  useEffect(() => {
    if (kind === "test") setCamMode("top");
    else setCamMode("chase");
    camGrace.current = 45;
  }, [kind, setCamMode]);

  useEffect(() => {
    window.__controlsTest = {
      getYaw: () => player.current.yaw,
      getSpeed: () => player.current.speed,
      setSteer: (v) => {
        engine.input.qaSteer = v;
      },
      setKeys: (codes) => {
        engine.input.qaKeys = codes.length ? codes : null;
      },
    };
    return () => engine.installProbe();
  }, [engine, player]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    acc.current += d;
    const STEP = 1 / 60;
    const act: Actions = engine.input.poll();
    if (camGrace.current > 0) camGrace.current -= 1;
    else if (engine.input.cameraEdge) setCamMode(nextCam(camMode));
    if (engine.input.muteEdge) engine.toggleMute();
    const frozen = engine.input.uiBlock || engine.input.listening != null;

    if (camMode === "orbit" && !frozen) {
      const pads = navigator.getGamepads?.() ?? [];
      for (const pad of pads) {
        if (!pad) continue;
        const ax = pad.axes[2] ?? 0;
        const ay = pad.axes[3] ?? 0;
        if (Math.abs(ax) > 0.12 || Math.abs(ay) > 0.12) nudgeOrbit(orbit.current, ax * 6, ay * 6);
      }
      orbit.current.theta += d * 0.08;
    }

    while (acc.current >= STEP) {
      acc.current -= STEP;
      const list = bodies.current;
      for (const b of list) {
        let a = act;
        if (b.isPlayer && frozen) a = { throttle: 0, steer: 0, nitro: false, brake: 0 };
        else if (!b.isPlayer) a = aiAct(b, path);
        stepBody(b, a, STEP, true);
        collideWalls(b, walls, 1.15);
        b.hop = Math.max(0, b.hop - STEP * 4);
      }
    }

    const p = player.current;
    engine.audio.engineTo(Math.abs(p.speed) / 0.1, false, true);

    let hint: string | null = null;
    for (const z of zones) {
      if (inZone(p, z)) {
        if (z.id === "exit") {
          if (!left.current) {
            left.current = true;
            onExit();
          }
        } else {
          hint = z.hint;
        }
      }
    }
    if (hint !== lastHint.current) {
      lastHint.current = hint;
      onHint(hint);
    }
  });
  return null;
}

function aiAct(b: Body3, path: { x: number; z: number }[]): Actions {
  if (path.length < 2) return { throttle: 0.6, steer: 0, nitro: false, brake: 0 };
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i < path.length; i++) {
    const d = (b.x - path[i].x) ** 2 + (b.z - path[i].z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const look = path[(best + 4) % path.length];
  const desired = Math.atan2(-(look.x - b.x), -(look.z - b.z));
  const err = wrapPi(desired - b.yaw);
  return {
    throttle: Math.abs(err) > 0.9 ? 0.55 : 0.85,
    steer: Math.max(-1, Math.min(1, err * 2.4)),
    nitro: false,
    brake: 0,
  };
}

function Scene({
  kind,
  color,
  engine,
  onExit,
  onHint,
  camMode,
  setCamMode,
}: Props) {
  const test = useMemo(() => (kind === "test" ? makeTestTrack3() : null), [kind]);
  const shopW = useMemo(() => (kind === "shop" ? shopWalls() : []), [kind]);
  const shopBoxes = useMemo(() => (kind === "shop" ? shopWallBoxes() : []), [kind]);

  const spawn = kind === "shop" ? SHOP_YARD.spawn : test!.spawn;
  const walls = kind === "shop" ? shopW : test!.walls;
  const zones = kind === "shop" ? [...SHOP_YARD.shops, SHOP_YARD.exit] : [];
  const path = kind === "test" ? test!.path : EMPTY_PATH;

  const pack = useMemo(() => {
    const p: Body3 = {
      x: spawn.x,
      z: spawn.z,
      yaw: spawn.yaw,
      speed: 0,
      color,
      isPlayer: true,
      aiSkill: 1,
      hop: 0,
    };
    let rest: Body3[] = [];
    if (kind === "test") {
      const cols = PLAYER_COLORS.filter((c) => c !== color);
      rest = [cols[0], cols[1], "white"].map((c, i) => {
        const pt = path[(i * 8 + 6) % Math.max(1, path.length)] ?? spawn;
        return {
          x: pt.x + (i - 1) * 1.4,
          z: pt.z,
          yaw: spawn.yaw,
          speed: 8 + i,
          color: c as TruckColorId,
          isPlayer: false,
          aiSkill: 0.5 + i * 0.1,
          hop: 0,
        };
      });
    }
    return { p, rest, all: [p, ...rest] };
  }, [kind, color, spawn.x, spawn.z, spawn.yaw, path]);

  const player = useRef(pack.p);
  player.current = pack.p;
  const bodies = useRef(pack.all);
  bodies.current = pack.all;
  const orbit = useRef<OrbitState>({ theta: 0.7, phi: 0.42 });

  return (
    <>
      <color attach="background" args={["#8aa8c4"]} />
      <fog attach="fog" args={["#8aa8c4", 90, 180]} />
      <hemisphereLight args={["#e8e0d0", "#3a2414", 0.7]} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.35}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={140}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
      {kind === "shop" ? (
        <ShopScenery walls={shopBoxes} />
      ) : (
        <TestScenery slabs={test!.slabs} wallBoxes={test!.wallBoxes} />
      )}
      {pack.all.map((b, i) => (
        <TruckModel key={i} color={b.color} body={b} hide={camMode === "hood" && b.isPlayer} />
      ))}
      <Rig body={player} mode={camMode} orbit={orbit} />
      <DriveSim
        kind={kind}
        color={color}
        engine={engine}
        onExit={onExit}
        onHint={onHint}
        camMode={camMode}
        setCamMode={setCamMode}
        bodies={bodies}
        player={player}
        walls={walls}
        zones={zones}
        path={path}
        orbit={orbit}
      />
    </>
  );
}

export function World3D(props: Props) {
  const dragging = useRef(false);
  return (
    <Canvas
      className="pointer-events-none absolute inset-0 z-[1]"
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 50, position: [0, 58, 8], near: 0.2, far: 280 }}
      onPointerDown={() => {
        dragging.current = true;
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerMove={(e) => {
        if (!dragging.current || props.camMode !== "orbit") return;
        const st = (e as unknown as { movementX: number; movementY: number });
        // orbit lives inside Scene; mouse orbit handled via gamepad/auto for now
        void st;
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
