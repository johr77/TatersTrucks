import { boxWalls, type WallSeg, type Zone } from "./drive";

export type Building = {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
  accent: string;
};

export const SHOP_YARD = {
  name: "Spud Yard",
  spawn: { x: 0, z: 16.5, yaw: 0 },
  ground: { w: 72, d: 56 },
  buildings: [
    {
      id: "tires",
      name: "TIRE BARN",
      x: -12.5,
      z: -8,
      w: 9,
      d: 11,
      h: 5.2,
      color: "#6a4030",
      accent: "#c4783a",
    },
    {
      id: "nitro",
      name: "NITRO SHED",
      x: 12.5,
      z: -8,
      w: 9,
      d: 11,
      h: 4.6,
      color: "#3a4a38",
      accent: "#e07a28",
    },
  ] as Building[],
  shops: [
    { id: "tires", x: -10, z: 3.5, r: 6.5, hint: "Tire Barn — pull in to shop" },
    { id: "nitro", x: 10, z: 3.5, r: 6.5, hint: "Nitro Shed — pull in to shop" },
  ] as Zone[],
  exit: { x: 0, z: -24, r: 5.5, id: "exit", hint: "Head out to leave" } as Zone,
};

export function shopWalls(): WallSeg[] {
  const g = SHOP_YARD.ground;
  return [
    { ax: -g.w / 2, az: -g.d / 2, bx: -4, bz: -g.d / 2 },
    { ax: 4, az: -g.d / 2, bx: g.w / 2, bz: -g.d / 2 },
    { ax: -g.w / 2, az: g.d / 2, bx: -4, bz: g.d / 2 },
    { ax: 4, az: g.d / 2, bx: g.w / 2, bz: g.d / 2 },
    { ax: -g.w / 2, az: -g.d / 2, bx: -g.w / 2, bz: g.d / 2 },
    { ax: g.w / 2, az: -g.d / 2, bx: g.w / 2, bz: g.d / 2 },
    ...SHOP_YARD.buildings.flatMap((b) => boxWalls(b.x, b.z, b.w + 0.35, b.d + 0.35)),
  ];
}

export function shopWallBoxes() {
  const g = SHOP_YARD.ground;
  const h = 2.75;
  const t = 0.55;
  return [
    { x: -g.w / 4 - 2, z: -g.d / 2, w: g.w / 2 - 4, d: t, h },
    { x: g.w / 4 + 2, z: -g.d / 2, w: g.w / 2 - 4, d: t, h },
    { x: -g.w / 4 - 2, z: g.d / 2, w: g.w / 2 - 4, d: t, h },
    { x: g.w / 4 + 2, z: g.d / 2, w: g.w / 2 - 4, d: t, h },
    { x: -g.w / 2, z: 0, w: t, d: g.d, h },
    { x: g.w / 2, z: 0, w: t, d: g.d, h },
  ];
}
