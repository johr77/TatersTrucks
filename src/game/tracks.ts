import { HM_H, HM_W, PLAY_H, PLAY_W } from "./constants";
import type { Hill, PreparedTrack, Puddle, Ramp, TireStack, TrackDef, Vec } from "./types";
import { clamp } from "./math";

export { assembleLayout, PARTS, TEST_LOOP } from "./parts";

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 96, wobble = 0, wobbleFreq = 3): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 - (i / n) * Math.PI * 2;
    const w = wobble ? 1 + wobble * Math.sin(t * wobbleFreq) : 1;
    pts.push({ x: cx + Math.cos(t) * rx * w, y: cy + Math.sin(t) * ry * w });
  }
  return pts;
}

function figure8(cx: number, cy: number, ax: number, ay: number, n = 120): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + Math.PI / 2;
    pts.push({
      x: cx + ax * Math.sin(t),
      y: cy + ay * Math.sin(t) * Math.cos(t),
    });
  }
  return pts;
}

function roundedRect(cx: number, cy: number, w: number, h: number, r: number, n = 96): Vec[] {
  const pts: Vec[] = [];
  const segs = Math.max(4, Math.floor(n / 4));
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const corners = [
    { x: cx + hw, y: cy - hh, a0: -Math.PI / 2, a1: 0 },
    { x: cx + hw, y: cy + hh, a0: 0, a1: Math.PI / 2 },
    { x: cx - hw, y: cy + hh, a0: Math.PI / 2, a1: Math.PI },
    { x: cx - hw, y: cy - hh, a0: Math.PI, a1: (3 * Math.PI) / 2 },
  ];
  for (const c of corners) {
    for (let i = 0; i < segs; i++) {
      const a = c.a0 + ((c.a1 - c.a0) * i) / segs;
      pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
    }
  }
  pts.reverse();
  let best = 0;
  let bestY = Infinity;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].y < bestY) {
      bestY = pts[i].y;
      best = i;
    }
  }
  return pts.slice(best).concat(pts.slice(0, best));
}

function cumlen(path: Vec[]): { cum: number[]; total: number } {
  const cum = [0];
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
    cum.push(total);
  }
  return { cum, total };
}

export function samplePath(path: Vec[], cum: number[], total: number, s: number): { p: Vec; tx: number; ty: number; nx: number; ny: number } {
  let d = ((s % total) + total) % total;
  let i = 0;
  while (i < path.length - 1 && cum[i + 1] < d) i++;
  const a = path[i];
  const b = path[(i + 1) % path.length];
  const seg = Math.max(0.0001, cum[i + 1] - cum[i]);
  const t = clamp((d - cum[i]) / seg, 0, 1);
  const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  let tx = b.x - a.x;
  let ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  tx /= len;
  ty /= len;
  return { p, tx, ty, nx: -ty, ny: tx };
}

function along(path: Vec[], cum: number[], total: number, t01: number, offset = 0) {
  const s = samplePath(path, cum, total, t01 * total);
  return { x: s.p.x + s.nx * offset, y: s.p.y + s.ny * offset, angle: Math.atan2(s.ty, s.tx), ...s };
}

function closestDist(path: Vec[], x: number, y: number): { dist: number; sIndex: number; t: number; d: number } {
  let best = Infinity;
  let bestI = 0;
  let bestT = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i];
    const b = path[(i + 1) % path.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = x - a.x;
    const apy = y - a.y;
    const ab2 = abx * abx + aby * aby || 1;
    const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best) {
      best = d;
      bestI = i;
      bestT = t;
    }
  }
  return { dist: best, sIndex: bestI, t: bestT, d: best };
}

function buildHeight(def: TrackDef): Float32Array {
  const hm = new Float32Array(HM_W * HM_H);
  const set = (ix: number, iy: number, v: number) => {
    if (ix < 0 || iy < 0 || ix >= HM_W || iy >= HM_H) return;
    const i = iy * HM_W + ix;
    if (v > hm[i]) hm[i] = v;
  };
  for (const hill of def.hills) {
    const r = hill.r;
    const x0 = Math.floor(((hill.x - r) / PLAY_W) * HM_W);
    const x1 = Math.ceil(((hill.x + r) / PLAY_W) * HM_W);
    const y0 = Math.floor(((hill.y - r) / PLAY_H) * HM_H);
    const y1 = Math.ceil(((hill.y + r) / PLAY_H) * HM_H);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const wx = ((ix + 0.5) / HM_W) * PLAY_W;
        const wy = ((iy + 0.5) / HM_H) * PLAY_H;
        const d = Math.hypot(wx - hill.x, wy - hill.y) / r;
        if (d < 1) {
          const k = 0.5 + 0.5 * Math.cos(d * Math.PI);
          set(ix, iy, hill.h * k);
        }
      }
    }
  }
  for (const ramp of def.ramps) {
    const ca = Math.cos(ramp.angle);
    const sa = Math.sin(ramp.angle);
    const hw = ramp.w / 2;
    const x0 = Math.floor(((ramp.x - ramp.len - hw) / PLAY_W) * HM_W);
    const x1 = Math.ceil(((ramp.x + ramp.len + hw) / PLAY_W) * HM_W);
    const y0 = Math.floor(((ramp.y - ramp.len - hw) / PLAY_H) * HM_H);
    const y1 = Math.ceil(((ramp.y + ramp.len + hw) / PLAY_H) * HM_H);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const wx = ((ix + 0.5) / HM_W) * PLAY_W;
        const wy = ((iy + 0.5) / HM_H) * PLAY_H;
        const dx = wx - ramp.x;
        const dy = wy - ramp.y;
        const localY = dx * ca + dy * sa;
        const localX = -dx * sa + dy * ca;
        if (localY >= 0 && localY <= ramp.len && Math.abs(localX) <= hw) {
          const k = localY / ramp.len;
          set(ix, iy, ramp.h * k);
        }
      }
    }
  }
  return hm;
}

export function heightAt(track: PreparedTrack, x: number, y: number): number {
  const u = clamp((x / PLAY_W) * track.hmW, 0, track.hmW - 1.001);
  const v = clamp((y / PLAY_H) * track.hmH, 0, track.hmH - 1.001);
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const i = y0 * track.hmW + x0;
  const a = track.height[i];
  const b = track.height[i + 1] ?? a;
  const c = track.height[i + track.hmW] ?? a;
  const d = track.height[i + track.hmW + 1] ?? a;
  return lerp2(a, b, c, d, fx, fy);
}

function lerp2(a: number, b: number, c: number, d: number, fx: number, fy: number) {
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

export function offTrackDist(track: PreparedTrack, x: number, y: number): number {
  return closestDist(track.path, x, y).dist;
}

export function progressAt(track: PreparedTrack, x: number, y: number): number {
  const c = closestDist(track.path, x, y);
  const d0 = track.cum[c.sIndex];
  const d1 = track.cum[c.sIndex + 1] ?? track.totalLen;
  const d = d0 + (d1 - d0) * c.t;
  return d / track.totalLen;
}

export function pathHeading(track: PreparedTrack, t01: number): number {
  const s = samplePath(track.path, track.cum, track.totalLen, t01 * track.totalLen);
  return Math.atan2(-s.tx, -s.ty);
}

export function inPuddle(track: TrackDef, x: number, y: number): Puddle | null {
  for (const p of track.puddles) {
    if (Math.hypot(x - p.x, y - p.y) < p.r) return p;
  }
  return null;
}

function decorate(
  path: Vec[],
  width: number,
  hillsT: { t: number; r: number; h: number; off?: number }[],
  rampsT: { t: number; len: number; w: number; h: number }[],
  puddlesT: { t: number; r: number; off?: number }[],
  tiresT: { t: number; off: number; r?: number }[],
  bags: { t: number; off: number; kind: "money" | "nitro" }[],
): Pick<TrackDef, "hills" | "ramps" | "puddles" | "tires" | "pickups"> {
  const { cum, total } = cumlen(path);
  const hills: Hill[] = hillsT.map((h) => {
    const a = along(path, cum, total, h.t, h.off ?? 0);
    return { x: a.x, y: a.y, r: h.r, h: h.h };
  });
  const ramps: Ramp[] = rampsT.map((r) => {
    const a = along(path, cum, total, r.t, 0);
    const ang = Math.atan2(a.ty, a.tx);
    return { x: a.x - Math.cos(ang) * r.len * 0.15, y: a.y - Math.sin(ang) * r.len * 0.15, angle: ang, len: r.len, w: r.w, h: r.h };
  });
  const puddles: Puddle[] = puddlesT.map((p) => {
    const a = along(path, cum, total, p.t, p.off ?? 0);
    return { x: a.x, y: a.y, r: p.r };
  });
  const tires: TireStack[] = [
    ...tiresT.map((t) => {
      const a = along(path, cum, total, t.t, t.off);
      return { x: a.x, y: a.y, r: t.r ?? 9 };
    }),
  ];
  const pickups = bags.map((b) => {
    const a = along(path, cum, total, b.t, b.off);
    return { x: a.x, y: a.y, kind: b.kind };
  });
  void width;
  return { hills, ramps, puddles, tires, pickups };
}

function makeTrack(
  id: string,
  name: string,
  blurb: string,
  path: Vec[],
  width: number,
  extra: ReturnType<typeof decorate> & { extraTires?: TireStack[] },
): TrackDef {
  return {
    id,
    name,
    blurb,
    path,
    width,
    hills: extra.hills,
    ramps: extra.ramps,
    puddles: extra.puddles,
    tires: [...extra.tires, ...(extra.extraTires ?? [])],
    pickups: extra.pickups,
  };
}

function buildDefs(): TrackDef[] {
  const c = { x: PLAY_W / 2, y: PLAY_H / 2 };

  const sidewinder = ellipse(c.x, c.y, 305, 172, 100, 0.04, 4);
  const wipeout = figure8(c.x, c.y, 250, 175, 128);
  const blaster = ellipse(c.x, c.y, 300, 168, 96);
  const fandango = ellipse(c.x, c.y, 290, 160, 110, 0.16, 3);
  const huevos = ellipse(c.x, c.y, 318, 178, 96, 0.02, 2);
  const cliff = ellipse(c.x, c.y, 288, 158, 100, 0.08, 5);
  const dukes = roundedRect(c.x, c.y, 620, 360, 88, 100);
  const gulch = ellipse(c.x, c.y, 300, 165, 120, 0.12, 4);

  return [
    makeTrack(
      "sidewinder",
      "Sidewinder",
      "Stadium oval. Learn the bounce.",
      sidewinder,
      78,
      decorate(
        sidewinder,
        78,
        [
          { t: 0.2, r: 55, h: 16 },
          { t: 0.55, r: 48, h: 12 },
          { t: 0.82, r: 42, h: 10 },
        ],
        [{ t: 0.12, len: 58, w: 48, h: 22 }],
        [
          { t: 0.38, r: 22, off: 8 },
          { t: 0.7, r: 18, off: -10 },
        ],
        [],
        [
          { t: 0.18, off: 18, kind: "money" },
          { t: 0.45, off: -16, kind: "nitro" },
          { t: 0.72, off: 14, kind: "money" },
          { t: 0.9, off: -12, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "wipeout",
      "Wipeout",
      "Figure-8. Don't blink at the cross.",
      wipeout,
      70,
      decorate(
        wipeout,
        70,
        [
          { t: 0.18, r: 40, h: 14 },
          { t: 0.68, r: 44, h: 16 },
        ],
        [
          { t: 0.3, len: 50, w: 42, h: 20 },
          { t: 0.8, len: 50, w: 42, h: 20 },
        ],
        [{ t: 0.5, r: 16 }],
        [],
        [
          { t: 0.12, off: 14, kind: "money" },
          { t: 0.4, off: -12, kind: "nitro" },
          { t: 0.62, off: 16, kind: "money" },
          { t: 0.88, off: -10, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "blaster",
      "Blaster",
      "Big ramps. Hold nitro over the lip.",
      blaster,
      80,
      decorate(
        blaster,
        80,
        [{ t: 0.5, r: 50, h: 10 }],
        [
          { t: 0.08, len: 70, w: 56, h: 28 },
          { t: 0.58, len: 70, w: 56, h: 28 },
        ],
        [
          { t: 0.3, r: 20 },
          { t: 0.82, r: 18, off: 10 },
        ],
        [],
        [
          { t: 0.22, off: 16, kind: "money" },
          { t: 0.48, off: -14, kind: "nitro" },
          { t: 0.75, off: 12, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "fandango",
      "Fandango",
      "Tight wiggle. Tires pay off here.",
      fandango,
      64,
      decorate(
        fandango,
        64,
        [
          { t: 0.15, r: 36, h: 12 },
          { t: 0.4, r: 32, h: 14 },
          { t: 0.78, r: 38, h: 11 },
        ],
        [{ t: 0.55, len: 44, w: 36, h: 18 }],
        [
          { t: 0.28, r: 16, off: 6 },
          { t: 0.88, r: 14 },
        ],
        [],
        [
          { t: 0.1, off: 12, kind: "nitro" },
          { t: 0.33, off: -12, kind: "money" },
          { t: 0.66, off: 10, kind: "money" },
          { t: 0.92, off: -8, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "huevos",
      "Huevos Grande",
      "Wide and fast. Top speed wins.",
      huevos,
      92,
      decorate(
        huevos,
        92,
        [
          { t: 0.25, r: 60, h: 14 },
          { t: 0.75, r: 55, h: 12 },
        ],
        [{ t: 0.48, len: 64, w: 60, h: 24 }],
        [{ t: 0.1, r: 24, off: 20 }],
        [],
        [
          { t: 0.15, off: 22, kind: "money" },
          { t: 0.4, off: -20, kind: "nitro" },
          { t: 0.62, off: 18, kind: "money" },
          { t: 0.88, off: -16, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "cliffhanger",
      "Cliffhanger",
      "Hill country. Upgrade those shocks.",
      cliff,
      68,
      decorate(
        cliff,
        68,
        [
          { t: 0.08, r: 50, h: 22 },
          { t: 0.22, r: 42, h: 18 },
          { t: 0.4, r: 48, h: 24 },
          { t: 0.58, r: 40, h: 16 },
          { t: 0.74, r: 52, h: 20 },
          { t: 0.9, r: 36, h: 14 },
        ],
        [{ t: 0.32, len: 48, w: 40, h: 20 }],
        [{ t: 0.5, r: 18 }],
        [],
        [
          { t: 0.18, off: 12, kind: "money" },
          { t: 0.46, off: -10, kind: "nitro" },
          { t: 0.7, off: 12, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "dukes",
      "Big Dukes",
      "Banked rectangle. Jump the short sides.",
      dukes,
      76,
      decorate(
        dukes,
        76,
        [
          { t: 0.2, r: 40, h: 10 },
          { t: 0.7, r: 40, h: 10 },
        ],
        [
          { t: 0.12, len: 62, w: 50, h: 26 },
          { t: 0.62, len: 62, w: 50, h: 26 },
        ],
        [
          { t: 0.35, r: 20 },
          { t: 0.85, r: 18 },
        ],
        [],
        [
          { t: 0.08, off: 16, kind: "nitro" },
          { t: 0.28, off: -14, kind: "money" },
          { t: 0.55, off: 14, kind: "money" },
          { t: 0.82, off: -12, kind: "money" },
        ],
      ),
    ),
    makeTrack(
      "gulch",
      "Hurricane Gulch",
      "Mud, water, and a mean racing line.",
      gulch,
      72,
      decorate(
        gulch,
        72,
        [
          { t: 0.18, r: 46, h: 16 },
          { t: 0.5, r: 52, h: 18 },
          { t: 0.84, r: 44, h: 14 },
        ],
        [
          { t: 0.3, len: 54, w: 44, h: 22 },
          { t: 0.68, len: 50, w: 42, h: 20 },
        ],
        [
          { t: 0.1, r: 26, off: 4 },
          { t: 0.42, r: 22, off: -8 },
          { t: 0.78, r: 24 },
        ],
        [],
        [
          { t: 0.14, off: 14, kind: "money" },
          { t: 0.36, off: -12, kind: "nitro" },
          { t: 0.58, off: 12, kind: "money" },
          { t: 0.9, off: -10, kind: "money" },
        ],
      ),
    ),
  ];
}

export const TRACKS: TrackDef[] = buildDefs();

export function prepareTrack(def: TrackDef): PreparedTrack {
  const { cum, total } = cumlen(def.path);
  return {
    ...def,
    cum,
    totalLen: total,
    height: buildHeight(def),
    hmW: HM_W,
    hmH: HM_H,
    baked: null,
  };
}

export function startPose(track: PreparedTrack, slot: number, count: number) {
  const s = samplePath(track.path, track.cum, track.totalLen, track.totalLen - 28);
  const spread = 22;
  const offset = (slot - (count - 1) / 2) * spread;
  return {
    x: s.p.x + s.nx * offset - s.tx * 6,
    y: s.p.y + s.ny * offset - s.ty * 6,
    yaw: Math.atan2(-s.tx, -s.ty),
  };
}
