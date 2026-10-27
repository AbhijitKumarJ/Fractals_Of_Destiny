import * as THREE from 'three';
import {
  PauseCameraState,
  createInitialPauseCameraState,
  stepPauseInspectorCamera
} from '@chronos3d/engine-core';
import { evaluateQuadraticBezierSnapback } from '@chronos3d/engine-core';

export type RuntimeInspectState = 'outside' | 'inspect' | 'snapback';

export interface FrozenPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
}

export interface InspectedPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  dutchRollRad: number;
}

export interface PauseInspectorRuntime {
  enter(pose: FrozenPose): void;
  beginSnapback(): void;
  getStateLabel(): RuntimeInspectState;
  orbitHint(): string | null;
  snapProgress(): number;
  getPose(): { position: THREE.Vector3; lookAt: THREE.Vector3 };
  tick(dtSeconds: number, frozenDirectorPose: FrozenPose): InspectedPose | null;
  busy(): boolean;
  forceClear(): void;
  dispose(): void;
}

const FREE_ROAM_DRAG = 0.0032;
const ORBIT_DRAG = 0.0045;
const SNAPBACK_DURATION_SEC = 1.45;

export function createPauseInspectorRuntime(
  domElement: HTMLCanvasElement,
  opts: {
    isEnabled: () => boolean;
    getPickScene(): {
      root: THREE.Object3D;
      camera: THREE.PerspectiveCamera;
    } | null;
    onExitToSnapback: () => void;
    onEnterRequest?: () => void;
    onOrbitTarget: (actorId: string) => THREE.Vector3 | null;
  }
): PauseInspectorRuntime {
  let state: RuntimeInspectState = 'outside';
  let pauseState: PauseCameraState | null = null;
  let snapStartMs = 0;
  let snapOriginPos = new THREE.Vector3();
  let snapOriginLookAt = new THREE.Vector3();
  let orbitHintId: string | null = null;

  const pressedKeys = new Set<string>();
  const pointer = { down: false, dragged: false, lastX: 0, lastY: 0 };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const onKeyDown = (ev: KeyboardEvent) => {
    if (!opts.isEnabled()) return;
    if (ev.code === 'Escape' || (ev.code === 'KeyP' && state === 'inspect')) {
      if (state === 'inspect') {
        pressedKeys.clear();
        opts.onExitToSnapback();
        return;
      }
    }
    if (
      ev.code === 'KeyP' &&
      !ev.repeat &&
      state === 'outside' &&
      opts.onEnterRequest
    ) {
      opts.onEnterRequest();
      return;
    }
    if (
      state === 'inspect' &&
      (ev.code.startsWith('KeyW') ||
        ev.code.startsWith('KeyA') ||
        ev.code.startsWith('KeyS') ||
        ev.code.startsWith('KeyD') ||
        ev.code.startsWith('KeyQ') ||
        ev.code.startsWith('KeyE'))
    ) {
      pressedKeys.add(ev.code);
    }
  };

  const onKeyUp = (ev: KeyboardEvent) => {
    pressedKeys.delete(ev.code);
  };

  const onPointerDown = (ev: PointerEvent) => {
    if (!opts.isEnabled() || state === 'outside') return;
    pointer.down = true;
    pointer.dragged = false;
    pointer.lastX = ev.clientX;
    pointer.lastY = ev.clientY;
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!pointer.down || !pauseState) return;
    const dx = ev.clientX - pointer.lastX;
    const dy = ev.clientY - pointer.lastY;
    pointer.lastX = ev.clientX;
    pointer.lastY = ev.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 3) pointer.dragged = true;

    if (pauseState.mode === 'FREE_ROAM') {
      pauseState.freeRoamYaw -= dx * FREE_ROAM_DRAG;
      pauseState.freeRoamPitch = THREE.MathUtils.clamp(
        pauseState.freeRoamPitch - dy * FREE_ROAM_DRAG,
        -1.35,
        1.35
      );
    } else {
      pauseState.orbitAzimuth -= dx * ORBIT_DRAG;
      pauseState.orbitElevation = THREE.MathUtils.clamp(
        pauseState.orbitElevation - dy * ORBIT_DRAG,
        -0.25,
        1.25
      );
    }
  };

  const onPointerUp = (ev: PointerEvent) => {
    if (!pointer.down) return;
    pointer.down = false;
    if (pointer.dragged || state !== 'inspect' || !pauseState) return;

    const scene = opts.getPickScene();
    if (!scene || !opts.isEnabled()) return;

    const rect = domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, scene.camera);
    const hits = raycaster.intersectObject(scene.root, true);
    if (hits.length === 0) return;

    let actorId: string | null = null;
    for (const hit of hits) {
      let walker: THREE.Object3D | null = hit.object;
      while (walker) {
        const id = walker.userData?.stageActorId as string | undefined;
        if (id) {
          actorId = id;
          break;
        }
        walker = walker.parent;
      }
      if (actorId) break;
    }
    if (!actorId) return;

    const center = opts.onOrbitTarget(actorId);
    if (!center || !pauseState) return;

    let currentPos: THREE.Vector3;
    if (pauseState.mode === 'FREE_ROAM') {
      currentPos = pauseState.freeRoamPos.clone();
    } else {
      currentPos = stepPauseInspectorCamera(pauseState, pressedKeys, 0).position;
    }

    pauseState.mode = 'ORBIT_ASSET';
    pauseState.orbitTargetId = actorId;
    pauseState.orbitCenter.copy(center);
    pauseState.orbitRadius = THREE.MathUtils.clamp(currentPos.distanceTo(center), 1.1, 8.5);
    pauseState.orbitAzimuth = Math.atan2(
      currentPos.x - center.x,
      currentPos.z - center.z
    );
    pauseState.orbitElevation = 0.35;
    orbitHintId = actorId;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  return {
    enter(pose) {
      pauseState = createInitialPauseCameraState(pose.position, pose.lookAt);
      orbitHintId = null;
      pressedKeys.clear();
      state = 'inspect';
    },
    beginSnapback() {
      const pose = pauseState
        ? stepPauseInspectorCamera(pauseState, pressedKeys, 0)
        : null;
      snapOriginPos.copy(pose?.position ?? snapOriginPos);
      snapOriginLookAt.copy(pose?.lookAt ?? snapOriginLookAt);
      snapStartMs = performance.now();
      state = 'snapback';
    },
    getStateLabel() {
      return state;
    },
    orbitHint() {
      return orbitHintId;
    },
    snapProgress() {
      if (state !== 'snapback') return 0;
      const elapsed = (performance.now() - snapStartMs) / 1000;
      return Math.min(1, Math.max(0, elapsed / SNAPBACK_DURATION_SEC));
    },
    getPose() {
      if (!pauseState) return { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
      return stepPauseInspectorCamera(pauseState, pressedKeys, 0);
    },
    tick(dt, frozenDirectorPose) {
      if (state === 'outside' || !pauseState) return null;

      if (state === 'snapback') {
        const elapsed = (performance.now() - snapStartMs) / 1000;
        const u = Math.min(1, Math.max(0, elapsed / SNAPBACK_DURATION_SEC));
        const res = evaluateQuadraticBezierSnapback(
          u,
          snapOriginPos.clone(),
          snapOriginLookAt.clone(),
          {
            position: frozenDirectorPose.position,
            lookAt: frozenDirectorPose.lookAt,
            fov: frozenDirectorPose.fov ?? 44,
            shotLabel: 'ghost',
            blendWeight: 1
          }
        );
        if (u >= 1) {
          state = 'outside';
          pauseState = null;
          orbitHintId = null;
        }
        return {
          position: res.position,
          lookAt: res.lookAt,
          dutchRollRad: res.dutchRollRad
        };
      }

      const pose = stepPauseInspectorCamera(pauseState, pressedKeys, dt);
      return {
        position: pose.position,
        lookAt: pose.lookAt,
        dutchRollRad: 0
      };
    },
    busy() {
      return state !== 'outside';
    },
    forceClear() {
      state = 'outside';
      pauseState = null;
      orbitHintId = null;
      pressedKeys.clear();
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      pressedKeys.clear();
      state = 'outside';
      pauseState = null;
    }
  };
}
