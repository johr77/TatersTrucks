import type { GameImages } from "./assets";
import { GAME_H, HUD_H, LAPS, PLAY_H, PLAY_W, TRUCK_PALETTE } from "./constants";
import { clamp, formatCash, shadeHex } from "./math";
import { paintPlacedPart } from "./parts";
import { racePlace } from "./sim";
import { heightAt } from "./tracks";
import type { Particle, Pickup, PreparedTrack, Truck, Upgrades } from "./types";

type Pt = { sx: number; sy: number; z: number; y: number };

function project(t: Truck, lx: number, ly: number, lz: number): Pt {
  const fx = -Math.sin(t.yaw);
  const fy = -Math.cos(t.yaw);
  const rx = Math.cos(t.yaw);
  const ry = -Math.sin(t.yaw);
  const x = t.x + rx * lx + fx * ly;
  const y = t.y + ry * lx + fy * ly;
  const z = t.z + lz;
  return { sx: x, sy: y - z * 0.52, z, y };
}

function fillQuad(ctx: CanvasRenderingContext2D, q: Pt[], fill: string, stroke?: string, width = 0.95) {
  if (q.some((p) => !Number.isFinite(p.sx) || !Number.isFinite(p.sy))) return;
  ctx.beginPath();
  ctx.moveTo(q[0].sx, q[0].sy);
  for (let i = 1; i < 4; i++) ctx.lineTo(q[i].sx, q[i].sy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  t: Truck,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  color: string,
  ink = "#1a1410",
) {
  const p = (x: number, y: number, z: number) => project(t, x, y, z);
  const nbl = p(x0, y0, z0);
  const nbr = p(x1, y0, z0);
  const nfl = p(x0, y1, z0);
  const nfr = p(x1, y1, z0);
  const tbl = p(x0, y0, z1);
  const tbr = p(x1, y0, z1);
  const tfl = p(x0, y1, z1);
  const tfr = p(x1, y1, z1);
  const faces: { q: Pt[]; k: number }[] = [
    { q: [nbl, nbr, tbr, tbl], k: -0.22 },
    { q: [nfl, nfr, tfr, tfl], k: -0.04 },
    { q: [nbl, nfl, tfl, tbl], k: -0.1 },
    { q: [nbr, nfr, tfr, tbr], k: -0.28 },
    { q: [tbl, tbr, tfr, tfl], k: 0.18 },
  ];
  faces.sort((a, b) => (a.q[0].sy + a.q[2].sy) / 2 - (b.q[0].sy + b.q[2].sy) / 2);
  for (const f of faces) fillQuad(ctx, f.q, shadeHex(color, f.k), ink, 0.95);
}

function disc(ctx: CanvasRenderingContext2D, p: Pt, r: number, fill: string, stroke?: string, width = 0.9) {
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function tube(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, w: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.stroke();
}

function drawWheel(ctx: CanvasRenderingContext2D, t: Truck, lx: number, ly: number, hMul: number) {
  const p = project(t, lx, ly, 4.6 * hMul);
  const spin = t.x * 0.14 + t.y * 0.14;
  const rx = 5.6;
  const ry = 4.35;
  ctx.fillStyle = "rgba(20,12,6,0.38)";
  ctx.beginPath();
  ctx.ellipse(p.sx + 0.4, p.sy + 1.8, rx + 0.5, ry * 0.52, -t.yaw, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1614";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx, ry, -t.yaw, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#080706";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.fillStyle = "#2c2824";
  for (let i = 0; i < 10; i++) {
    const a = -t.yaw + spin + (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(p.sx + Math.cos(a) * (rx - 0.35), p.sy + Math.sin(a) * (ry - 0.35), 1.25, 0.82, a, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#12100e";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx * 0.64, ry * 0.64, -t.yaw, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a3a36";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx * 0.4, ry * 0.4, -t.yaw, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0c0c0a";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.strokeStyle = "#1c1c1a";
  ctx.lineWidth = 1.15;
  for (let i = 0; i < 5; i++) {
    const a = -t.yaw + (i / 5) * Math.PI * 2 + spin * 0.15;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx + Math.cos(a) * rx * 0.36, p.sy + Math.sin(a) * ry * 0.36);
    ctx.stroke();
  }

  ctx.fillStyle = "#d0ccc4";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, 1.2, 0.95, -t.yaw, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a4844";
  ctx.lineWidth = 0.55;
  ctx.stroke();
}

export function drawTruck(ctx: CanvasRenderingContext2D, t: Truck) {
  if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || !Number.isFinite(t.yaw)) return;
  const pal = TRUCK_PALETTE[t.color];
  const squash = t.bounce;
  const S = 1.38;
  const h = squash;
  const ink = "#16120e";
  ctx.save();

  ctx.fillStyle = `rgba(0,0,0,${0.3 + clamp(t.z / 80, 0, 0.22)})`;
  ctx.beginPath();
  ctx.ellipse(t.x + 0.6, t.y + 3.2, 16, 9.5, -t.yaw, 0, Math.PI * 2);
  ctx.fill();

  const wheels: [number, number][] = [
    [-8.5 * S, 8.8 * S],
    [8.5 * S, 8.8 * S],
    [-8.5 * S, -8.6 * S],
    [8.5 * S, -8.6 * S],
  ];
  const sortedW = wheels
    .map(([wx, wy]) => ({ wx, wy, sy: project(t, wx, wy, 4).sy }))
    .sort((a, b) => a.sy - b.sy);
  for (const w of sortedW.slice(0, 2)) drawWheel(ctx, t, w.wx, w.wy, h);

  // black chassis + bumper
  drawBox(ctx, t, -5.2 * S, 5.2 * S, -12.0 * S, 12.2 * S, 2.6, 5.0 * h, "#1c1c1c", ink);
  drawBox(ctx, t, -6.2 * S, 6.2 * S, 11.4 * S, 13.5 * S, 3.0, 5.5 * h, "#141414", ink);

  // open bed — floor + three walls
  drawBox(ctx, t, -6.1 * S, 6.1 * S, -12.4 * S, 1.0 * S, 4.8 * h, 5.5 * h, "#5a4030", ink);
  drawBox(ctx, t, -6.4 * S, -4.9 * S, -12.2 * S, 1.0 * S, 5.1 * h, 9.0 * h, pal.body, ink);
  drawBox(ctx, t, 4.9 * S, 6.4 * S, -12.2 * S, 1.0 * S, 5.1 * h, 9.0 * h, pal.body, ink);
  drawBox(ctx, t, -6.3 * S, 6.3 * S, -12.8 * S, -11.4 * S, 5.1 * h, 8.8 * h, pal.body, ink);

  // hood + cab
  drawBox(ctx, t, -5.7 * S, 5.7 * S, 5.4 * S, 12.0 * S, 5.0 * h, 8.1 * h, pal.body, ink);
  drawBox(ctx, t, -5.5 * S, 5.5 * S, 0.5 * S, 7.2 * S, 5.0 * h, 12.3 * h, pal.body, ink);

  // windshield
  fillQuad(
    ctx,
    [
      project(t, -4.7 * S, 6.0 * S, 12.1 * h),
      project(t, 4.7 * S, 6.0 * S, 12.1 * h),
      project(t, 4.9 * S, 10.8 * S, 8.3 * h),
      project(t, -4.9 * S, 10.8 * S, 8.3 * h),
    ],
    "#243038",
    ink,
    1.05,
  );
  fillQuad(
    ctx,
    [
      project(t, -3.2 * S, 6.6 * S, 11.5 * h),
      project(t, 1.4 * S, 6.6 * S, 11.5 * h),
      project(t, 1.6 * S, 9.2 * S, 9.4 * h),
      project(t, -3.0 * S, 9.2 * S, 9.4 * h),
    ],
    "rgba(220,235,245,0.28)",
  );

  // 3-slot grille
  drawBox(ctx, t, -3.8 * S, 3.8 * S, 11.95 * S, 12.55 * S, 5.3 * h, 7.7 * h, "#141414", ink);
  for (let i = 0; i < 3; i++) {
    const x = (-2.2 + i * 2.2) * S;
    drawBox(ctx, t, x - 0.55 * S, x + 0.55 * S, 12.05 * S, 12.48 * S, 5.45 * h, 7.55 * h, "#0c0c0c", ink);
  }

  // round headlights + orange markers
  const hl = project(t, -3.5 * S, 12.4 * S, 6.6 * h);
  const hr = project(t, 3.5 * S, 12.4 * S, 6.6 * h);
  disc(ctx, hl, 2.25, "#f6f0d4", "#222", 1.1);
  disc(ctx, hr, 2.25, "#f6f0d4", "#222", 1.1);
  disc(ctx, hl, 1.2, "#fffaf0");
  disc(ctx, hr, 1.2, "#fffaf0");
  disc(ctx, project(t, -5.4 * S, 12.0 * S, 7.0 * h), 1.0, "#e07a28", "#3a2010", 0.7);
  disc(ctx, project(t, 5.4 * S, 12.0 * S, 7.0 * h), 1.0, "#e07a28", "#3a2010", 0.7);

  // winch
  drawBox(ctx, t, -1.4 * S, 1.4 * S, 12.8 * S, 13.7 * S, 3.4, 5.1 * h, "#2a2a28", ink);
  disc(ctx, project(t, 0, 13.55 * S, 4.1 * h), 1.1, "#3a3a38", "#0c0c0c", 0.7);

  // mirrors
  disc(ctx, project(t, -7.2 * S, 6.8 * S, 9.2 * h), 1.35, "#1c1c1c", ink, 0.8);
  disc(ctx, project(t, 7.2 * S, 6.8 * S, 9.2 * h), 1.35, "#1c1c1c", ink, 0.8);

  // roof rack + two spotlights over the cab
  const rackZ = 13.05 * h;
  const r1 = project(t, -5.0 * S, 1.6 * S, rackZ);
  const r2 = project(t, 5.0 * S, 1.6 * S, rackZ);
  const r3 = project(t, -5.0 * S, 7.8 * S, rackZ);
  const r4 = project(t, 5.0 * S, 7.8 * S, rackZ);
  tube(ctx, project(t, -5.0 * S, 1.6 * S, 12.2 * h), r1, "#1a1a18", 1.65);
  tube(ctx, project(t, 5.0 * S, 1.6 * S, 12.2 * h), r2, "#1a1a18", 1.65);
  tube(ctx, project(t, -5.0 * S, 7.8 * S, 12.2 * h), r3, "#1a1a18", 1.65);
  tube(ctx, project(t, 5.0 * S, 7.8 * S, 12.2 * h), r4, "#1a1a18", 1.65);
  tube(ctx, r1, r2, "#1a1a18", 1.65);
  tube(ctx, r3, r4, "#1a1a18", 1.65);
  tube(ctx, r1, r3, "#1a1a18", 1.5);
  tube(ctx, r2, r4, "#1a1a18", 1.5);
  disc(ctx, project(t, -2.4 * S, 7.75 * S, 13.5 * h), 1.55, "#f4f0dc", "#1a1a18", 0.95);
  disc(ctx, project(t, 2.4 * S, 7.75 * S, 13.5 * h), 1.55, "#f4f0dc", "#1a1a18", 0.95);

  for (const w of sortedW.slice(2)) drawWheel(ctx, t, w.wx, w.wy, h);

  const roof = project(t, 0, 4.2 * S, 12.6 * h);
  ctx.fillStyle = pal.light;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  ctx.font = "bold 8px 'Share Tech Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(String(t.id + 1), roof.sx, roof.sy);
  ctx.fillText(String(t.id + 1), roof.sx, roof.sy);

  if (t.nitroTimer > 0) {
    const fx = -Math.sin(t.yaw);
    const fy = -Math.cos(t.yaw);
    const tail = project(t, 0, -13.4 * S, 6.4 * h);
    const g = ctx.createRadialGradient(tail.sx, tail.sy, 1, tail.sx - fx * 12, tail.sy - fy * 12, 18);
    g.addColorStop(0, "rgba(255,230,120,0.92)");
    g.addColorStop(0.4, "rgba(255,110,20,0.7)");
    g.addColorStop(1, "rgba(255,40,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(tail.sx - fx * 7, tail.sy - fy * 7, 7.5, 12, -t.yaw, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function fillGrass(ctx: CanvasRenderingContext2D, imgs: GameImages) {
  if (imgs.grass) {
    const pat = ctx.createPattern(imgs.grass, "repeat");
    if (pat) ctx.fillStyle = pat;
    else ctx.fillStyle = "#3a7a2c";
  } else ctx.fillStyle = "#3a7a2c";
  ctx.fillRect(0, 0, PLAY_W, PLAY_H);
  ctx.fillStyle = "rgba(20,40,16,0.18)";
  ctx.fillRect(0, 0, PLAY_W, PLAY_H);
}

function applyHeightShading(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  const img = ctx.getImageData(0, 0, PLAY_W, PLAY_H);
  const data = img.data;
  const step = 2;
  for (let y = 0; y < PLAY_H; y += step) {
    for (let x = 0; x < PLAY_W; x += step) {
      const h = heightAt(track, x, y);
      const hx = heightAt(track, x + 4, y) - h;
      const hy = heightAt(track, x, y + 4) - h;
      const light = clamp(0.78 + 0.035 * h - hx * 0.045 - hy * 0.02, 0.45, 1.25);
      for (let oy = 0; oy < step; oy++) {
        for (let ox = 0; ox < step; ox++) {
          const i = ((y + oy) * PLAY_W + (x + ox)) * 4;
          data[i] = clamp(data[i] * light, 0, 255);
          data[i + 1] = clamp(data[i + 1] * light, 0, 255);
          data[i + 2] = clamp(data[i + 2] * light, 0, 255);
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function drawPuddles(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  for (const p of track.puddles) {
    const g = ctx.createRadialGradient(p.x - 4, p.y - 4, 2, p.x, p.y, p.r);
    g.addColorStop(0, "rgba(90,150,190,0.75)");
    g.addColorStop(0.6, "rgba(40,90,130,0.7)");
    g.addColorStop(1, "rgba(30,70,90,0.15)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.78, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRamps(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  for (const r of track.ramps) {
    const ca = Math.cos(r.angle);
    const sa = Math.sin(r.angle);
    const hw = r.w / 2;
    const corners = [
      { l: 0, s: -hw, h: 0 },
      { l: 0, s: hw, h: 0 },
      { l: r.len, s: hw, h: r.h },
      { l: r.len, s: -hw, h: r.h },
    ];
    const proj = corners.map((c) => {
      const x = r.x + ca * c.l - sa * c.s;
      const y = r.y + sa * c.l + ca * c.s;
      return { x, y: y - c.h * 0.52 };
    });
    ctx.beginPath();
    ctx.moveTo(proj[0].x, proj[0].y);
    for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(196,150,70,0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(80,50,20,0.6)";
    ctx.stroke();
    ctx.fillStyle = "rgba(230,190,110,0.5)";
    ctx.beginPath();
    ctx.moveTo(proj[2].x, proj[2].y);
    ctx.lineTo(proj[3].x, proj[3].y);
    ctx.lineTo(proj[3].x, proj[3].y + r.h * 0.52);
    ctx.lineTo(proj[2].x, proj[2].y + r.h * 0.52);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStartFinish(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  const path = track.path;
  if (path.length < 2) return;
  const a = path[0];
  const b = path[1];
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  const nx = -ty / len;
  const ny = tx / len;
  const half = track.width * 0.48;
  const cells = 10;
  for (let i = 0; i < cells; i++) {
    const t0 = -1 + (i / cells) * 2;
    const t1 = -1 + ((i + 1) / cells) * 2;
    const x0 = a.x + nx * half * t0;
    const y0 = a.y + ny * half * t0;
    const x1 = a.x + nx * half * t1;
    const y1 = a.y + ny * half * t1;
    ctx.strokeStyle = i % 2 === 0 ? "#f4f0e8" : "#161210";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x0 - (tx / len) * 4, y0 - (ty / len) * 4);
    ctx.lineTo(x1 - (tx / len) * 4, y1 - (ty / len) * 4);
    ctx.stroke();
  }
}

function drawOuterTires(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 13;
  ctx.strokeRect(8, 8, PLAY_W - 16, PLAY_H - 16);
  const tireR = 6;
  const inset = 8;
  const drawTiresAlong = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy);
    const n = Math.max(2, Math.floor(L / (tireR * 2.05)));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const x = x0 + dx * t;
      const y = y0 + dy * t;
      ctx.beginPath();
      ctx.fillStyle = i % 2 === 0 ? "#1c1c1c" : "#ecece8";
      ctx.arc(x, y, tireR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0a0a0a";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  drawTiresAlong(inset, inset, PLAY_W - inset, inset);
  drawTiresAlong(PLAY_W - inset, inset, PLAY_W - inset, PLAY_H - inset);
  drawTiresAlong(PLAY_W - inset, PLAY_H - inset, inset, PLAY_H - inset);
  drawTiresAlong(inset, PLAY_H - inset, inset, inset);
  ctx.restore();
}

function drawWallRings(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  const rings = track.wallRings;
  if (!rings?.length) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const ring of rings) {
    if (ring.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(ring[0].x, ring[0].y);
    for (let i = 1; i < ring.length; i++) ctx.lineTo(ring[i].x, ring[i].y);
    ctx.closePath();
    ctx.strokeStyle = "#141210";
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = "#2a241c";
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrackTires(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  track.tires.forEach((tire, i) => {
    ctx.beginPath();
    ctx.fillStyle = i % 2 === 0 ? "#1c1c1c" : "#ecece8";
    ctx.arc(tire.x, tire.y, tire.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = i % 2 === 0 ? "#3a3a38" : "#c8c4bc";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(tire.x, tire.y, tire.r * 0.52, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawInfield(ctx: CanvasRenderingContext2D, track: PreparedTrack) {
  const path = track.path;
  if (path.length < 3) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.closePath();
  ctx.fillStyle = "rgba(18, 36, 14, 0.16)";
  ctx.fill();
  ctx.restore();
}

function bakePartTrack(ctx: CanvasRenderingContext2D, track: PreparedTrack, imgs: GameImages) {
  fillGrass(ctx, imgs);
  drawInfield(ctx, track);
  const dirt = imgs.dirt ? ctx.createPattern(imgs.dirt, "repeat") : null;
  const ox = track.originX ?? 0;
  const oy = track.originY ?? 0;
  const placed = track.placed ?? [];
  for (const layer of ["apron", "dirt", "detail"] as const) {
    for (const part of placed) paintPlacedPart(ctx, part, ox, oy, dirt, layer);
  }
}

function bakeStrokedPath(ctx: CanvasRenderingContext2D, track: PreparedTrack, imgs: GameImages) {
  fillGrass(ctx, imgs);
  const path = track.path;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const strokePath = () => {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.closePath();
  };

  ctx.lineWidth = track.width + 16;
  ctx.strokeStyle = "rgba(48,28,12,0.95)";
  strokePath();
  ctx.stroke();

  ctx.lineWidth = track.width;
  ctx.strokeStyle = "#c49648";
  strokePath();
  ctx.stroke();

  if (imgs.dirt) {
    const pat = ctx.createPattern(imgs.dirt, "repeat");
    if (pat) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = pat;
      ctx.lineWidth = track.width - 2;
      strokePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.lineWidth = Math.max(18, track.width - 28);
  ctx.strokeStyle = "rgba(232,190,110,0.16)";
  strokePath();
  ctx.stroke();
}

export function bakeTrack(track: PreparedTrack, imgs: GameImages): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = PLAY_W;
  c.height = PLAY_H;
  const ctx = c.getContext("2d")!;

  if (track.placed && track.placed.length) bakePartTrack(ctx, track, imgs);
  else bakeStrokedPath(ctx, track, imgs);

  applyHeightShading(ctx, track);
  drawPuddles(ctx, track);
  drawRamps(ctx, track);
  drawStartFinish(ctx, track);
  drawWallRings(ctx, track);
  drawOuterTires(ctx);
  drawTrackTires(ctx, track);

  track.baked = c;
  return c;
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  track: PreparedTrack,
  trucks: Truck[],
  particles: Particle[],
  pickups: Pickup[],
  imgs: GameImages,
  time: number,
  shake: { x: number; y: number },
) {
  ctx.save();
  ctx.translate(shake.x, shake.y);
  if (track.baked) ctx.drawImage(track.baked, 0, 0);
  else {
    ctx.fillStyle = "#3a7a2c";
    ctx.fillRect(0, 0, PLAY_W, PLAY_H);
  }

  ctx.globalAlpha = 0.22 + Math.sin(time * 3) * 0.08;
  ctx.fillStyle = "#9fd4ee";
  for (const p of track.puddles) {
    ctx.beginPath();
    ctx.ellipse(p.x + Math.sin(time * 2) * 2, p.y, p.r * 0.55, p.r * 0.28, time, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const p of pickups) {
    if (p.taken) continue;
    const bob = Math.sin(time * 3 + p.phase) * 3;
    const img = p.kind === "money" ? imgs.money : imgs.nitro;
    const s = p.kind === "money" ? 22 : 18;
    if (img) ctx.drawImage(img, p.x - s / 2, p.y - s / 2 + bob, s, s);
    else {
      ctx.fillStyle = p.kind === "money" ? "#d4b84a" : "#e05020";
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const sorted = [...trucks].sort((a, b) => a.y - b.y);
  for (const t of sorted) drawTruck(ctx, t);

  ctx.restore();
}

const PLACE_LABEL = ["1st", "2nd", "3rd", "4th"];

export function drawHud(
  ctx: CanvasRenderingContext2D,
  trucks: Truck[],
  money: number,
  upgrades: Upgrades,
  trackName: string,
  raceIndex: number,
  raceCount: number,
  countdown: number,
  paused: boolean,
) {
  void upgrades;
  ctx.fillStyle = "#0c0a08";
  ctx.fillRect(0, PLAY_H, PLAY_W, HUD_H);
  ctx.fillStyle = "#2a241c";
  ctx.fillRect(0, PLAY_H, PLAY_W, 2);

  const slotW = PLAY_W / 4;
  trucks.forEach((t, i) => {
    const x = i * slotW;
    const y = PLAY_H + 6;
    ctx.fillStyle = shadeHex(TRUCK_PALETTE[t.color].body, -0.45);
    ctx.fillRect(x + 6, y, slotW - 12, HUD_H - 14);
    ctx.strokeStyle = TRUCK_PALETTE[t.color].light;
    ctx.lineWidth = t.isPlayer ? 2 : 1;
    ctx.strokeRect(x + 6.5, y + 0.5, slotW - 13, HUD_H - 15);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 6, y, 44, HUD_H - 14);
    ctx.clip();
    const mini: Truck = {
      ...t,
      x: x + 26,
      y: y + 40,
      z: 0,
      yaw: -1.12,
      bounce: 1,
      nitroTimer: 0,
    };
    drawTruck(ctx, mini);
    ctx.restore();

    ctx.fillStyle = "#f2ebe0";
    ctx.font = "600 13px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(t.name, x + 36, y + 6);

    const place = racePlace(trucks, t);
    ctx.fillStyle = t.isPlayer ? "#f2ebe0" : "#9a8b74";
    ctx.font = "700 22px Teko, sans-serif";
    ctx.fillText(PLACE_LABEL[place - 1] ?? `${place}th`, x + 36, y + 24);

    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillStyle = "#9a8b74";
    const lap = Math.min(LAPS, t.lap + 1);
    ctx.fillText(`LAP ${lap}/${LAPS}`, x + 100, y + 30);

    for (let n = 0; n < Math.min(8, t.nitro); n++) {
      ctx.fillStyle = t.nitroTimer > 0 ? "#ff7a18" : "#c4783a";
      ctx.fillRect(x + 12 + n * 10, y + 52, 8, 12);
      ctx.strokeStyle = "#1a120c";
      ctx.strokeRect(x + 12 + n * 10, y + 52, 8, 12);
    }
  });

  ctx.fillStyle = "#f2ebe0";
  ctx.font = "12px 'Share Tech Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${trackName}   HEAT ${raceIndex + 1}/${raceCount}   ${formatCash(money)}`, PLAY_W - 14, PLAY_H + 8);

  if (countdown > 0) {
    ctx.fillStyle = "rgba(10,8,6,0.35)";
    ctx.fillRect(0, 0, PLAY_W, PLAY_H);
    ctx.fillStyle = "#f2ebe0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 120px Teko, sans-serif";
    const n = Math.ceil(countdown);
    ctx.fillText(n > 0 && countdown > 0.15 ? String(n) : "GO", PLAY_W / 2, PLAY_H / 2);
  }

  if (paused) {
    ctx.fillStyle = "rgba(10,8,6,0.55)";
    ctx.fillRect(0, 0, PLAY_W, PLAY_H);
    ctx.fillStyle = "#f2ebe0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 64px Teko, sans-serif";
    ctx.fillText("PAUSED", PLAY_W / 2, PLAY_H / 2);
    ctx.font = "16px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = "#9a8b74";
    ctx.fillText("Press P or tap to resume", PLAY_W / 2, PLAY_H / 2 + 40);
  }
}

export function fitCanvas(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
): { scale: number; ox: number; oy: number } {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const scale = Math.min(cssW / PLAY_W, cssH / GAME_H);
  const ox = (cssW - PLAY_W * scale) / 2;
  const oy = (cssH - GAME_H * scale) / 2;
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  return { scale, ox, oy };
}
