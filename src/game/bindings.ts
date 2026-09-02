export type ActionId =
  | "throttle"
  | "brake"
  | "steerLeft"
  | "steerRight"
  | "steerAxis"
  | "nitro"
  | "camera"
  | "pause";

export type Bind =
  | { t: "key"; code: string }
  | { t: "btn"; i: number }
  | { t: "axis"; i: number; sign: 1 | -1 };

export type BindMap = Record<ActionId, Bind[]>;

export const ACTION_META: { id: ActionId; label: string }[] = [
  { id: "throttle", label: "Gas" },
  { id: "brake", label: "Brake" },
  { id: "steerLeft", label: "Steer left" },
  { id: "steerRight", label: "Steer right" },
  { id: "steerAxis", label: "Steer stick" },
  { id: "nitro", label: "Nitro" },
  { id: "camera", label: "Camera" },
  { id: "pause", label: "Pause" },
];

export const DEFAULT_BINDS: BindMap = {
  throttle: [
    { t: "key", code: "KeyW" },
    { t: "key", code: "ArrowUp" },
    { t: "btn", i: 7 },
  ],
  brake: [
    { t: "key", code: "KeyS" },
    { t: "key", code: "ArrowDown" },
    { t: "btn", i: 6 },
  ],
  steerLeft: [
    { t: "key", code: "KeyA" },
    { t: "key", code: "ArrowLeft" },
    { t: "btn", i: 14 },
  ],
  steerRight: [
    { t: "key", code: "KeyD" },
    { t: "key", code: "ArrowRight" },
    { t: "btn", i: 15 },
  ],
  steerAxis: [{ t: "axis", i: 0, sign: 1 }],
  nitro: [
    { t: "key", code: "Space" },
    { t: "key", code: "KeyN" },
    { t: "btn", i: 0 },
  ],
  camera: [
    { t: "key", code: "KeyC" },
    { t: "btn", i: 3 },
  ],
  pause: [
    { t: "key", code: "Escape" },
    { t: "key", code: "KeyP" },
    { t: "btn", i: 9 },
  ],
};

const PAD_BTNS = [
  "A",
  "B",
  "X",
  "Y",
  "LB",
  "RB",
  "LT",
  "RT",
  "View",
  "Menu",
  "LS",
  "RS",
  "D-Up",
  "D-Down",
  "D-Left",
  "D-Right",
];

export function cloneBinds(src: BindMap = DEFAULT_BINDS): BindMap {
  const out = {} as BindMap;
  for (const row of ACTION_META) {
    out[row.id] = src[row.id]?.map((b) => ({ ...b })) ?? DEFAULT_BINDS[row.id].map((b) => ({ ...b }));
  }
  return out;
}

export function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code.slice(5);
  if (code === "Space") return "Space";
  if (code === "Escape") return "Esc";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
  return code;
}

export function bindLabel(b: Bind): string {
  if (b.t === "key") return keyLabel(b.code);
  if (b.t === "btn") return PAD_BTNS[b.i] ?? `Btn ${b.i}`;
  const names = ["L-stick X", "L-stick Y", "R-stick X", "R-stick Y"];
  const n = names[b.i] ?? `Axis ${b.i}`;
  if (b.i === 0 || b.i === 2) return b.sign < 0 ? `${n} left` : n;
  return b.sign < 0 ? `${n} up` : n;
}

export function isKeyBind(b: Bind): b is Extract<Bind, { t: "key" }> {
  return b.t === "key";
}

export function isPadBind(b: Bind): boolean {
  return b.t === "btn" || b.t === "axis";
}

export function sanitizeBinds(raw: unknown): BindMap {
  const base = cloneBinds();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<Record<ActionId, unknown>>;
  for (const row of ACTION_META) {
    const list = src[row.id];
    if (!Array.isArray(list)) continue;
    const next: Bind[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (o.t === "key" && typeof o.code === "string") next.push({ t: "key", code: o.code });
      if (o.t === "btn" && typeof o.i === "number") next.push({ t: "btn", i: o.i | 0 });
      if (o.t === "axis" && typeof o.i === "number") {
        const sign = o.sign === -1 ? -1 : 1;
        next.push({ t: "axis", i: o.i | 0, sign });
      }
    }
    if (next.length) base[row.id] = next;
  }
  return base;
}
