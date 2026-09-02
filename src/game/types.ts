export type TruckColorId = "red" | "yellow" | "blue" | "white";

export type Phase =
  | "title"
  | "select"
  | "howto"
  | "countdown"
  | "racing"
  | "results"
  | "shop"
  | "gameover"
  | "champion"
  | "yard"
  | "test3d";

export type GameMode = "champ" | "practice";

export type Upgrades = {
  tires: number;
  shocks: number;
  accel: number;
  topSpeed: number;
};

export type Truck = {
  id: number;
  color: TruckColorId;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vz: number;
  yaw: number;
  speed: number;
  airborne: boolean;
  nitro: number;
  nitroTimer: number;
  lap: number;
  progress: number;
  lastProgress: number;
  nextCp: number;
  finished: boolean;
  finishPlace: number;
  finishTime: number;
  cashBonus: number;
  aiSkill: number;
  aiNitroCd: number;
  stuckTime: number;
  bounce: number;
  hop: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: "dust" | "spark" | "splash" | "flame" | "smoke";
  color: string;
};

export type Pickup = {
  x: number;
  y: number;
  kind: "money" | "nitro";
  taken: boolean;
  value: number;
  phase: number;
};

export type Vec = { x: number; y: number };

export type Hill = { x: number; y: number; r: number; h: number };
export type Ramp = { x: number; y: number; angle: number; len: number; w: number; h: number };
export type Puddle = { x: number; y: number; r: number };
export type TireStack = { x: number; y: number; r: number };

/** Clockwise quarter turns: 0, 90, 180, 270. */
export type Quarter = 0 | 1 | 2 | 3;

export type PartId = "straight" | "corner";

export type PlacedPart = {
  id: PartId;
  col: number;
  row: number;
  rot: Quarter;
};

export type TrackDef = {
  id: string;
  name: string;
  blurb: string;
  path: Vec[];
  width: number;
  hills: Hill[];
  ramps: Ramp[];
  puddles: Puddle[];
  tires: TireStack[];
  pickups: { x: number; y: number; kind: "money" | "nitro" }[];
  placed?: PlacedPart[];
  originX?: number;
  originY?: number;
  wallRings?: Vec[][];
};

export type PreparedTrack = TrackDef & {
  cum: number[];
  totalLen: number;
  height: Float32Array;
  hmW: number;
  hmH: number;
  baked: HTMLCanvasElement | null;
};

export type Actions = {
  throttle: number;
  steer: number;
  nitro: boolean;
  brake: number;
};

export type UiSnap = {
  phase: Phase;
  mode: GameMode;
  trackName: string;
  raceIndex: number;
  raceCount: number;
  money: number;
  nitro: number;
  upgrades: Upgrades;
  playerColor: TruckColorId;
  standings: { name: string; color: TruckColorId; place: number; isPlayer: boolean }[];
  prize: number;
  countdown: number;
  muted: boolean;
  bestMoney: number;
  paused: boolean;
  lap: number;
  place: number;
};
