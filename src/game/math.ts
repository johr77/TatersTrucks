export function clamp(n: number, a: number, b: number): number {
  return n < a ? a : n > b ? b : n;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function hypot2(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = clamp(r * (1 + k), 0, 255);
  g = clamp(g * (1 + k), 0, 255);
  b = clamp(b * (1 + k), 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function formatCash(n: number): string {
  return `$${Math.max(0, Math.round(n)).toLocaleString("en-US")}`;
}
