import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { PLAYER_COLORS } from "../constants";
import type { Engine } from "../engine";
import { wrapPi } from "../math";
import type { Actions, TruckColorId } from "../types";
import { applyCamera, nextCam, nudgeOrbit, type CamMode, type OrbitState } from "./cameras";
import { collideWalls, inZone, stepBody, type Body3, type WallSeg, type Zone } from "./drive";
import { ShopScenery, TestScenery } from "./scenery";
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
  onShopEnter?: () => void;
  camMode: CamMode;
  setCamMode: (m: CamMode) => void;
};

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
  engine,
  onExit,
  onHint,
  onShopEnter,
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
  onShopEnter?: () => void;
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
  const inShop = useRef<string | null>(null);

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
    let shopId: string | null = null;
    for (const z of zones) {
      if (inZone(p, z)) {
        if (z.id === "exit") {
          if (!left.current) {
            left.current = true;
            onExit();
          }
        } else {
          hint = z.hint;
          shopId = z.id;
        }
      }
    }
    if (shopId && shopId !== inShop.current) onShopEnter?.();
    inShop.current = shopId;
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
  onShopEnter,
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
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#e8e0d0", "#3a2414", 0.85]} />
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
        <TestScenery slabs={test!.slabs} wallBoxes={test!.wallBoxes} spawn={test!.spawn} />
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
        onShopEnter={onShopEnter}
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
        const st = e as unknown as { movementX: number; movementY: number };
        void st;
      }}
    >
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
