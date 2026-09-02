import { PART_SIZE, PLAY_H, PLAY_W, ROAD_W } from "../constants";
import { assembleLayout, TEST_LOOP } from "../parts";
import { PX, WALL_H, type WallSeg } from "./drive";

export type DirtSlab = {
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
};

export type WallBox = {
  x: number;
  z: number;
  rot: number;
  len: number;
  thick: number;
  h: number;
};

function to3(x: number, y: number) {
  return { x: (x - PLAY_W / 2) * PX, z: (y - PLAY_H / 2) * PX };
}

export function makeTestTrack3() {
  const def = assembleLayout(TEST_LOOP, 7);
  const walls: WallSeg[] = [];
  const wallBoxes: WallBox[] = [];
  const rings = def.wallRings ?? [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = to3(ring[i].x, ring[i].y);
      const b = to3(ring[(i + 1) % ring.length].x, ring[(i + 1) % ring.length].y);
      walls.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.15) continue;
      wallBoxes.push({
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        rot: Math.atan2(dx, dz),
        len,
        thick: 0.42,
        h: WALL_H,
      });
    }
  }

  const slabs: DirtSlab[] = [];
  const ox = def.originX ?? 0;
  const oy = def.originY ?? 0;
  const s = PART_SIZE * PX;
  const rw = ROAD_W * PX;
  for (const p of def.placed ?? []) {
    const c = to3(ox + p.col * PART_SIZE + PART_SIZE / 2, oy + p.row * PART_SIZE + PART_SIZE / 2);
    const rot = -p.rot * (Math.PI / 2);
    slabs.push({ x: c.x, z: c.z, rot, w: s * 1.04, d: s * 1.04 });
  }

  const path = def.path.map((p) => to3(p.x, p.y));
  const spawn = path[Math.max(0, Math.floor(path.length * 0.08))] ?? { x: 0, z: 8 };
  const n = path[Math.max(1, Math.floor(path.length * 0.08) + 2)] ?? { x: 0, z: 0 };
  const yaw = Math.atan2(-(n.x - spawn.x), -(n.z - spawn.z));

  return {
    name: def.name,
    walls,
    wallBoxes,
    slabs,
    path,
    spawn: { x: spawn.x, z: spawn.z, yaw },
    width: rw,
  };
}
