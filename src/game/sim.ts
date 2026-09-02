import {
  ACCEL,
  BRAKE,
  COAST,
  DRAG,
  EMPTY_UPGRADES,
  GRAVITY,
  LAPS,
  MAX_SPEED,
  NITRO_MULT,
  NITRO_TIME,
  PLAY_H,
  PLAY_W,
  PRIZE,
  START_NITRO,
  TRUCK_PALETTE,
  TRUCK_R,
  TURN_RATE,
  WALL_R,
} from "./constants";
import { clamp, wrapPi } from "./math";
import { heightAt, inPuddle, offTrackDist, pathHeading, progressAt, samplePath, startPose } from "./tracks";
import type { Actions, Particle, Pickup, PreparedTrack, Truck, TruckColorId, Upgrades } from "./types";

export function makeTruck(id: number, color: TruckColorId, isPlayer: boolean, skill: number): Truck {
  return {
    id,
    color,
    name: TRUCK_PALETTE[color].name,
    isPlayer,
    x: 0,
    y: 0,
    z: 0,
    vz: 0,
    yaw: 0,
    speed: 0,
    airborne: false,
    nitro: isPlayer ? START_NITRO : 6,
    nitroTimer: 0,
    lap: 0,
    progress: 0,
    lastProgress: 0,
    nextCp: 1,
    finished: false,
    finishPlace: 0,
    finishTime: 0,
    cashBonus: 0,
    aiSkill: skill,
    aiNitroCd: 0,
    stuckTime: 0,
    bounce: 1,
    hop: 0,
  };
}

export function previewTruck(color: TruckColorId, x: number, y: number, yaw: number, id = 0): Truck {
  const t = makeTruck(id, color, true, 1);
  t.x = x;
  t.y = y;
  t.yaw = yaw;
  t.nitro = 0;
  return t;
}

export function placeTrucks(trucks: Truck[], track: PreparedTrack) {
  trucks.forEach((t, i) => {
    const p = startPose(track, i, trucks.length);
    t.x = p.x;
    t.y = p.y;
    t.yaw = p.yaw;
    t.z = heightAt(track, p.x, p.y);
    t.vz = 0;
    t.speed = 0;
    t.airborne = false;
    t.lap = 0;
    t.progress = progressAt(track, p.x, p.y);
    t.lastProgress = t.progress;
    t.nextCp = 1;
    t.finished = false;
    t.finishPlace = 0;
    t.finishTime = 0;
    t.cashBonus = 0;
    t.nitroTimer = 0;
    t.stuckTime = 0;
  });
}

function maxSpeedFor(t: Truck, upgrades: Upgrades, onDirt: boolean, inWater: boolean, nitro: boolean): number {
  const up = t.isPlayer ? upgrades.topSpeed : Math.round(t.aiSkill * 4);
  let m = MAX_SPEED * (1 + up * 0.12);
  if (t.color === "white") m *= 1.04;
  m *= 0.92 + t.aiSkill * 0.1;
  if (!onDirt) m *= 0.52;
  if (inWater) m *= 0.42;
  if (nitro) m *= NITRO_MULT;
  if (t.airborne) m *= 1.02;
  return m;
}

function accelFor(t: Truck, upgrades: Upgrades, nitro: boolean): number {
  const up = t.isPlayer ? upgrades.accel : Math.round(t.aiSkill * 3);
  let a = ACCEL * (1 + up * 0.14);
  if (nitro) a *= 1.85;
  return a;
}

function turnFor(t: Truck, upgrades: Upgrades): number {
  const up = t.isPlayer ? upgrades.tires : Math.round(t.aiSkill * 3);
  return TURN_RATE * (1 + up * 0.11);
}

export function spawnPickups(track: PreparedTrack): Pickup[] {
  return track.pickups.map((p, i) => ({
    x: p.x,
    y: p.y,
    kind: p.kind,
    taken: false,
    value: p.kind === "money" ? 8000 + (i % 3) * 2000 : 1,
    phase: i * 0.7,
  }));
}

function bounceOff(t: Truck, nx: number, ny: number, overlap: number): boolean {
  t.x += nx * overlap;
  t.y += ny * overlap;
  const fx = -Math.sin(t.yaw);
  const fy = -Math.cos(t.yaw);
  const vx = fx * t.speed;
  const vy = fy * t.speed;
  const vn = vx * nx + vy * ny;
  if (vn >= 0) {
    t.speed *= 0.88;
    return false;
  }
  const rest = 0.52;
  let rx = vx - (1 + rest) * vn * nx;
  let ry = vy - (1 + rest) * vn * ny;
  rx *= 0.9;
  ry *= 0.9;
  t.speed = Math.hypot(rx, ry);
  if (t.speed > 10) t.yaw = wrapPi(Math.atan2(-rx, -ry));
  if (-vn > 40) t.hop = Math.max(t.hop, 0.7);
  return -vn > 14;
}

export function stepRace(
  dt: number,
  trucks: Truck[],
  track: PreparedTrack,
  playerUp: Upgrades,
  playerActions: Actions,
  particles: Particle[],
  pickups: Pickup[],
  racing: boolean,
  time: number,
  onEvent: (e: "bump" | "land" | "pickup" | "nitro" | "finish", t: Truck) => void,
): { finishedOrder: Truck[] } {
  const wall = 16;
  const cps = [0, 0.25, 0.5, 0.75];

  for (const t of trucks) {
    if (t.finished || !racing) {
      t.speed *= Math.max(0, 1 - 3 * dt);
      continue;
    }

    let throttle = 0;
    let steer = 0;
    let wantNitro = false;
    let brake = 0;

    if (t.isPlayer) {
      throttle = playerActions.throttle;
      steer = playerActions.steer;
      wantNitro = playerActions.nitro;
      brake = playerActions.brake;
    } else {
      const look = 48 + t.speed * 0.38;
      const targetS = ((t.progress * track.totalLen + look) % track.totalLen);
      const samp = samplePath(track.path, track.cum, track.totalLen, targetS);
      const dx = samp.p.x - t.x;
      const dy = samp.p.y - t.y;
      const desired = Math.atan2(-dx, -dy);
      const err = wrapPi(desired - t.yaw);
      const gain = 2.4 + t.aiSkill * 2.2;
      steer = clamp(err * gain, -1, 1);
      throttle = 1;
      if (Math.abs(err) > 0.9) throttle = 0.72;
      t.aiNitroCd -= dt;
      const straight = Math.abs(err) < 0.22 && t.speed > 70;
      if (straight && t.nitro > 0 && t.aiNitroCd <= 0 && t.nitroTimer <= 0 && Math.random() < 0.012 + t.aiSkill * 0.01) {
        wantNitro = true;
        t.aiNitroCd = 3.2 - t.aiSkill;
      }
      // slight wobble
      steer += Math.sin(time * (1.3 + t.id) + t.id) * (0.12 - t.aiSkill * 0.08);
    }

    if (wantNitro && t.nitro > 0 && t.nitroTimer <= 0) {
      t.nitro -= 1;
      t.nitroTimer = NITRO_TIME;
      onEvent("nitro", t);
    }

    t.nitroTimer = Math.max(0, t.nitroTimer - dt);
    const nitroOn = t.nitroTimer > 0;

    const dist = offTrackDist(track, t.x, t.y);
    const onDirt = dist < track.width * 0.5 + 4;
    const puddle = inPuddle(track, t.x, t.y);
    const inWater = Boolean(puddle);
    const h = heightAt(track, t.x, t.y);

    const vmax = maxSpeedFor(t, playerUp, onDirt, inWater, nitroOn);
    const acc = accelFor(t, playerUp, nitroOn);
    const turn = turnFor(t, playerUp);
    const speedFactor = clamp(0.22 + (Math.abs(t.speed) / Math.max(40, vmax)) * 0.9, 0.22, 1);

    const reverse = t.speed >= -8 ? 1 : -1;
    t.yaw += steer * turn * speedFactor * reverse * dt;
    t.yaw = wrapPi(t.yaw);

    if (brake > 0) t.speed -= BRAKE * dt;
    else if (throttle > 0) t.speed += acc * throttle * dt;
    else t.speed -= t.speed * COAST * dt;

    t.speed -= t.speed * DRAG * dt;
    if (!onDirt) t.speed -= t.speed * 1.4 * dt;
    if (inWater) t.speed -= t.speed * 1.8 * dt;

    // slope
    const fx = -Math.sin(t.yaw);
    const fy = -Math.cos(t.yaw);
    const ahead = heightAt(track, t.x + fx * 14, t.y + fy * 14);
    const slope = (ahead - h) / 14;
    if (!t.airborne) t.speed -= slope * 90 * dt;

    t.speed = clamp(t.speed, -vmax * 0.28, vmax);

    const prevH = t.z;
    t.x += fx * t.speed * dt;
    t.y += fy * t.speed * dt;

    if (t.x < wall) {
      if (bounceOff(t, 1, 0, wall - t.x)) onEvent("bump", t);
    }
    if (t.x > PLAY_W - wall) {
      if (bounceOff(t, -1, 0, t.x - (PLAY_W - wall))) onEvent("bump", t);
    }
    if (t.y < wall) {
      if (bounceOff(t, 0, 1, wall - t.y)) onEvent("bump", t);
    }
    if (t.y > PLAY_H - wall) {
      if (bounceOff(t, 0, -1, t.y - (PLAY_H - wall))) onEvent("bump", t);
    }

    for (const tire of track.tires) {
      const d = Math.hypot(t.x - tire.x, t.y - tire.y);
      const min = TRUCK_R + (tire.r || WALL_R);
      if (d < min && d > 0.001) {
        const nx = (t.x - tire.x) / d;
        const ny = (t.y - tire.y) / d;
        if (bounceOff(t, nx, ny, min - d)) {
          onEvent("bump", t);
          if (particles.length < 220) {
            particles.push({
              x: t.x,
              y: t.y,
              vx: nx * 80 + (Math.random() - 0.5) * 40,
              vy: ny * 80 + (Math.random() - 0.5) * 40,
              life: 0.22,
              maxLife: 0.22,
              size: 2.4,
              kind: "spark",
              color: Math.random() > 0.5 ? "#ffe56a" : "#ff9a3a",
            });
          }
        }
      }
    }

    const ground = heightAt(track, t.x, t.y);
    const shocks = t.isPlayer ? playerUp.shocks : Math.round(t.aiSkill * 3);
    if (t.airborne) {
      t.vz -= GRAVITY * dt;
      t.z = Math.min(42, t.z + t.vz * dt);
      if (t.z <= ground) {
        t.z = ground;
        if (t.vz < -140 && shocks < 4) {
          t.vz = -t.vz * (0.32 - shocks * 0.04);
          if (t.vz < 28) {
            t.airborne = false;
            t.vz = 0;
          }
        } else {
          t.airborne = false;
          t.vz = 0;
        }
        t.hop = 1.25;
        onEvent("land", t);
      }
    } else {
      const rise = ground - prevH;
      t.z = ground;
      if (rise > 3.2 && t.speed > 40) {
        t.airborne = true;
        t.vz = 50 + rise * (7 - shocks * 0.7);
        t.z = ground + 2;
      } else if (rise < -5 && t.speed > 55) {
        t.airborne = true;
        t.vz = 36 + Math.min(50, t.speed * 0.12);
      }
    }

    t.hop = Math.max(0, t.hop - dt * 4);
    t.bounce = 1 + Math.sin(t.hop * Math.PI) * 0.12;

    // progress / laps
    t.lastProgress = t.progress;
    t.progress = progressAt(track, t.x, t.y);
    const wrapped = t.lastProgress > 0.8 && t.progress < 0.2;
    const target = cps[t.nextCp] ?? 0;
    if (t.nextCp > 0 && t.nextCp < 4) {
      const crossed = t.lastProgress < target && t.progress >= target;
      if (crossed) t.nextCp += 1;
      if (t.nextCp > 3) t.nextCp = 0;
    } else if (t.nextCp === 0 && wrapped) {
      t.lap += 1;
      t.nextCp = 1;
      if (t.lap >= LAPS) {
        t.finished = true;
        t.speed *= 0.4;
        onEvent("finish", t);
      }
    }

    if (Math.abs(t.speed) < 8) t.stuckTime += dt;
    else t.stuckTime = 0;
    if (t.stuckTime > 2.2 && !t.isPlayer) {
      t.yaw = pathHeading(track, t.progress);
      t.speed = 40;
      t.stuckTime = 0;
    }

    // particles
    if (onDirt && t.speed > 40 && !t.airborne && particles.length < 220 && Math.random() < 0.5) {
      particles.push({
        x: t.x - fx * 10,
        y: t.y - fy * 10,
        vx: -fx * 20 + (Math.random() - 0.5) * 40,
        vy: -fy * 20 + (Math.random() - 0.5) * 40,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        kind: "dust",
        color: "rgba(160,110,50,0.55)",
      });
    }
    if (inWater && t.speed > 20 && particles.length < 220) {
      particles.push({
        x: t.x,
        y: t.y,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        life: 0.3,
        maxLife: 0.3,
        size: 2,
        kind: "splash",
        color: "rgba(160,200,230,0.7)",
      });
    }
    if (nitroOn) {
      particles.push({
        x: t.x - fx * 14,
        y: t.y - fy * 14,
        vx: -fx * 80 + (Math.random() - 0.5) * 30,
        vy: -fy * 80 + (Math.random() - 0.5) * 30,
        life: 0.18,
        maxLife: 0.18,
        size: 4 + Math.random() * 3,
        kind: "flame",
        color: Math.random() > 0.4 ? "#ff7a18" : "#ffe56a",
      });
    }
  }

  // truck vs truck
  for (let i = 0; i < trucks.length; i++) {
    for (let j = i + 1; j < trucks.length; j++) {
      const a = trucks[i];
      const b = trucks[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = TRUCK_R * 2;
      if (d < min && d > 0.01) {
        const nx = dx / d;
        const ny = dy / d;
        const overlap = (min - d) * 0.51;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const rel = (b.speed - a.speed) * 0.12;
        a.speed += rel;
        b.speed -= rel;
        a.speed *= 0.96;
        b.speed *= 0.96;
        if (a.isPlayer || b.isPlayer) onEvent("bump", a.isPlayer ? a : b);
      }
    }
  }

  const player = trucks.find((t) => t.isPlayer);
  if (player && racing) {
    for (const p of pickups) {
      if (p.taken) continue;
      if (Math.hypot(player.x - p.x, player.y - p.y) < TRUCK_R + 12) {
        p.taken = true;
        if (p.kind === "money") player.cashBonus += p.value;
        else player.nitro += 1;
        onEvent("pickup", player);
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    if (p.life <= 0) particles.splice(i, 1);
  }

  const assigned = trucks.filter((t) => t.finishPlace > 0).length;
  let nextPlace = assigned;
  for (const t of trucks) {
    if (t.finished && t.finishPlace === 0) {
      nextPlace += 1;
      t.finishPlace = nextPlace;
      t.finishTime = time;
    }
  }

  return { finishedOrder: trucks.filter((t) => t.finished) };
}

export function racePlace(trucks: Truck[], t: Truck): number {
  if (t.finished && t.finishPlace) return t.finishPlace;
  const score = (x: Truck) => x.lap + x.progress;
  const better = trucks.filter((o) => {
    if (o === t) return false;
    if (o.finished) return true;
    return score(o) > score(t) + 0.0001;
  }).length;
  return better + 1;
}

export function allFinished(trucks: Truck[]): boolean {
  return trucks.every((t) => t.finished) || trucks.some((t) => t.isPlayer && t.finished);
}

export { EMPTY_UPGRADES, PRIZE };
