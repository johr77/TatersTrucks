#!/usr/bin/env node
/**
 * Writes a Blender-ready pickup .glb (named parts, Y-up, meters).
 * Nose faces -Z to match the in-game truck.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const MATS = {
  paint: { color: [0.831, 0.196, 0.169, 1], metal: 0.05, rough: 0.42 },
  dark: { color: [0.08, 0.07, 0.065, 1], metal: 0.1, rough: 0.55 },
  rubber: { color: [0.07, 0.06, 0.055, 1], metal: 0, rough: 0.95 },
  chrome: { color: [0.82, 0.83, 0.85, 1], metal: 1, rough: 0.18 },
  glass: { color: [0.35, 0.55, 0.7, 0.38], metal: 0.1, rough: 0.08, blend: true },
  wood: { color: [0.42, 0.26, 0.12, 1], metal: 0, rough: 0.88 },
  light: { color: [1, 0.96, 0.82, 1], metal: 0, rough: 0.25, emissive: [0.9, 0.85, 0.6] },
  plastic: { color: [0.12, 0.12, 0.11, 1], metal: 0, rough: 0.7 },
};

function box(sx, sy, sz) {
  const hx = sx / 2,
    hy = sy / 2,
    hz = sz / 2;
  const faces = [
    { n: [1, 0, 0], v: [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]] },
    { n: [-1, 0, 0], v: [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]] },
    { n: [0, 1, 0], v: [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]] },
    { n: [0, -1, 0], v: [[-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz]] },
    { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
  ];
  const pos = [];
  const nrm = [];
  const idx = [];
  let b = 0;
  for (const f of faces) {
    for (const p of f.v) {
      pos.push(...p);
      nrm.push(...f.n);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    b += 4;
  }
  return { pos, nrm, idx };
}

function cylinder(radius, length, segs = 16, axis = "x") {
  const pos = [];
  const nrm = [];
  const idx = [];
  const hl = length / 2;
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    rings.push({ c, s });
  }
  const push = (x, y, z, nx, ny, nz) => {
    pos.push(x, y, z);
    nrm.push(nx, ny, nz);
  };
  let base = 0;
  for (let i = 0; i < segs; i++) {
    const a = rings[i];
    const b = rings[i + 1];
    if (axis === "x") {
      push(-hl, a.c * radius, a.s * radius, 0, a.c, a.s);
      push(hl, a.c * radius, a.s * radius, 0, a.c, a.s);
      push(hl, b.c * radius, b.s * radius, 0, b.c, b.s);
      push(-hl, b.c * radius, b.s * radius, 0, b.c, b.s);
    } else {
      push(a.c * radius, a.s * radius, -hl, a.c, a.s, 0);
      push(a.c * radius, a.s * radius, hl, a.c, a.s, 0);
      push(b.c * radius, b.s * radius, hl, b.c, b.s, 0);
      push(b.c * radius, b.s * radius, -hl, b.c, b.s, 0);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  const cap = (sign) => {
    const start = pos.length / 3;
    if (axis === "x") {
      push(sign * hl, 0, 0, sign, 0, 0);
      for (let i = 0; i <= segs; i++) {
        const r = rings[i];
        push(sign * hl, r.c * radius, r.s * radius, sign, 0, 0);
      }
    } else {
      push(0, 0, sign * hl, 0, 0, sign);
      for (let i = 0; i <= segs; i++) {
        const r = rings[i];
        push(r.c * radius, r.s * radius, sign * hl, 0, 0, sign);
      }
    }
    for (let i = 0; i < segs; i++) {
      if (sign > 0) idx.push(start, start + i + 1, start + i + 2);
      else idx.push(start, start + i + 2, start + i + 1);
    }
  };
  cap(1);
  cap(-1);
  return { pos, nrm, idx };
}

const parts = [];
function add(name, mesh, mat, t = [0, 0, 0]) {
  parts.push({ name, mesh, mat, t });
}

add("Chassis", box(1.55, 0.22, 3.55), "dark", [0, 0.52, 0]);
add("Bumper", box(1.88, 0.28, 0.22), "chrome", [0, 0.48, -2.05]);
add("SkidPlate", box(1.1, 0.08, 0.7), "chrome", [0, 0.34, -1.85]);
add("Hood", box(1.58, 0.12, 1.05), "paint", [0, 0.78, -1.42]);
add("Grille", box(1.05, 0.38, 0.08), "plastic", [0, 0.7, -1.94]);
add("GrilleBar1", box(0.06, 0.34, 0.04), "chrome", [-0.28, 0.7, -1.99]);
add("GrilleBar2", box(0.06, 0.34, 0.04), "chrome", [0, 0.7, -1.99]);
add("GrilleBar3", box(0.06, 0.34, 0.04), "chrome", [0.28, 0.7, -1.99]);
add("Headlight_L", box(0.28, 0.18, 0.08), "light", [-0.62, 0.68, -1.98]);
add("Headlight_R", box(0.28, 0.18, 0.08), "light", [0.62, 0.68, -1.98]);
add("Cab", box(1.62, 0.55, 1.22), "paint", [0, 1.08, -0.55]);
add("CabRoof", box(1.5, 0.08, 1.12), "paint", [0, 1.38, -0.52]);
add("Windshield", box(1.42, 0.42, 0.06), "glass", [0, 1.18, -1.14]);
add("Window_L", box(0.05, 0.32, 0.7), "glass", [-0.82, 1.18, -0.5]);
add("Window_R", box(0.05, 0.32, 0.7), "glass", [0.82, 1.18, -0.5]);
add("RearWindow", box(1.42, 0.32, 0.05), "glass", [0, 1.18, 0.05]);
add("BedFloor", box(1.55, 0.08, 1.7), "wood", [0, 0.72, 1.28]);
add("BedSide_L", box(0.1, 0.55, 1.7), "paint", [-0.78, 0.98, 1.28]);
add("BedSide_R", box(0.1, 0.55, 1.7), "paint", [0.78, 0.98, 1.28]);
add("Tailgate", box(1.55, 0.5, 0.1), "paint", [0, 0.96, 2.12]);
add("RollBar", box(1.5, 0.08, 0.08), "chrome", [0, 1.55, 0.22]);
add("RollPost_L", box(0.08, 0.7, 0.08), "chrome", [-0.72, 1.22, 0.22]);
add("RollPost_R", box(0.08, 0.7, 0.08), "chrome", [0.72, 1.22, 0.22]);
add("RoofLight_L", box(0.16, 0.1, 0.16), "light", [-0.38, 1.48, -0.7]);
add("RoofLight_C", box(0.16, 0.1, 0.16), "light", [0, 1.48, -0.7]);
add("RoofLight_R", box(0.16, 0.1, 0.16), "light", [0.38, 1.48, -0.7]);
add("TailLight_L", box(0.22, 0.14, 0.06), "paint", [-0.62, 0.82, 2.18]);
add("TailLight_R", box(0.22, 0.14, 0.06), "paint", [0.62, 0.82, 2.18]);

const wheel = cylinder(0.42, 0.32, 18, "x");
const hub = cylinder(0.16, 0.34, 12, "x");
const spots = [
  ["Wheel_FL", -0.82, 0.42, -1.22],
  ["Wheel_FR", 0.82, 0.42, -1.22],
  ["Wheel_RL", -0.82, 0.42, 1.18],
  ["Wheel_RR", 0.82, 0.42, 1.18],
];
for (const [name, x, y, z] of spots) {
  add(name, wheel, "rubber", [x, y, z]);
  add(name.replace("Wheel", "Hub"), hub, "chrome", [x, y, z]);
}

const matNames = Object.keys(MATS);
const materials = matNames.map((name) => {
  const m = MATS[name];
  const mat = {
    name,
    pbrMetallicRoughness: {
      baseColorFactor: m.color,
      metallicFactor: m.metal,
      roughnessFactor: m.rough,
    },
    doubleSided: true,
  };
  if (m.blend) {
    mat.alphaMode = "BLEND";
  }
  if (m.emissive) mat.emissiveFactor = m.emissive;
  return mat;
});

const binParts = [];
const accessors = [];
const bufferViews = [];
const meshes = [];
let offset = 0;

function align4(n) {
  return (n + 3) & ~3;
}

function pushAccessor(typed, type, componentType, count, min, max) {
  const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const padded = align4(bytes.length);
  const view = bufferViews.length;
  bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: bytes.length,
    target: componentType === 5123 ? 34963 : 34962,
  });
  accessors.push({
    bufferView: view,
    componentType,
    count,
    type,
    min,
    max,
  });
  binParts.push(bytes);
  if (padded > bytes.length) binParts.push(Buffer.alloc(padded - bytes.length));
  offset += padded;
  return accessors.length - 1;
}

for (const p of parts) {
  const pos = new Float32Array(p.mesh.pos);
  const nrm = new Float32Array(p.mesh.nrm);
  const idx = new Uint16Array(p.mesh.idx);
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k]);
      max[k] = Math.max(max[k], pos[i + k]);
    }
  }
  const pi = pushAccessor(pos, "VEC3", 5126, pos.length / 3, min, max);
  const ni = pushAccessor(nrm, "VEC3", 5126, nrm.length / 3);
  const ii = pushAccessor(idx, "SCALAR", 5123, idx.length);
  meshes.push({
    name: p.name,
    primitives: [
      {
        attributes: { POSITION: pi, NORMAL: ni },
        indices: ii,
        material: matNames.indexOf(p.mat),
      },
    ],
  });
}

const nodes = [
  {
    name: "TatersTruck",
    children: parts.map((_, i) => i + 1),
    translation: [0, 0, 0],
  },
];
parts.forEach((p, i) => {
  nodes.push({ name: p.name, mesh: i, translation: p.t });
});

const bin = Buffer.concat(binParts);
const json = JSON.stringify({
  asset: { version: "2.0", generator: "Tater's Trucks pickup" },
  scene: 0,
  scenes: [{ name: "Scene", nodes: [0] }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
});
const jsonBuf = Buffer.from(json);
const jsonPad = align4(jsonBuf.length);
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad - jsonBuf.length, 0x20)]);
const binPad = align4(bin.length);
const binChunk = Buffer.concat([bin, Buffer.alloc(binPad - bin.length)]);

const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
const header = Buffer.alloc(12);
header.write("glTF", 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);
const jHead = Buffer.alloc(8);
jHead.writeUInt32LE(jsonChunk.length, 0);
jHead.write("JSON", 4);
const bHead = Buffer.alloc(8);
bHead.writeUInt32LE(binChunk.length, 0);
bHead.write("BIN\0", 4);

const glb = Buffer.concat([header, jHead, jsonChunk, bHead, binChunk]);
const outDir = join(root, "public", "game");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "taters-truck.glb");
writeFileSync(out, glb);
const copy = join(root, "artifacts", "taters-truck.glb");
mkdirSync(join(root, "artifacts"), { recursive: true });
writeFileSync(copy, glb);
console.log("wrote", out, glb.length, "bytes");
