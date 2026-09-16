import { loadImages, type GameImages } from "./assets";
import { AudioSys } from "./audio";
import {
  EMPTY_UPGRADES,
  MAX_UPGRADE,
  PLAYER_COLORS,
  PLAY_H,
  PLAY_W,
  PRIZE,
  RACE_COUNT,
  START_MONEY,
  START_NITRO,
  STEP,
  UPGRADE_COST,
} from "./constants";
import { bakeTrack, drawHud, drawWorld, fitCanvas } from "./draw";
import { Input } from "./input";
import { assembleLayout, TEST_LOOP } from "./parts";
import { loadSave, writeSave } from "./save";
import { allFinished, makeTruck, placeTrucks, racePlace, spawnPickups, stepRace } from "./sim";
import { prepareTrack, TRACKS } from "./tracks";
import type { GameMode, Particle, Phase, Pickup, PreparedTrack, Truck, TruckColorId, UiSnap, Upgrades } from "./types";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new Input();
  audio = new AudioSys();
  imgs: GameImages | null = null;
  phase: Phase = "title";
  mode: GameMode = "champ";
  trucks: Truck[] = [];
  track: PreparedTrack | null = null;
  raceIndex = 0;
  money = START_MONEY;
  upgrades: Upgrades = { ...EMPTY_UPGRADES };
  playerColor: TruckColorId = "red";
  particles: Particle[] = [];
  pickups: Pickup[] = [];
  time = 0;
  countdown = 0;
  paused = false;
  muted = false;
  bestMoney = 0;
  trauma = 0;
  lastBeep = -1;
  acc = 0;
  raf = 0;
  lastTs = 0;
  running = false;
  onUi: ((s: UiSnap) => void) | null = null;
  cssW = 800;
  cssH = 600;
  dpr = 1;
  attractInit = false;
  playerNitro = START_NITRO;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    this.ctx = ctx;
    const save = loadSave();
    this.playerColor = save.lastColor;
    this.muted = save.muted;
    this.bestMoney = save.bestMoney;
    this.audio.setMuted(this.muted);
  }

  async start() {
    this.input.attach();
    this.installProbe();
    this.bootAttract();
    this.running = true;
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.emitUi();
    this.imgs = await loadImages();
    if (this.track && this.imgs) bakeTrack(this.track, this.imgs);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = Math.min(2, dpr);
    this.canvas.width = Math.max(1, Math.floor(cssW * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(cssH * this.dpr));
  }

  private bootAttract() {
    this.mode = "champ";
    this.raceIndex = 0;
    this.track = prepareTrack(assembleLayout(TEST_LOOP, 42));
    bakeTrack(this.track, this.imgs ?? { dirt: null, grass: null, money: null, nitro: null, title: null });
    this.trucks = [
      makeTruck(0, "red", false, 0.55),
      makeTruck(1, "yellow", false, 0.5),
      makeTruck(2, "blue", false, 0.48),
      makeTruck(3, "white", false, 0.72),
    ];
    placeTrucks(this.trucks, this.track);
    this.pickups = spawnPickups(this.track);
    this.particles = [];
    this.phase = "title";
    this.attractInit = true;
    this.countdown = 0;
    this.paused = false;
  }

  playFromTitle() {
    this.audio.unlock();
    this.mode = "champ";
    this.phase = "select";
    this.emitUi();
  }

  playTestTrack() {
    this.audio.unlock();
    this.mode = "practice";
    this.paused = false;
    this.phase = "test3d";
    this.emitUi();
  }

  playYard() {
    this.audio.unlock();
    this.paused = false;
    this.phase = "yard";
    if (this.money <= 0) this.money = START_MONEY;
    this.emitUi();
  }

  selectColor(c: TruckColorId) {
    if (!PLAYER_COLORS.includes(c)) return;
    this.playerColor = c;
    const save = loadSave();
    save.lastColor = c;
    writeSave(save);
    this.emitUi();
  }

  beginChampionship() {
    this.audio.unlock();
    this.mode = "champ";
    this.money = START_MONEY;
    this.upgrades = { ...EMPTY_UPGRADES };
    this.playerNitro = START_NITRO;
    this.raceIndex = 0;
    this.startRace();
  }

  private startRace() {
    const def =
      this.mode === "practice"
        ? assembleLayout(TEST_LOOP, (Math.random() * 1e9) | 0)
        : TRACKS[this.raceIndex % TRACKS.length];
    this.track = prepareTrack(def);
    bakeTrack(this.track, this.imgs ?? { dirt: null, grass: null, money: null, nitro: null, title: null });
    const others = PLAYER_COLORS.filter((c) => c !== this.playerColor);
    const skillBase = 0.42 + this.raceIndex * 0.06;
    this.trucks = [
      makeTruck(0, this.playerColor, true, 1),
      makeTruck(1, others[0], false, skillBase),
      makeTruck(2, others[1], false, skillBase + 0.08),
      makeTruck(3, "white", false, Math.min(0.95, skillBase + 0.28)),
    ];
    this.trucks[0].nitro = this.playerNitro;
    placeTrucks(this.trucks, this.track);
    this.pickups = spawnPickups(this.track);
    this.particles = [];
    this.time = 0;
    this.countdown = 3.2;
    this.paused = false;
    this.phase = "countdown";
    this.lastBeep = -1;
    this.emitUi();
  }

  buy(kind: "nitro" | "tires" | "shocks" | "accel" | "topSpeed") {
    const player = this.trucks.find((t) => t.isPlayer);
    if (kind === "nitro") {
      if (this.money >= UPGRADE_COST.nitro) {
        this.money -= UPGRADE_COST.nitro;
        this.playerNitro += 1;
        if (player) player.nitro = this.playerNitro;
        this.emitUi();
      }
      return;
    }
    const lvl = this.upgrades[kind];
    if (lvl >= MAX_UPGRADE) return;
    const cost = UPGRADE_COST[kind];
    if (this.money < cost) return;
    this.money -= cost;
    this.upgrades[kind] = lvl + 1;
    this.emitUi();
  }

  nextFromShop() {
    this.raceIndex += 1;
    if (this.raceIndex >= RACE_COUNT) {
      this.phase = "champion";
      if (this.money > this.bestMoney) {
        this.bestMoney = this.money;
        const save = loadSave();
        save.bestMoney = this.money;
        writeSave(save);
      }
      this.audio.finish(true);
      this.emitUi();
      return;
    }
    this.startRace();
  }

  retryRace() {
    this.startRace();
  }

  toTitle() {
    this.bootAttract();
    this.emitUi();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    const save = loadSave();
    save.muted = this.muted;
    writeSave(save);
    this.emitUi();
  }

  private tick(dt: number) {
    if (this.phase === "yard" || this.phase === "test3d") return;
    const actions = this.input.poll();
    if (this.input.muteEdge) this.toggleMute();
    if (this.input.pauseEdge && (this.phase === "racing" || this.phase === "countdown")) {
      this.paused = !this.paused;
      this.emitUi();
    }

    const racingPhases = this.phase === "racing" || this.phase === "countdown" || this.phase === "title";
    const freeze = this.paused || this.phase === "countdown" || this.phase === "select" || this.phase === "howto" || this.phase === "results" || this.phase === "shop" || this.phase === "gameover" || this.phase === "champion";

    if (this.phase === "countdown" && !this.paused) {
      const prev = this.countdown;
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastBeep && n >= 0 && n <= 3) {
        this.audio.countdown(n);
        this.lastBeep = n;
      }
      if (prev > 0 && this.countdown <= 0) {
        this.phase = "racing";
        this.countdown = 0;
        this.emitUi();
      }
    }

    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (this.track && racingPhases && !this.paused) {
        const simRacing = this.phase === "racing" || this.phase === "title";
        const act = freeze && this.phase !== "title" ? { throttle: 0, steer: 0, nitro: false, brake: 0 } : actions;
        const playerAct = this.phase === "title" ? { throttle: 0, steer: 0, nitro: false, brake: 0 } : act;
        stepRace(
          STEP,
          this.trucks,
          this.track,
          this.upgrades,
          this.phase === "title" ? { throttle: 1, steer: 0, nitro: false, brake: 0 } : playerAct,
          this.particles,
          this.pickups,
          simRacing,
          this.time,
          (e, t) => {
            if (e === "bump" && t.isPlayer) {
              this.trauma = Math.min(1, this.trauma + 0.25);
              this.audio.bump();
            }
            if (e === "land" && t.isPlayer) {
              this.trauma = Math.min(1, this.trauma + 0.18);
              this.audio.land();
            }
            if (e === "pickup") this.audio.pickup();
            if (e === "nitro") this.audio.nitro();
          },
        );
        this.time += STEP;
        if (this.phase === "title" && this.trucks.some((t) => t.finished) && this.track) {
          placeTrucks(this.trucks, this.track);
          this.pickups = spawnPickups(this.track);
        }
      }
    }

    const player = this.trucks.find((t) => t.isPlayer);
    if (this.phase === "racing" && player) {
      this.audio.engineTo(player.speed, player.nitroTimer > 0, true);
      if (allFinished(this.trucks) || player.finished) {
        // wait a beat then results
        if (player.finished || this.trucks.filter((t) => t.finished).length >= 4) {
          this.finishHeat();
        }
      }
    } else {
      this.audio.engineTo(this.phase === "title" ? 80 : 0, false, this.phase === "title");
    }

    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.draw();
  }

  private finishHeat() {
    if (this.phase !== "racing") return;
    const player = this.trucks.find((t) => t.isPlayer);
    if (!player) return;
    if (!player.finished) {
      // still racing - only end when player finished
      return;
    }
    const place = player.finishPlace || racePlace(this.trucks, player);
    player.finishPlace = place;
    const prize = this.mode === "practice" ? 0 : (PRIZE[place - 1] ?? 0);
    this.money += prize + player.cashBonus;
    this.playerNitro = player.nitro;
    this.audio.finish(place === 1);
    this.trauma = 0.4;
    if (this.mode === "practice") {
      this.phase = "results";
    } else if (place >= 4) {
      this.phase = "gameover";
    } else {
      this.phase = "results";
    }
    if (this.money > this.bestMoney) {
      this.bestMoney = this.money;
      const save = loadSave();
      save.bestMoney = this.money;
      writeSave(save);
    }
    this.emitUi();
  }

  continueFromResults() {
    this.phase = "shop";
    this.emitUi();
  }

  private draw() {
    const ctx = this.ctx;
    fitCanvas(ctx, this.cssW, this.cssH, this.dpr);
    const shakeAmt = this.trauma * this.trauma * 7;
    const shake = {
      x: (Math.random() - 0.5) * 2 * shakeAmt,
      y: (Math.random() - 0.5) * 2 * shakeAmt,
    };
    if (this.track) {
      drawWorld(
        ctx,
        this.track,
        this.trucks,
        this.particles,
        this.pickups,
        this.imgs ?? { dirt: null, grass: null, money: null, nitro: null, title: null },
        this.time,
        shake,
      );
    } else {
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(0, 0, PLAY_W, PLAY_H);
    }
    const showHud = this.phase === "racing" || this.phase === "countdown" || this.phase === "title";
    if (showHud && this.track) {
      drawHud(
        ctx,
        this.trucks,
        this.money,
        this.upgrades,
        this.phase === "title" ? "TATER'S TRUCKS" : this.track.name,
        this.raceIndex,
        RACE_COUNT,
        this.phase === "countdown" ? this.countdown : 0,
        this.paused,
      );
    } else if (this.track) {
      drawHud(ctx, this.trucks, this.money, this.upgrades, this.track.name, this.raceIndex, RACE_COUNT, 0, false);
    }
  }

  snapshot(): UiSnap {
    const player = this.trucks.find((t) => t.isPlayer);
    const standings = [...this.trucks]
      .sort((a, b) => {
        const pa = a.finishPlace || racePlace(this.trucks, a);
        const pb = b.finishPlace || racePlace(this.trucks, b);
        return pa - pb;
      })
      .map((t) => ({
        name: t.name,
        color: t.color,
        place: t.finishPlace || racePlace(this.trucks, t),
        isPlayer: t.isPlayer,
      }));
    const place = player ? player.finishPlace || racePlace(this.trucks, player) : 4;
    return {
      phase: this.phase,
      mode: this.mode,
      trackName: this.track?.name ?? "",
      raceIndex: this.raceIndex,
      raceCount: this.mode === "practice" ? 1 : RACE_COUNT,
      money: this.money,
      nitro: player?.nitro ?? START_NITRO,
      upgrades: { ...this.upgrades },
      playerColor: this.playerColor,
      standings,
      prize: PRIZE[place - 1] ?? 0,
      countdown: this.countdown,
      muted: this.muted,
      bestMoney: this.bestMoney,
      paused: this.paused,
      lap: player ? Math.min(4, player.lap + 1) : 1,
      place,
    };
  }

  emitUi() {
    this.onUi?.(this.snapshot());
  }

  installProbe() {
    const self = this;
    window.__controlsTest = {
      getYaw: () => self.trucks.find((t) => t.isPlayer)?.yaw ?? 0,
      getSpeed: () => self.trucks.find((t) => t.isPlayer)?.speed ?? 0,
      setSteer: (v: number) => {
        self.input.qaSteer = v;
      },
      setKeys: (codes: string[]) => {
        self.input.qaKeys = codes;
        if (codes.length) {
          if (!self.trucks.some((t) => t.isPlayer)) self.beginChampionship();
          self.phase = "racing";
          self.countdown = 0;
          self.paused = false;
        }
      },
    };
  }
}

