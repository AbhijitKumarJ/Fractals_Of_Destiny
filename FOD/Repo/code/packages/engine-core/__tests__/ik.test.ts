import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  applyCharacterLookAtIK,
  createCharacterRig,
  evaluateBlinkAmount,
  solveAnalyticalTwoBoneArmIK,
  solveDualHandArmIK
} from '../src';

const DEG = THREE.MathUtils.degToRad;

function settleGaze(
  rig: ReturnType<typeof createCharacterRig>,
  target: THREE.Vector3,
  iterations: number = 80
) {
  const headPos = new THREE.Vector3();
  let result = applyCharacterLookAtIK(rig, headPos, target, 0);
  rig.root.updateMatrixWorld(true);
  rig.headBone.getWorldPosition(headPos);
  for (let i = 0; i < iterations; i++) {
    result = applyCharacterLookAtIK(rig, headPos, target, 0);
    rig.root.updateMatrixWorld(true);
    rig.headBone.getWorldPosition(headPos);
  }
  return result;
}

describe('@chronos3d/engine-core — Hierarchical Gaze IK', () => {
  it('clamps the spine to 22 degrees and the head to 62 degrees of yaw', () => {
    const rig = createCharacterRig('actor_aria', '#fff', '#0ff', [0, 0, 0], 0);
    const result = settleGaze(rig, new THREE.Vector3(40, 1.7, 0));
    const degrees = (r: number) => THREE.MathUtils.radToDeg(r);

    expect(degrees(result.spineYaw)).toBeLessThanOrEqual(22.001);
    expect(degrees(result.headYaw)).toBeLessThanOrEqual(62.001);
    expect(Math.abs(degrees(result.headPitch))).toBeLessThanOrEqual(32.001);
    expect(degrees(result.headYaw)).toBeGreaterThan(40);
    expect(degrees(result.spineYaw)).toBeGreaterThan(15);
  });

  it('converges both eyes binocularly toward a near target', () => {
    const rig = createCharacterRig('actor_aria', '#fff', '#0ff', [0, 0, 0], 0);
    const result = settleGaze(rig, new THREE.Vector3(0, 1.65, 0.6));

    expect(Math.abs(THREE.MathUtils.radToDeg(result.eyeYawL))).toBeLessThanOrEqual(35.001);
    expect(Math.abs(THREE.MathUtils.radToDeg(result.eyeYawR))).toBeLessThanOrEqual(35.001);
    expect(result.eyeYawL).not.toBeCloseTo(result.eyeYawR, 4);
  });

  it('is idempotent across repeated frames (no rotation accumulation)', () => {
    const rig = createCharacterRig('actor_aria', '#fff', '#0ff', [0, 0, 0], 0);
    const target = new THREE.Vector3(2, 1.8, 2);
    settleGaze(rig, target, 60);

    const headPos = new THREE.Vector3();
    rig.headBone.getWorldPosition(headPos);
    applyCharacterLookAtIK(rig, headPos, target, 0);
    const afterFirst = rig.headBone.quaternion.clone();
    rig.headBone.getWorldPosition(headPos);
    applyCharacterLookAtIK(rig, headPos, target, 0);
    const afterSecond = rig.headBone.quaternion.clone();

    expect(afterFirst.angleTo(afterSecond)).toBeLessThan(0.01);
  });

  it('produces deterministic periodic blinks bounded to [0,1]', () => {
    const period = 3.4;
    expect(evaluateBlinkAmount(0, 0)).toBeCloseTo(0, 6);

    let peak = 0;
    for (let t = 0; t < period; t += 0.01) {
      const amount = evaluateBlinkAmount(t, 0);
      expect(amount).toBeGreaterThanOrEqual(0);
      expect(amount).toBeLessThanOrEqual(1);
      peak = Math.max(peak, amount);
    }
    expect(peak).toBeGreaterThan(0.9);
    expect(evaluateBlinkAmount(1.234, 0)).toBeCloseTo(
      evaluateBlinkAmount(1.234 + period, 0),
      5
    );
  });
});

describe('@chronos3d/engine-core — Analytical 2-Bone Arm IK', () => {
  it('places the wrist exactly on a reachable target with a downward elbow pole', () => {
    const rig = createCharacterRig('actor_aria', '#fff', '#0ff', [0, 0, 0], 0);
    const target = new THREE.Vector3(0.55, 1.3, 0.45);
    const result = solveAnalyticalTwoBoneArmIK(rig, 'right', target, 1);
    expect(result).not.toBeNull();

    expect(result!.wristWorld.distanceTo(target)).toBeLessThan(0.002);
    expect(result!.elbowWorld.y).toBeLessThan(result!.shoulderWorld.y);
    expect(result!.elbowWorld.x).toBeGreaterThan(result!.shoulderWorld.x);

    rig.root.updateMatrixWorld(true);
    const forearmWorldQuat = new THREE.Quaternion();
    rig.forearmRBone.getWorldQuaternion(forearmWorldQuat);
    const forearmDir = new THREE.Vector3(0, -1, 0).applyQuaternion(forearmWorldQuat);
    const expectedDir = new THREE.Vector3()
      .subVectors(target, result!.elbowWorld)
      .normalize();
    expect(forearmDir.dot(expectedDir)).toBeGreaterThan(0.97);
  });

  it('activates a bounded upper-spine reach lean only near maximum reach', () => {
    const near = createCharacterRig('a', '#fff', '#0ff', [0, 0, 0], 0);
    const relaxed = solveAnalyticalTwoBoneArmIK(
      near,
      'right',
      new THREE.Vector3(0.55, 1.3, 0.45),
      1
    );
    expect(relaxed!.spineLean).toBe(0);

    const far = createCharacterRig('b', '#fff', '#0ff', [0, 0, 0], 0);
    const stretched = solveAnalyticalTwoBoneArmIK(
      far,
      'right',
      new THREE.Vector3(0.55, 1.79 - 0.15, 0.745),
      1
    );
    expect(stretched!.spineLean).toBeGreaterThan(0);
    expect(Math.abs(THREE.MathUtils.radToDeg(stretched!.spineLean))).toBeLessThanOrEqual(9.001);
    expect(far.spineBone.quaternion.angleTo(far.smoothedSpineOffset)).toBeGreaterThan(0.001);
  });

  it('solves both hands simultaneously with mirrored elbows', () => {
    const rig = createCharacterRig('actor_aria', '#fff', '#0ff', [0, 0, 0], 0);
    const leftTarget = new THREE.Vector3(-0.45, 1.35, 0.5);
    const rightTarget = new THREE.Vector3(0.45, 1.35, 0.5);
    const dual = solveDualHandArmIK(rig, leftTarget, rightTarget, 1);

    expect(dual.left).not.toBeNull();
    expect(dual.right).not.toBeNull();
    expect(dual.left!.shoulderWorld.x).toBeLessThan(0);
    expect(dual.right!.shoulderWorld.x).toBeGreaterThan(0);
    expect(dual.left!.wristWorld.distanceTo(leftTarget)).toBeLessThan(0.002);
    expect(dual.right!.wristWorld.distanceTo(rightTarget)).toBeLessThan(0.002);
    expect(THREE.MathUtils.radToDeg(dual.right!.elbowFlexion)).toBeGreaterThan(5);
    expect(THREE.MathUtils.radToDeg(dual.right!.elbowFlexion)).toBeLessThan(160);
  });
});
