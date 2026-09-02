import type { BindMap } from "./bindings";
import type { TruckColorId } from "./types";

const KEY = "taters-trucks-v1";

export type SaveData = {
  version: 1;
  bestMoney: number;
  lastColor: TruckColorId;
  muted: boolean;
  binds?: BindMap;
};

const DEFAULT: SaveData = { version: 1, bestMoney: 0, lastColor: "red", muted: false };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<SaveData>;
    return {
      version: 1,
      bestMoney: typeof p.bestMoney === "number" ? p.bestMoney : 0,
      lastColor: p.lastColor === "yellow" || p.lastColor === "blue" || p.lastColor === "red" ? p.lastColor : "red",
      muted: Boolean(p.muted),
      binds: p.binds,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
