import type { TruckColorId, Upgrades } from "./types";

export const PLAY_W = 800;
export const PLAY_H = 480;
export const HUD_H = 84;
export const GAME_H = PLAY_H + HUD_H;
export const LAPS = 4;
export const RACE_COUNT = 8;

export const HM_W = 200;
export const HM_H = 120;

export const TRUCK_R = 13;

export const PART_SIZE = 160;
export const ROAD_W = 152;
export const ROAD_APRON = 4;
export const WALL_R = 6;

export const MAX_SPEED = 205;
export const ACCEL = 240;
export const BRAKE = 270;
export const DRAG = 0.5;
export const COAST = 1.5;
export const TURN_RATE = 4.7;
export const NITRO_TIME = 0.9;
export const NITRO_MULT = 1.58;
export const GRAVITY = 520;
export const START_MONEY = 20000;
export const START_NITRO = 4;
export const MAX_UPGRADE = 5;
export const STEP = 1 / 60;

export const PRIZE = [100000, 80000, 70000, 0] as const;

export const UPGRADE_COST = {
  nitro: 1000,
  tires: 40000,
  shocks: 60000,
  accel: 80000,
  topSpeed: 100000,
} as const;

export const TRUCK_PALETTE: Record<
  TruckColorId,
  { body: string; dark: string; light: string; name: string; driver: string }
> = {
  red: { body: "#d4322b", dark: "#7a1612", light: "#f07868", name: "Russet", driver: "Red" },
  yellow: { body: "#e0b81a", dark: "#8a6e08", light: "#f5dc6a", name: "Yukon Gold", driver: "Yellow" },
  blue: { body: "#2a62d0", dark: "#163a88", light: "#6aa0ee", name: "Blue Congo", driver: "Blue" },
  white: { body: "#ecece8", dark: "#6e6e6a", light: "#ffffff", name: "Iron Spud", driver: "White" },
};

export const EMPTY_UPGRADES: Upgrades = { tires: 0, shocks: 0, accel: 0, topSpeed: 0 };

export const PLAYER_COLORS: TruckColorId[] = ["red", "yellow", "blue"];
