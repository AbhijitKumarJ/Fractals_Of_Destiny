import * as THREE from 'three';
import { CompiledSceneManifest, Vector3Tuple } from '@chronos3d/schema';
import { CharacterRigInstance } from './ProceduralRigBuilder';

const REST_ARM_DIR = new THREE.Vector3(0, -1, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_FORWARD = new THREE.Vector3(0, 0, 1);

const SPINE_YAW_SHARE = 0.2;
const SPINE_MAX_YAW = THREE.MathUtils.degToRad(22);
const HEAD_YAW_SHARE = 0.75;
const HEAD_MAX_YAW = THREE.MathUtils.degToRad(62);
const HEAD_MAX_PITCH = THREE.MathUtils.degToRad(32);
const EYE_MAX_YAW = THREE.MathUtils.degToRad(35);
const EYE_MAX_PITCH = THREE.MathUtils.degToRad(25);
const MAX_SPINE_LEAN = THREE.MathUtils.degToRad(9);

export interface GazeIKResult {
  spineYaw: number;
  headYaw: number;
  headPitch: number;
  eyeYawL: number;
  eyeYawR: number;
  eyePitchL: number;
  eyePitchR: number;
  blink: number;
}

function hashSeed(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function evaluateBlinkAmount(
  t: number,
  seed: number = 0,
  periodSec: number = 3.4,
  closedSec: number = 0.14
): number {
  const period = periodSec + (seed % 7) * 0.13;
  const offset = ((seed % 997) / 997) * period;
  const phase = ((t + offset) % period + period) % period;
  if (phase >= closedSec) return 0;
  return Math.sin((phase / closedSec) * Math.PI);
}

export function applyCharacterLookAtIK(
  rig: CharacterRigInstance,
  myHeadWorld: THREE.Vector3,
  targetWorld: THREE.Vector3,
  time: number = 0
): GazeIKResult {
  const rootQuat = new THREE.Quaternion();
  rig.root.getWorldQuaternion(rootQuat);
  const rootQuatInv = rootQuat.clone().invert();

  const localDir = targetWorld.clone().sub(myHeadWorld).applyQuaternion(rootQuatInv);

  const yawTotal = Math.atan2(localDir.x, localDir.z);
  const pitchTotal = -Math.atan2(localDir.y, Math.hypot(localDir.x, localDir.z));

  const spineYaw = THREE.MathUtils.clamp(yawTotal * SPINE_YAW_SHARE, -SPINE_MAX_YAW, SPINE_MAX_YAW);
  const headYaw = THREE.MathUtils.clamp(
    (yawTotal - spineYaw) * HEAD_YAW_SHARE,
    -HEAD_MAX_YAW,
    HEAD_MAX_YAW
  );
  const headPitch = THREE.MathUtils.clamp(pitchTotal * HEAD_YAW_SHARE, -HEAD_MAX_PITCH, HEAD_MAX_PITCH);

  const qSpine = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spineYaw, 0));
  rig.smoothedSpineOffset.slerp(qSpine, 0.18);
  rig.spineBone.quaternion.copy(rig.smoothedSpineOffset);

  const qHead = new THREE.Quaternion().setFromEuler(new THREE.Euler(headPitch, headYaw, 0, 'YXZ'));
  rig.smoothedHeadOffset.slerp(qHead, 0.22);
  rig.headBone.quaternion.copy(rig.smoothedHeadOffset);

  rig.root.updateMatrixWorld(true);

  const targetInHead = rig.headBone.worldToLocal(targetWorld.clone());
  const eyeYaw: [number, number] = [0, 0];
  const eyePitch: [number, number] = [0, 0];

  [rig.eyeLBone, rig.eyeRBone].forEach((eyeBone, idx) => {
    const dir = targetInHead.clone().sub(eyeBone.position);
    const yaw = THREE.MathUtils.clamp(
      Math.atan2(dir.x, Math.max(0.001, dir.z)),
      -EYE_MAX_YAW,
      EYE_MAX_YAW
    );
    const pitch = THREE.MathUtils.clamp(
      -Math.atan2(dir.y, Math.max(0.001, Math.hypot(dir.x, dir.z))),
      -EYE_MAX_PITCH,
      EYE_MAX_PITCH
    );
    eyeBone.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    eyeYaw[idx] = yaw;
    eyePitch[idx] = pitch;
  });

  const blink = evaluateBlinkAmount(time, hashSeed(rig.id));
  const eyeScaleY = 1 - 0.88 * blink;
  rig.eyeLBone.scale.y = eyeScaleY;
  rig.eyeRBone.scale.y = eyeScaleY;

  return {
    spineYaw,
    headYaw,
    headPitch,
    eyeYawL: eyeYaw[0],
    eyeYawR: eyeYaw[1],
    eyePitchL: eyePitch[0],
    eyePitchR: eyePitch[1],
    blink
  };
}

export function evaluateAutoGazeTarget(
  t: number,
  manifest: CompiledSceneManifest,
  selfId: string,
  actorHeadPositions: Map<string, THREE.Vector3>
): THREE.Vector3 | null {
  const others = Array.from(actorHeadPositions.entries()).filter(([id]) => id !== selfId);
  if (others.length === 0) return null;

  const activeLine = manifest.dialogue.find((d) => t >= d.start && t <= d.end) || null;
  if (activeLine && activeLine.speakerId !== selfId) {
    const speakerPos = actorHeadPositions.get(activeLine.speakerId);
    if (speakerPos) return speakerPos.clone();
  }

  const selfPos = actorHeadPositions.get(selfId);
  let nearest = others[0][1];
  if (selfPos) {
    let best = Infinity;
    for (const [, pos] of others) {
      const d = selfPos.distanceToSquared(pos);
      if (d < best) {
        best = d;
        nearest = pos;
      }
    }
  }
  return nearest.clone();
}

export interface TwoBoneArmIKDebugPoints {
  shoulderWorld: THREE.Vector3;
  elbowWorld: THREE.Vector3;
  wristWorld: THREE.Vector3;
  targetWorld: THREE.Vector3;
  spineLean: number;
  elbowFlexion: number;
}

export function solveAnalyticalTwoBoneArmIK(
  rig: CharacterRigInstance,
  hand: 'left' | 'right',
  targetWorld: THREE.Vector3,
  weight: number,
  poleOffset?: Vector3Tuple,
  enableSpineLean: boolean = true
): TwoBoneArmIKDebugPoints | null {
  if (weight <= 0.01) return null;

  const shoulderBone = hand === 'right' ? rig.shoulderRBone : rig.shoulderLBone;
  const forearmBone = hand === 'right' ? rig.forearmRBone : rig.forearmLBone;

  rig.root.updateMatrixWorld(true);
  const shoulderWorld = new THREE.Vector3();
  shoulderBone.getWorldPosition(shoulderWorld);

  const rootQuat = new THREE.Quaternion();
  rig.root.getWorldQuaternion(rootQuat);
  const rootQuatInv = rootQuat.clone().invert();

  const upperLen = 0.42;
  const lowerLen = 0.38;
  const maxReach = upperLen + lowerLen - 0.02;

  const toTarget = new THREE.Vector3().subVectors(targetWorld, shoulderWorld);
  const rawDist = toTarget.length();
  const dist = THREE.MathUtils.clamp(rawDist, 0.15, maxReach);
  const axis = toTarget.clone().normalize();
  const reachedTarget =
    rawDist > maxReach
      ? shoulderWorld.clone().addScaledVector(axis, maxReach)
      : targetWorld.clone();

  const poleHint = new THREE.Vector3(
    ...(poleOffset ?? (hand === 'right' ? ([0.35, -0.25, 0.2] as Vector3Tuple) : ([-0.35, -0.25, 0.2] as Vector3Tuple)))
  )
    .applyQuaternion(rootQuat)
    .normalize();
  const poleDir = poleHint.addScaledVector(axis, -poleHint.dot(axis));
  if (poleDir.lengthSq() < 1e-6) {
    poleDir.copy(new THREE.Vector3().crossVectors(axis, WORLD_UP));
    if (poleDir.lengthSq() < 1e-6) poleDir.copy(new THREE.Vector3().crossVectors(axis, WORLD_FORWARD));
  }
  poleDir.normalize();

  const cosShoulder = THREE.MathUtils.clamp(
    (upperLen * upperLen + dist * dist - lowerLen * lowerLen) / (2 * upperLen * dist),
    -1,
    1
  );
  const shoulderFlexAngle = Math.acos(cosShoulder);
  const cosElbowInterior = THREE.MathUtils.clamp(
    (upperLen * upperLen + lowerLen * lowerLen - dist * dist) / (2 * upperLen * lowerLen),
    -1,
    1
  );
  const elbowFlexion = Math.PI - Math.acos(cosElbowInterior);

  const upperDir = axis.clone().multiplyScalar(Math.cos(shoulderFlexAngle)).addScaledVector(poleDir, Math.sin(shoulderFlexAngle)).normalize();
  const upperDirLocal = upperDir.clone().applyQuaternion(rootQuatInv);

  const qShoulder = new THREE.Quaternion().setFromUnitVectors(REST_ARM_DIR, upperDirLocal);
  shoulderBone.quaternion.slerp(qShoulder, weight);

  rig.root.updateMatrixWorld(true);
  const shoulderWorldQuat = new THREE.Quaternion();
  shoulderBone.getWorldQuaternion(shoulderWorldQuat);

  const elbowWorld = shoulderWorld.clone().addScaledVector(upperDir, upperLen);
  const lowerDir = new THREE.Vector3().subVectors(reachedTarget, elbowWorld).normalize();
  const qWorldLower = new THREE.Quaternion().setFromUnitVectors(REST_ARM_DIR, lowerDir);
  const qForearm = shoulderWorldQuat.clone().invert().multiply(qWorldLower);
  forearmBone.quaternion.slerp(qForearm, weight);

  const wristWorld = elbowWorld.clone().addScaledVector(lowerDir, lowerLen);

  let spineLean = 0;
  if (enableSpineLean) {
    const overreach = THREE.MathUtils.clamp((dist / maxReach - 0.9) / 0.1, 0, 1);
    if (overreach > 0) {
      const axisLocal = axis.clone().applyQuaternion(rootQuatInv);
      spineLean = THREE.MathUtils.clamp(Math.atan2(axisLocal.z, 1.2), -MAX_SPINE_LEAN, MAX_SPINE_LEAN) * overreach * weight;
      const qLean = new THREE.Quaternion().setFromEuler(new THREE.Euler(spineLean, 0, 0));
      rig.smoothedArmLeanOffset.slerp(qLean, 0.2);
      rig.spineBone.quaternion.copy(rig.smoothedSpineOffset).multiply(rig.smoothedArmLeanOffset);
    }
  }

  return {
    shoulderWorld,
    elbowWorld,
    wristWorld,
    targetWorld: targetWorld.clone(),
    spineLean,
    elbowFlexion
  };
}

export function solveDualHandArmIK(
  rig: CharacterRigInstance,
  leftTarget: THREE.Vector3,
  rightTarget: THREE.Vector3,
  weight: number,
  leftPole?: Vector3Tuple,
  rightPole?: Vector3Tuple
): { left: TwoBoneArmIKDebugPoints | null; right: TwoBoneArmIKDebugPoints | null } {
  const right = solveAnalyticalTwoBoneArmIK(rig, 'right', rightTarget, weight, rightPole);
  const left = solveAnalyticalTwoBoneArmIK(rig, 'left', leftTarget, weight, leftPole);
  return { left, right };
}
