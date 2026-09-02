import { PART_SIZE, PLAY_H, PLAY_W, ROAD_APRON, ROAD_W, WALL_R } from "./constants";
import { clamp } from "./math";
import type { Hill, PartId, PlacedPart, Puddle, Quarter, TireStack, TrackDef, Vec } from "./types";

export type PartPaintLayer = "apron" | "dirt" | "detail";

export type PartPaintEnv = {
  dirt: CanvasPattern | null;
  col: number;
  row: number;
  rot: Quarter;
  ox: number;
  oy: number;
};

export type PartDef = {
  id: PartId;
  /** Centerline in local tile space, unrotated. Straight: west→east. Corner: west→south. */
  localPath: Vec[];
  paint: (ctx: CanvasRenderingContext2D, env: PartPaintEnv, layer: PartPaintLayer) => void;
};

function hash2(x: number, y: number): number {
  let n = Math.imul(Math.floor(x * 13.1) ^ 0x9e3779b9, 374761393) + Math.imul(Math.floor(y * 17.7), 668265263);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function straightPath(): Vec[] {
  const s = PART_SIZE;
  const y = s / 2;
  return [
    { x: 0, y },
    { x: s * 0.25, y },
    { x: s * 0.5, y },
    { x: s * 0.75, y },
    { x: s, y },
  ];
}

function cornerPath(): Vec[] {
  const s = PART_SIZE;
  const r = s / 2;
  const n = 16;
  const pts: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
    pts.push({ x: Math.cos(a) * r, y: s + Math.sin(a) * r });
  }
  return pts;
}

/** Fill a local-space clip with a world-aligned pattern so neighboring parts share texture. */
function fillWorldClipped(ctx: CanvasRenderingContext2D, pattern: CanvasPattern | null, fallback: string, shape: () => void) {
  ctx.save();
  ctx.beginPath();
  shape();
  ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = pattern ?? fallback;
  ctx.fillRect(0, 0, PLAY_W, PLAY_H);
  ctx.restore();
}

function localToWorld(lx: number, ly: number, env: PartPaintEnv): Vec {
  const p = rotateLocal(lx, ly, env.rot);
  return { x: env.ox + env.col * PART_SIZE + p.x, y: env.oy + env.row * PART_SIZE + p.y };
}

/** 0 at the ports, 1 in the middle — keeps snap faces exact. */
function portWindow(lx: number): number {
  const t = clamp(lx / PART_SIZE, 0, 1);
  return Math.sin(t * Math.PI);
}

function edgeWave(lx: number, env: PartPaintEnv, sign: number): number {
  const w = localToWorld(lx, PART_SIZE / 2, env);
  const n = hash2(w.x * 0.35 + sign * 80, w.y * 0.35);
  return portWindow(lx) ** 2 * (n - 0.5) * 1.4;
}

function addStraightBand(ctx: CanvasRenderingContext2D, env: PartPaintEnv, inflate: number, pad: number) {
  const s = PART_SIZE;
  const mid = s / 2;
  const hw = ROAD_W / 2 + inflate;
  const steps = 18;
  ctx.moveTo(-pad, mid - hw);
  for (let i = 0; i <= steps; i++) {
    const lx = -pad + ((s + pad * 2) * i) / steps;
    ctx.lineTo(lx, mid - hw + edgeWave(clamp(lx, 0, s), env, -1));
  }
  for (let i = steps; i >= 0; i--) {
    const lx = -pad + ((s + pad * 2) * i) / steps;
    ctx.lineTo(lx, mid + hw + edgeWave(clamp(lx, 0, s), env, 1));
  }
  ctx.closePath();
}

function addCornerBand(ctx: CanvasRenderingContext2D, inflate: number, over = 0) {
  const s = PART_SIZE;
  const r = s / 2;
  const outer = r + ROAD_W / 2 + inflate;
  const inner = Math.max(4, r - ROAD_W / 2 - inflate);
  ctx.arc(0, s, outer, over, -Math.PI / 2 - over, true);
  ctx.arc(0, s, inner, -Math.PI / 2 - over, over, false);
  ctx.closePath();
}

function addCornerCaps(ctx: CanvasRenderingContext2D, inflate: number, pad: number) {
  const s = PART_SIZE;
  const hw = ROAD_W / 2 + inflate;
  ctx.rect(-pad, s / 2 - hw, pad + 2, hw * 2);
  ctx.rect(s / 2 - hw, s - 2, hw * 2, pad + 2);
}

/**
 * One definition — every straight on every track uses this.
 * Edit here and the whole course updates.
 */
export function paintStraight(ctx: CanvasRenderingContext2D, env: PartPaintEnv, layer: PartPaintLayer) {
  const s = PART_SIZE;
  const mid = s / 2;
  const hw = ROAD_W / 2;

  if (layer === "apron") {
    ctx.fillStyle = "#4a3018";
    ctx.beginPath();
    addStraightBand(ctx, env, ROAD_APRON, 0);
    ctx.fill();
    return;
  }

  if (layer === "dirt") {
    fillWorldClipped(ctx, env.dirt, "#c49648", () => {
      addStraightBand(ctx, env, 0, 3);
    });
    return;
  }

  // packed darker shoulders
  const edge = ctx.createLinearGradient(0, mid - hw, 0, mid + hw);
  edge.addColorStop(0, "rgba(58, 32, 14, 0.5)");
  edge.addColorStop(0.12, "rgba(58, 32, 14, 0)");
  edge.addColorStop(0.88, "rgba(58, 32, 14, 0)");
  edge.addColorStop(1, "rgba(58, 32, 14, 0.5)");
  ctx.save();
  ctx.beginPath();
  addStraightBand(ctx, env, 0, 3);
  ctx.clip();
  ctx.fillStyle = edge;
  ctx.fillRect(-3, mid - hw - 4, s + 6, ROAD_W + 8);
  ctx.restore();

  // sun-baked racing line
  ctx.save();
  ctx.beginPath();
  addStraightBand(ctx, env, -18, 3);
  ctx.clip();
  const worn = ctx.createLinearGradient(0, mid - 28, 0, mid + 28);
  worn.addColorStop(0, "rgba(232, 196, 118, 0)");
  worn.addColorStop(0.5, "rgba(232, 196, 118, 0.2)");
  worn.addColorStop(1, "rgba(232, 196, 118, 0)");
  ctx.fillStyle = worn;
  ctx.fillRect(-3, mid - 30, s + 6, 60);
  ctx.restore();

  // twin ruts — world-along so they continue across snapped tiles
  ctx.save();
  ctx.beginPath();
  addStraightBand(ctx, env, 0, 3);
  ctx.clip();
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  const rut = (offset: number, alpha: number, width: number) => {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(52, 30, 14, ${alpha})`;
    ctx.lineWidth = width;
    for (let i = 0; i <= 24; i++) {
      const lx = -3 + ((s + 6) * i) / 24;
      const w = localToWorld(clamp(lx, 0, s), mid, env);
      const along = env.rot % 2 === 0 ? w.x : w.y;
      const y = mid + offset + Math.sin(along * 0.13) * 0.9;
      if (i === 0) ctx.moveTo(lx, y);
      else ctx.lineTo(lx, y);
    }
    ctx.stroke();
  };
  rut(-16.5, 0.26, 2.6);
  rut(16.5, 0.26, 2.6);
  rut(-16.5, 0.12, 1.2);
  rut(16.5, 0.12, 1.2);
  ctx.restore();

  // grit, stones, grass bite along the berm — hashed in world space
  for (let i = 0; i < 36; i++) {
    const lx = (i + 0.3) * (s / 36);
    const side = i % 2 === 0 ? -1 : 1;
    const wy = mid + side * (hw - 6 - hash2(lx, i) * 10);
    const w = localToWorld(lx, wy, env);
    const h = hash2(w.x, w.y);
    if (h < 0.22) continue;
    if (h > 0.86) {
      ctx.fillStyle = "rgba(46, 90, 32, 0.45)";
      ctx.beginPath();
      ctx.ellipse(lx, mid + side * (hw + 1), 2.2, 1.3, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = h > 0.6 ? "rgba(62, 38, 18, 0.4)" : "rgba(210, 168, 96, 0.3)";
      ctx.beginPath();
      ctx.ellipse(lx + (h - 0.5) * 4, wy, 1.1 + h * 1.7, 0.7 + h, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Quarter-turn from west to south. Same road width as the straight so they snap.
 */
export function paintCorner(ctx: CanvasRenderingContext2D, env: PartPaintEnv, layer: PartPaintLayer) {
  const s = PART_SIZE;
  const r = s / 2;
  const hw = ROAD_W / 2;

  if (layer === "apron") {
    ctx.fillStyle = "#4a3018";
    ctx.beginPath();
    addCornerBand(ctx, ROAD_APRON, 0);
    ctx.fill();
    return;
  }

  if (layer === "dirt") {
    fillWorldClipped(ctx, env.dirt, "#c49648", () => {
      addCornerBand(ctx, 0, 0);
      addCornerCaps(ctx, 0, 4);
    });
    return;
  }

  ctx.save();
  ctx.beginPath();
  addCornerBand(ctx, 0, 0);
  addCornerCaps(ctx, 0, 4);
  ctx.clip();
  ctx.strokeStyle = "rgba(58, 32, 14, 0.45)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, s, r + hw - 2, 0, -Math.PI / 2, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, s, r - hw + 2, 0, -Math.PI / 2, true);
  ctx.stroke();

  ctx.strokeStyle = "rgba(232, 196, 118, 0.18)";
  ctx.lineWidth = hw * 0.42;
  ctx.beginPath();
  ctx.arc(0, s, r, 0, -Math.PI / 2, true);
  ctx.stroke();

  ctx.strokeStyle = "rgba(52, 30, 14, 0.26)";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, s, r - 16.5, 0, -Math.PI / 2, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, s, r + 16.5, 0, -Math.PI / 2, true);
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * (-Math.PI / 2);
    const wld = localToWorld(Math.cos(a) * r, s + Math.sin(a) * r, env);
    const h = hash2(wld.x, wld.y);
    if (h < 0.28) continue;
    const rad = r + (h > 0.7 ? hw - 5 : -(hw - 5));
    const lx = Math.cos(a) * rad;
    const ly = s + Math.sin(a) * rad;
    ctx.fillStyle = h > 0.88 ? "rgba(46, 90, 32, 0.4)" : h > 0.6 ? "rgba(62, 38, 18, 0.38)" : "rgba(210, 168, 96, 0.26)";
    ctx.beginPath();
    ctx.ellipse(lx, ly, 1.3 + h, 0.9, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const PARTS: Record<PartId, PartDef> = {
  straight: { id: "straight", localPath: straightPath(), paint: paintStraight },
  corner: { id: "corner", localPath: cornerPath(), paint: paintCorner },
};

export type LayoutCell = { id: PartId; rot: Quarter } | null;

export type TrackLayout = {
  id: string;
  name: string;
  blurb: string;
  cols: number;
  rows: number;
  cells: LayoutCell[];
  /** Driving order around the loop. reverse = traverse the local path backwards. */
  loop: { col: number; row: number; reverse: boolean }[];
};

/**
 * Basic stadium loop: 4 corners, 2 straights on each long side, 1 on each short side.
 * All parts are PART_SIZE square and snap on the grid.
 */
export const TEST_LOOP: TrackLayout = {
  id: "test-loop",
  name: "Test Loop",
  blurb: "Four corners. Long straights. Snap-together parts.",
  cols: 6,
  rows: 4,
  cells: [
    { id: "corner", rot: 3 },
    { id: "straight", rot: 0 },
    { id: "straight", rot: 0 },
    { id: "straight", rot: 0 },
    { id: "straight", rot: 0 },
    { id: "corner", rot: 0 },
    { id: "straight", rot: 1 },
    null,
    null,
    null,
    null,
    { id: "straight", rot: 1 },
    { id: "straight", rot: 1 },
    null,
    null,
    null,
    null,
    { id: "straight", rot: 1 },
    { id: "corner", rot: 2 },
    { id: "straight", rot: 0 },
    { id: "straight", rot: 0 },
    { id: "straight", rot: 0 },
    { id: "straight", rot: 0 },
    { id: "corner", rot: 1 },
  ],
  loop: [
    { col: 1, row: 0, reverse: true },
    { col: 0, row: 0, reverse: true },
    { col: 0, row: 1, reverse: false },
    { col: 0, row: 2, reverse: false },
    { col: 0, row: 3, reverse: true },
    { col: 1, row: 3, reverse: false },
    { col: 2, row: 3, reverse: false },
    { col: 3, row: 3, reverse: false },
    { col: 4, row: 3, reverse: false },
    { col: 5, row: 3, reverse: true },
    { col: 5, row: 2, reverse: true },
    { col: 5, row: 1, reverse: true },
    { col: 5, row: 0, reverse: true },
    { col: 4, row: 0, reverse: true },
    { col: 3, row: 0, reverse: true },
    { col: 2, row: 0, reverse: true },
  ],
};

export function rotateLocal(lx: number, ly: number, rot: Quarter): Vec {
  const c = PART_SIZE / 2;
  const dx = lx - c;
  const dy = ly - c;
  let rx = dx;
  let ry = dy;
  if (rot === 1) {
    rx = -dy;
    ry = dx;
  } else if (rot === 2) {
    rx = -dx;
    ry = -dy;
  } else if (rot === 3) {
    rx = dy;
    ry = -dx;
  }
  return { x: rx + c, y: ry + c };
}

export function worldOf(lx: number, ly: number, col: number, row: number, rot: Quarter, ox: number, oy: number): Vec {
  const p = rotateLocal(lx, ly, rot);
  return { x: ox + col * PART_SIZE + p.x, y: oy + row * PART_SIZE + p.y };
}

export function withPartLocal(
  ctx: CanvasRenderingContext2D,
  part: PlacedPart,
  ox: number,
  oy: number,
  fn: () => void,
) {
  const s = PART_SIZE;
  ctx.save();
  ctx.translate(ox + part.col * s + s / 2, oy + part.row * s + s / 2);
  ctx.rotate((part.rot * Math.PI) / 2);
  ctx.translate(-s / 2, -s / 2);
  fn();
  ctx.restore();
}

function cellAt(layout: TrackLayout, col: number, row: number): LayoutCell {
  if (col < 0 || row < 0 || col >= layout.cols || row >= layout.rows) return null;
  return layout.cells[row * layout.cols + col] ?? null;
}

function transformPath(local: Vec[], col: number, row: number, rot: Quarter, ox: number, oy: number, reverse: boolean): Vec[] {
  const pts = local.map((p) => worldOf(p.x, p.y, col, row, rot, ox, oy));
  return reverse ? pts.reverse() : pts;
}

function alongPath(path: Vec[], cum: number[], total: number, t01: number, offset: number) {
  let d = ((t01 * total) % total + total) % total;
  let i = 0;
  while (i < path.length - 1 && cum[i + 1] < d) i++;
  const a = path[i];
  const b = path[(i + 1) % path.length];
  const seg = Math.max(0.0001, cum[i + 1] - cum[i]);
  const t = clamp((d - cum[i]) / seg, 0, 1);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  let tx = b.x - a.x;
  let ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  tx /= len;
  ty /= len;
  const nx = -ty;
  const ny = tx;
  return { x: x + nx * offset, y: y + ny * offset, angle: Math.atan2(ty, tx) };
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

function scatterOnParts(
  path: Vec[],
  nParts: number,
  rng: () => number,
): { hills: Hill[]; puddles: Puddle[]; pickups: { x: number; y: number; kind: "money" | "nitro" }[] } {
  const { cum, total } = cumlen(path);
  const hills: Hill[] = [];
  const puddles: Puddle[] = [];
  const pickups: { x: number; y: number; kind: "money" | "nitro" }[] = [];
  for (let i = 0; i < nParts; i++) {
    if (rng() < 0.18) continue;
    const t = (i + 0.28 + rng() * 0.44) / nParts;
    if (t < 0.04 || t > 0.96) continue;
    const off = (rng() - 0.5) * ROAD_W * 0.28;
    const roll = rng();
    if (roll < 0.36) {
      const a = alongPath(path, cum, total, t, off);
      pickups.push({ x: a.x, y: a.y, kind: "money" });
    } else if (roll < 0.52) {
      const a = alongPath(path, cum, total, t, off);
      pickups.push({ x: a.x, y: a.y, kind: "nitro" });
    } else if (roll < 0.82) {
      const a = alongPath(path, cum, total, t, off * 0.4);
      puddles.push({ x: a.x, y: a.y, r: 14 + rng() * 10 });
    } else {
      const a = alongPath(path, cum, total, t, 0);
      hills.push({ x: a.x, y: a.y, r: 26 + rng() * 16, h: 9 + rng() * 8 });
    }
  }
  if (pickups.length === 0) {
    const a = alongPath(path, cum, total, 0.3, 16);
    pickups.push({ x: a.x, y: a.y, kind: "money" });
  }
  return { hills, puddles, pickups };
}

function offsetClosed(path: Vec[], dist: number): Vec[] {
  const n = path.length;
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = path[(i - 1 + n) % n];
    const b = path[i];
    const c = path[(i + 1) % n];
    let tx1 = b.x - a.x;
    let ty1 = b.y - a.y;
    let tx2 = c.x - b.x;
    let ty2 = c.y - b.y;
    const l1 = Math.hypot(tx1, ty1) || 1;
    const l2 = Math.hypot(tx2, ty2) || 1;
    tx1 /= l1;
    ty1 /= l1;
    tx2 /= l2;
    ty2 /= l2;
    let tx = tx1 + tx2;
    let ty = ty1 + ty2;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    out.push({ x: b.x + -ty * dist, y: b.y + tx * dist });
  }
  return out;
}

function tiresAlong(ring: Vec[], r: number): TireStack[] {
  const tires: TireStack[] = [];
  const spacing = r * 2.08;
  let carry = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.2) continue;
    let d = spacing - carry;
    while (d <= len) {
      const t = d / len;
      tires.push({ x: a.x + dx * t, y: a.y + dy * t, r });
      d += spacing;
    }
    carry = len - (d - spacing);
  }
  return tires;
}

export function assembleLayout(layout: TrackLayout, seed = 1): TrackDef {
  const ox = (PLAY_W - layout.cols * PART_SIZE) / 2;
  const oy = (PLAY_H - layout.rows * PART_SIZE) / 2;
  const placed: PlacedPart[] = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const cell = cellAt(layout, col, row);
      if (cell) placed.push({ id: cell.id, col, row, rot: cell.rot });
    }
  }

  const path: Vec[] = [];
  for (const step of layout.loop) {
    const cell = cellAt(layout, step.col, step.row);
    if (!cell) continue;
    const def = PARTS[cell.id];
    const pts = transformPath(def.localPath, step.col, step.row, cell.rot, ox, oy, step.reverse);
    if (path.length) path.push(...pts.slice(1));
    else path.push(...pts);
  }

  const lip = ROAD_W / 2 - 2;
  const wallRings = [offsetClosed(path, lip), offsetClosed(path, -lip)];
  const tires = wallRings.flatMap((ring) => tiresAlong(ring, WALL_R));

  const rng = mulberry32(seed);
  const deco = scatterOnParts(path, layout.loop.length, rng);

  return {
    id: layout.id,
    name: layout.name,
    blurb: layout.blurb,
    path,
    width: ROAD_W,
    hills: deco.hills,
    ramps: [],
    puddles: deco.puddles,
    tires,
    pickups: deco.pickups,
    placed,
    originX: ox,
    originY: oy,
    wallRings,
  };
}

export function paintPlacedPart(
  ctx: CanvasRenderingContext2D,
  part: PlacedPart,
  ox: number,
  oy: number,
  dirt: CanvasPattern | null,
  layer: PartPaintLayer,
) {
  const def = PARTS[part.id];
  withPartLocal(ctx, part, ox, oy, () => {
    def.paint(ctx, { dirt, col: part.col, row: part.row, rot: part.rot, ox, oy }, layer);
  });
}
