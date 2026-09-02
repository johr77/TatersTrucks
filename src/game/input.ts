import {
  cloneBinds,
  isKeyBind,
  sanitizeBinds,
  type ActionId,
  type Bind,
  type BindMap,
} from "./bindings";
import { loadSave, writeSave } from "./save";
import type { Actions } from "./types";

export type PadInfo = {
  connected: boolean;
  name: string;
  mapping: string;
  buttons: number;
};

export type PadLive = {
  pads: number;
  lx: number;
  ly: number;
  lt: number;
  rt: number;
  a: number;
  last: string;
};

export type ListenSlot = "key" | "pad";

function radial(x: number, dz = 0.18) {
  const m = Math.abs(x);
  if (m < dz) return 0;
  return ((m - dz) / (1 - dz)) * Math.sign(x);
}

function listPads(): Gamepad[] {
  const raw = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
  if (!raw) return [];
  const out: Gamepad[] = [];
  for (const p of raw) if (p) out.push(p);
  return out;
}

function pickPad(pads: Gamepad[]): Gamepad | null {
  if (!pads.length) return null;
  return pads.find((p) => p.mapping === "standard") ?? pads[0];
}

function btnVal(pad: Gamepad, i: number): number {
  const b = pad.buttons[i];
  if (!b) return 0;
  return Math.max(b.value || 0, b.pressed ? 1 : 0);
}

/** Non-standard Xbox / DirectInput often put triggers on axes 2+5 or 3+4. */
function triggerFallback(pad: Gamepad, which: "lt" | "rt"): number {
  if (pad.mapping === "standard") return 0;
  const a = pad.axes;
  if (which === "lt") {
    return Math.max(0, axisAsTrigger(a[2]), axisAsTrigger(a[3]), axisAsTrigger(a[4]));
  }
  return Math.max(0, axisAsTrigger(a[5]), axisAsTrigger(a[4]), axisAsTrigger(a[2]));
}

function axisAsTrigger(v: number | undefined): number {
  if (v == null) return 0;
  if (v >= 0) return v;
  return (v + 1) / 2;
}

export class Input {
  keys = new Set<string>();
  qaKeys: string[] | null = null;
  qaSteer: number | null = null;
  touchSteer = 0;
  touchThrottle = 0;
  touchNitro = false;
  touchBrake = 0;
  cameraEdge = false;
  pauseEdge = false;
  confirmEdge = false;
  muteEdge = false;
  uiBlock = false;
  binds: BindMap = cloneBinds();
  pad: PadInfo = { connected: false, name: "", mapping: "", buttons: 0 };
  live: PadLive = { pads: 0, lx: 0, ly: 0, lt: 0, rt: 0, a: 0, last: "" };
  listening: { action: ActionId; slot: ListenSlot } | null = null;
  onBindsChange: (() => void) | null = null;
  private nitroEdge = false;
  private prevNitro = false;
  private prevPause = false;
  private prevConfirm = false;
  private prevMute = false;
  private prevCam = false;
  private listenArmed = 0;
  private unsubs: Array<() => void> = [];
  private raf = 0;

  attach() {
    this.binds = sanitizeBinds(loadSave().binds);
    const down = (e: KeyboardEvent) => {
      if (this.shouldEatKey(e.code)) e.preventDefault();
      if (this.listening) {
        e.preventDefault();
        if (e.code === "Escape") {
          this.listening = null;
          this.onBindsChange?.();
          return;
        }
        if (this.listening.slot === "key" && performance.now() >= this.listenArmed) {
          this.applyListen({ t: "key", code: e.code });
        }
        return;
      }
      this.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => this.keys.clear();
    const wake = (ev: GamepadEvent) => {
      this.pad = {
        connected: true,
        name: ev.gamepad.id || "Controller",
        mapping: ev.gamepad.mapping || "",
        buttons: ev.gamepad.buttons.length,
      };
      this.onBindsChange?.();
    };
    const gone = () => {
      if (!listPads().length) {
        this.pad = { connected: false, name: "", mapping: "", buttons: 0 };
        this.onBindsChange?.();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    window.addEventListener("gamepadconnected", wake);
    window.addEventListener("gamepaddisconnected", gone);
    const pointerWake = () => {
      this.scanPads();
    };
    window.addEventListener("pointerdown", pointerWake);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    const loop = () => {
      this.scanPads();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.unsubs.push(
      () => window.removeEventListener("keydown", down),
      () => window.removeEventListener("keyup", up),
      () => window.removeEventListener("blur", clear),
      () => window.removeEventListener("gamepadconnected", wake),
      () => window.removeEventListener("gamepaddisconnected", gone),
      () => window.removeEventListener("pointerdown", pointerWake),
      () => cancelAnimationFrame(this.raf),
    );
  }

  detach() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  startListen(action: ActionId, slot: ListenSlot) {
    this.listening = { action, slot };
    this.listenArmed = performance.now() + 180;
    this.onBindsChange?.();
  }

  cancelListen() {
    this.listening = null;
    this.onBindsChange?.();
  }

  resetBinds() {
    this.binds = cloneBinds();
    this.persist();
    this.onBindsChange?.();
  }

  private persist() {
    const save = loadSave();
    save.binds = this.binds;
    writeSave(save);
  }

  private applyListen(bind: Bind) {
    if (!this.listening) return;
    const { action, slot } = this.listening;
    const keep = this.binds[action].filter((b) => (slot === "key" ? !isKeyBind(b) : isKeyBind(b)));
    this.binds[action] = [...keep, bind];
    this.listening = null;
    this.persist();
    this.onBindsChange?.();
  }

  private shouldEatKey(code: string): boolean {
    for (const list of Object.values(this.binds)) {
      if (list.some((b) => b.t === "key" && b.code === code)) return true;
    }
    return code === "Space" || code.startsWith("Arrow");
  }

  private held(code: string): boolean {
    if (this.qaKeys) return this.qaKeys.includes(code);
    return this.keys.has(code);
  }

  private analog(action: ActionId, pad: Gamepad | null): number {
    let v = 0;
    for (const b of this.binds[action]) {
      if (b.t === "key" && this.held(b.code)) v = Math.max(v, 1);
      if (b.t === "btn" && pad) v = Math.max(v, btnVal(pad, b.i));
      if (b.t === "axis" && pad) v = Math.max(v, Math.max(0, (pad.axes[b.i] ?? 0) * b.sign));
    }
    return v;
  }

  scanPads() {
    const pads = listPads();
    this.live.pads = pads.length;
    const pad = pickPad(pads);
    if (pad) {
      this.pad = {
        connected: true,
        name: pad.id.replace(/\s+\(.*\)$/, "") || "Controller",
        mapping: pad.mapping || "raw",
        buttons: pad.buttons.length,
      };
      this.live.lx = pad.axes[0] ?? 0;
      this.live.ly = pad.axes[1] ?? 0;
      this.live.lt = Math.max(btnVal(pad, 6), triggerFallback(pad, "lt"));
      this.live.rt = Math.max(btnVal(pad, 7), triggerFallback(pad, "rt"));
      this.live.a = btnVal(pad, 0);
      pad.buttons.forEach((b, i) => {
        if ((b.value || 0) > 0.5 || b.pressed) {
          const names = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "View", "Menu", "LS", "RS", "Up", "Down", "Left", "Right"];
          this.live.last = names[i] ?? `Btn ${i}`;
        }
      });
    } else {
      this.live.lx = 0;
      this.live.ly = 0;
      this.live.lt = 0;
      this.live.rt = 0;
      this.live.a = 0;
      if (this.pad.connected) {
        this.pad = { connected: false, name: "", mapping: "", buttons: 0 };
      }
    }
    if (this.listening) this.capturePad(pads);
  }

  private capturePad(pads: Gamepad[]) {
    if (!this.listening || this.listening.slot !== "pad") return;
    if (performance.now() < this.listenArmed) return;
    let bestBtn = { i: -1, v: 0 };
    let bestAxis = { i: -1, v: 0, sign: 1 as 1 | -1 };
    for (const pad of pads) {
      pad.buttons.forEach((btn, i) => {
        const val = Math.max(btn.value || 0, btn.pressed ? 1 : 0);
        if (val > bestBtn.v) bestBtn = { i, v: val };
      });
      pad.axes.forEach((ax, i) => {
        const mag = Math.abs(ax);
        if (mag > Math.abs(bestAxis.v)) bestAxis = { i, v: mag, sign: ax >= 0 ? 1 : -1 };
      });
    }
    if (this.listening.action === "steerAxis") {
      if (bestAxis.v > 0.55) this.applyListen({ t: "axis", i: bestAxis.i, sign: bestAxis.sign });
      return;
    }
    if (bestBtn.v > 0.55) {
      this.applyListen({ t: "btn", i: bestBtn.i });
      return;
    }
    if (bestAxis.v > 0.72) this.applyListen({ t: "axis", i: bestAxis.i, sign: bestAxis.sign });
  }

  poll(): Actions {
    const pads = listPads();
    const pad = pickPad(pads);
    if (pad) {
      this.pad = {
        connected: true,
        name: pad.id.replace(/\s+\(.*\)$/, "") || "Controller",
        mapping: pad.mapping || "raw",
        buttons: pad.buttons.length,
      };
    } else if (this.pad.connected && !pads.length) {
      this.pad = { connected: false, name: "", mapping: "", buttons: 0 };
    }

    if (this.listening) {
      this.capturePad(pads);
      return { throttle: 0, steer: 0, nitro: false, brake: 0 };
    }

    if (this.qaKeys) {
      const left = this.held("KeyA") || this.held("ArrowLeft");
      const right = this.held("KeyD") || this.held("ArrowRight");
      let steer = 0;
      if (left) steer += 1;
      if (right) steer -= 1;
      if (this.qaSteer != null) steer = this.qaSteer;
      const throttle = this.held("KeyW") || this.held("ArrowUp") ? 1 : 0;
      const brake = this.held("KeyS") || this.held("ArrowDown") ? 1 : 0;
      const nitroHeld = this.held("Space") || this.held("KeyN");
      this.nitroEdge = nitroHeld && !this.prevNitro;
      this.prevNitro = nitroHeld;
      return { throttle, steer: Math.max(-1, Math.min(1, steer)), nitro: this.nitroEdge, brake };
    }

    const blocked = this.uiBlock && !this.qaKeys;

    let steer = 0;
    if (!blocked) {
      steer += this.analog("steerLeft", pad);
      steer -= this.analog("steerRight", pad);
      if (this.qaSteer != null) steer = this.qaSteer;
      else if (!this.qaKeys && Math.abs(this.touchSteer) > 0.15) {
        steer += this.touchSteer;
      }
      if (pad && !this.qaKeys) {
        for (const b of this.binds.steerAxis) {
          if (b.t !== "axis") continue;
          steer -= radial(pad.axes[b.i] ?? 0) * b.sign;
        }
      }
    }

    let throttle = blocked ? 0 : Math.max(this.analog("throttle", pad), this.touchThrottle);
    let brake = blocked ? 0 : Math.max(this.analog("brake", pad), this.touchBrake);

    if (pad && pad.mapping !== "standard" && !this.qaKeys && !blocked) {
      if (this.analog("throttle", pad) < 0.05) throttle = Math.max(throttle, triggerFallback(pad, "rt"));
      if (this.analog("brake", pad) < 0.05) brake = Math.max(brake, triggerFallback(pad, "lt"));
    }

    const nitroHeld = blocked ? false : this.analog("nitro", pad) > 0.4 || this.touchNitro;
    this.nitroEdge = nitroHeld && !this.prevNitro;
    this.prevNitro = nitroHeld;

    const pauseHeld = this.analog("pause", pad) > 0.4;
    this.pauseEdge = pauseHeld && !this.prevPause;
    this.prevPause = pauseHeld;

    const confirmHeld = this.held("Enter");
    this.confirmEdge = confirmHeld && !this.prevConfirm;
    this.prevConfirm = confirmHeld;

    const muteHeld = this.held("KeyM");
    this.muteEdge = muteHeld && !this.prevMute;
    this.prevMute = muteHeld;

    const camHeld = blocked ? false : this.analog("camera", pad) > 0.4;
    this.cameraEdge = camHeld && !this.prevCam;
    this.prevCam = camHeld;

    return {
      throttle: Math.min(1, throttle),
      steer: Math.max(-1, Math.min(1, steer)),
      nitro: this.nitroEdge,
      brake: Math.min(1, brake),
    };
  }

  setTouchSteer(v: number) {
    this.touchSteer = v;
  }
  setTouchGas(on: boolean) {
    this.touchThrottle = on ? 1 : 0;
  }
  setTouchNitro(on: boolean) {
    this.touchNitro = on;
  }
  setTouchBrake(on: boolean) {
    this.touchBrake = on ? 1 : 0;
  }
}
