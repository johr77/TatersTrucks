import * as THREE from "three";

export type CamMode = "top" | "chase" | "orbit" | "hood";

export const CAM_CYCLE: CamMode[] = ["top", "chase", "orbit", "hood"];

export const CAM_LABEL: Record<CamMode, string> = {
  top: "Top down",
  chase: "Chase",
  orbit: "Orbit",
  hood: "Hood",
};

export type OrbitState = { theta: number; phi: number };

const desired = new THREE.Vector3();
const look = new THREE.Vector3();
const fwd = new THREE.Vector3();

export function nextCam(mode: CamMode): CamMode {
  return CAM_CYCLE[(CAM_CYCLE.indexOf(mode) + 1) % CAM_CYCLE.length];
}

export function applyCamera(
  camera: THREE.Camera,
  mode: CamMode,
  x: number,
  z: number,
  yaw: number,
  dt: number,
  orbit: OrbitState,
  snap = false,
) {
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  const y = 0;
  look.set(x, y + 0.7, z);

  if (mode === "top") {
    desired.set(x, 86, z);
    look.set(x, 0, z);
  } else if (mode === "chase") {
    desired.set(x - fwd.x * 11, 5.2, z - fwd.z * 11);
    look.set(x + fwd.x * 4, y + 1.0, z + fwd.z * 4);
  } else if (mode === "orbit") {
    const cp = Math.cos(orbit.phi);
    const sp = Math.sin(orbit.phi);
    const dist = 16;
    desired.set(x + Math.sin(orbit.theta) * cp * dist, 2.8 + sp * dist, z + Math.cos(orbit.theta) * cp * dist);
  } else {
    desired.set(x + fwd.x * 0.85, 1.42, z + fwd.z * 0.85);
    look.set(x + fwd.x * 14, 1.15, z + fwd.z * 14);
  }

  const k = mode === "hood" || snap ? 1 : 1 - Math.pow(0.001, dt);
  if (snap || camera.position.distanceToSquared(desired) > 900) camera.position.copy(desired);
  else camera.position.lerp(desired, k);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = mode === "hood" ? 68 : mode === "top" ? 48 : 55;
    camera.updateProjectionMatrix();
  }
  camera.lookAt(look);
}

export function nudgeOrbit(orbit: OrbitState, dx: number, dy: number) {
  orbit.theta -= dx * 0.012;
  orbit.phi = clampPhi(orbit.phi + dy * 0.01);
}

function clampPhi(p: number) {
  return Math.max(0.12, Math.min(1.15, p));
}
