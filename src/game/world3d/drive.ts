import { ACCEL, BRAKE, COAST, DRAG, MAX_SPEED, TURN_RATE } from "../constants";
import { clamp, wrapPi } from "../math";
import type { Actions } from "../types";

export const WALL_H = 2.75;
export const PX = 0.1;

export type WallSeg = { ax: number; az: number; bx: number; bz: number };
export type Zone = { x: number; z: number; r: number; id: string; hint: string };

export type Body3 = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  color: import("../types").TruckColorId;
  isPlayer: boolean;
  aiSkill: number;
  hop: number;
};

export function bounceXZ(b: Body3, nx: number, nz: number, overlap: number): boolean {
  b.x += nx * overlap;
  b.z += nz * overlap;
  const fx = -Math.sin(b.yaw);
  const fz = -Math.cos(b.yaw);
  const vx = fx * b.speed;
  const vz = fz * b.speed;
  const vn = vx * nx + vz * nz;
  if (vn >= 0) {
    b.speed *= 0.88;
    return false;
  }
  const rest = 0.48;
  let rx = vx - (1 + rest) * vn * nx;
  let rz = vz - (1 + rest) * vn * nz;
  rx *= 0.9;
  rz *= 0.9;
  b.speed = Math.hypot(rx, rz);
  if (b.speed > 1.2) b.yaw = wrapPi(Math.atan2(-rx, -rz));
  if (-vn > 6) b.hop = Math.max(b.hop, 0.55);
  return -vn > 2.2;
}

export function collideWalls(b: Body3, walls: WallSeg[], radius: number): boolean {
  let hit = false;
  for (const w of walls) {
    const dx = w.bx - w.ax;
    const dz = w.bz - w.az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((b.x - w.ax) * dx + (b.z - w.az) * dz) / len2;
    t = clamp(t, 0, 1);
    const px = w.ax + dx * t;
    const pz = w.az + dz * t;
    const ex = b.x - px;
    const ez = b.z - pz;
    const d = Math.hypot(ex, ez);
    if (d < radius && d > 0.0001) {
      if (bounceXZ(b, ex / d, ez / d, radius - d)) hit = true;
    }
  }
  return hit;
}

export function boxWalls(x: number, z: number, w: number, d: number): WallSeg[] {
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  return [
    { ax: x0, az: z0, bx: x1, bz: z0 },
    { ax: x1, az: z0, bx: x1, bz: z1 },
    { ax: x1, az: z1, bx: x0, bz: z1 },
    { ax: x0, az: z1, bx: x0, bz: z0 },
  ];
}

export function stepBody(b: Body3, act: Actions, dt: number, onDirt = true) {
  const vmax = MAX_SPEED * PX * (onDirt ? 1 : 0.52);
  const acc = ACCEL * PX;
  const turn = TURN_RATE * 0.72;
  const speedFactor = clamp(0.22 + (Math.abs(b.speed) / Math.max(4, vmax)) * 0.9, 0.22, 1);
  const reverse = b.speed >= -0.8 ? 1 : -1;
  b.yaw = wrapPi(b.yaw + act.steer * turn * speedFactor * reverse * dt);
  if (act.brake > 0) b.speed -= BRAKE * PX * dt;
  else if (act.throttle > 0) b.speed += acc * act.throttle * dt;
  else b.speed -= b.speed * COAST * dt;
  b.speed -= b.speed * DRAG * dt;
  if (!onDirt) b.speed -= b.speed * 1.4 * dt;
  b.speed = clamp(b.speed, -vmax * 0.28, vmax);
  const fx = -Math.sin(b.yaw);
  const fz = -Math.cos(b.yaw);
  b.x += fx * b.speed * dt;
  b.z += fz * b.speed * dt;
  b.hop = Math.max(0, b.hop - dt * 4);
}

export function inZone(b: Body3, z: Zone): boolean {
  return Math.hypot(b.x - z.x, b.z - z.z) < z.r;
}
