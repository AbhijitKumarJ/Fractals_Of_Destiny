import * as THREE from 'three';

export type PauseInspectorMode = 'FREE_ROAM' | 'ORBIT_ASSET';

export interface PauseCameraState {
  mode: PauseInspectorMode;
  freeRoamPos: THREE.Vector3;
  freeRoamYaw: number;
  freeRoamPitch: number;
  orbitTargetId: string | null;
  orbitCenter: THREE.Vector3;
  orbitRadius: number;
  orbitAzimuth: number;
  orbitElevation: number;
}

export function createInitialPauseCameraState(
  directorPos: THREE.Vector3,
  directorLookAt: THREE.Vector3
): PauseCameraState {
  const dir = new THREE.Vector3().subVectors(directorLookAt, directorPos).normalize();
  return {
    mode: 'FREE_ROAM',
    freeRoamPos: directorPos.clone(),
    freeRoamYaw: Math.atan2(dir.x, dir.z),
    freeRoamPitch: Math.asin(THREE.MathUtils.clamp(dir.y, -0.95, 0.95)),
    orbitTargetId: null,
    orbitCenter: directorLookAt.clone(),
    orbitRadius: Math.max(1.5, directorPos.distanceTo(directorLookAt)),
    orbitAzimuth: Math.atan2(
      directorPos.x - directorLookAt.x,
      directorPos.z - directorLookAt.z
    ),
    orbitElevation: 0.35
  };
}

export function stepPauseInspectorCamera(
  state: PauseCameraState,
  pressedKeys: Set<string>,
  dtSeconds: number
): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  if (state.mode === 'ORBIT_ASSET') {
    if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
      state.orbitAzimuth -= 1.6 * dtSeconds;
    }
    if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
      state.orbitAzimuth += 1.6 * dtSeconds;
    }
    if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
      state.orbitRadius = Math.max(0.85, state.orbitRadius - 2.2 * dtSeconds);
    }
    if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
      state.orbitRadius = Math.min(9.0, state.orbitRadius + 2.2 * dtSeconds);
    }

    const horiz = state.orbitRadius * Math.cos(state.orbitElevation);
    const position = new THREE.Vector3(
      state.orbitCenter.x + Math.sin(state.orbitAzimuth) * horiz,
      Math.max(0.25, state.orbitCenter.y + state.orbitRadius * Math.sin(state.orbitElevation)),
      state.orbitCenter.z + Math.cos(state.orbitAzimuth) * horiz
    );
    return { position, lookAt: state.orbitCenter.clone() };
  }

  const moveSpeed = 3.2 * dtSeconds;
  const forward = new THREE.Vector3(
    Math.sin(state.freeRoamYaw),
    0,
    Math.cos(state.freeRoamYaw)
  ).normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();

  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) {
    state.freeRoamPos.addScaledVector(forward, moveSpeed);
  }
  if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) {
    state.freeRoamPos.addScaledVector(forward, -moveSpeed);
  }
  if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) {
    state.freeRoamPos.addScaledVector(right, -moveSpeed);
  }
  if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) {
    state.freeRoamPos.addScaledVector(right, moveSpeed);
  }
  if (pressedKeys.has('KeyE')) {
    state.freeRoamPos.y = Math.min(6.0, state.freeRoamPos.y + moveSpeed * 0.75);
  }
  if (pressedKeys.has('KeyQ')) {
    state.freeRoamPos.y = Math.max(0.25, state.freeRoamPos.y - moveSpeed * 0.75);
  }

  const lookDir = new THREE.Vector3(
    Math.sin(state.freeRoamYaw) * Math.cos(state.freeRoamPitch),
    Math.sin(state.freeRoamPitch),
    Math.cos(state.freeRoamYaw) * Math.cos(state.freeRoamPitch)
  );
  const lookAt = state.freeRoamPos.clone().add(lookDir);

  return { position: state.freeRoamPos.clone(), lookAt };
}
