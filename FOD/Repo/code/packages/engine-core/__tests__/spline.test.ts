import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildArcLengthCatmullRom,
  composeBankedHeading,
  evaluateSkeletalClipWeights,
  evaluateSplineLocomotionAtTime
} from '../src';

describe('@chronos3d/engine-core — Arc-Length Locomotion & Banking', () => {
  it('banks into a turn and mirrors the roll sign for a mirrored path', () => {
    const rightTurn: [number, number, number][] = [
      [-2, 0, -1],
      [-1, 0, 0.4],
      [0.4, 0, 0.9],
      [1.6, 0, 0.6]
    ];
    const leftTurn: [number, number, number][] = rightTurn.map(([x, y, z]) => [-x, y, z]);

    const build = (wps: [number, number, number][]) => buildArcLengthCatmullRom(wps);
    const a = build(rightTurn);
    const b = build(leftTurn);

    const stateA = evaluateSplineLocomotionAtTime(0.6, 0, 1.2, a.curve, a.totalLength);
    const stateB = evaluateSplineLocomotionAtTime(0.6, 0, 1.2, b.curve, b.totalLength);

    expect(Math.abs(stateA.bankRoll)).toBeGreaterThan(0.002);
    expect(Math.abs(stateA.bankRoll)).toBeLessThanOrEqual(THREE.MathUtils.degToRad(12.001));
    expect(Math.sign(stateA.bankRoll)).toBe(-Math.sign(stateB.bankRoll));
  });

  it('reports zero banking and zero speed when the walk window has ended', () => {
    const { curve, totalLength } = buildArcLengthCatmullRom([
      [-2, 0, -1],
      [-1, 0, 0.4],
      [0.4, 0, 0.9]
    ]);
    const state = evaluateSplineLocomotionAtTime(10, 0, 1.5, curve, totalLength);
    expect(state.bankRoll).toBe(0);
    expect(state.speed).toBeCloseTo(0, 5);
    expect(state.walkWeight).toBe(0);
  });

  it('composes banked headings that preserve the forward axis when only roll changes', () => {
    const yawOnly = composeBankedHeading(Math.PI / 2, 0);
    const withRoll = composeBankedHeading(Math.PI / 2, THREE.MathUtils.degToRad(8));

    const yawForward = new THREE.Vector3(0, 0, 1).applyQuaternion(yawOnly);
    const rolledForward = new THREE.Vector3(0, 0, 1).applyQuaternion(withRoll);

    expect(yawForward.x).toBeCloseTo(1, 5);
    expect(rolledForward.distanceTo(yawForward)).toBeLessThan(1e-6);
  });
});

describe('@chronos3d/engine-core — Scrub-Safe Clip Crossfades', () => {
  const keyframes = [
    { time: 0, value: 'Idle' },
    { time: 2, value: 'Explain', crossFade: 0.5 },
    { time: 5, value: 'Idle' }
  ];

  it('holds a single clip outside crossfade windows', () => {
    const before = evaluateSkeletalClipWeights(keyframes, 1);
    expect(before.get('Idle')).toBe(1);

    const after = evaluateSkeletalClipWeights(keyframes, 5.2);
    expect(after.get('Idle')).toBe(1);
    expect(after.get('Explain')).toBeUndefined();
  });

  it('blends smoothly with weights that always sum to one', () => {
    for (const t of [2.0, 2.1, 2.25, 2.4, 2.5, 2.6]) {
      const weights = evaluateSkeletalClipWeights(keyframes, t);
      const sum = Array.from(weights.values()).reduce((acc, w) => acc + w, 0);
      expect(sum).toBeCloseTo(1, 6);
    }

    const mid = evaluateSkeletalClipWeights(keyframes, 2.25);
    expect(mid.get('Explain')).toBeCloseTo(0.5, 2);
    expect(mid.get('Idle')).toBeCloseTo(0.5, 2);

    const early = evaluateSkeletalClipWeights(keyframes, 2.05);
    expect(early.get('Idle')!).toBeGreaterThan(0.9);
    const late = evaluateSkeletalClipWeights(keyframes, 2.45);
    expect(late.get('Explain')!).toBeGreaterThan(0.9);
  });

  it('returns an empty map without keyframes', () => {
    expect(evaluateSkeletalClipWeights(undefined, 3).size).toBe(0);
    expect(evaluateSkeletalClipWeights([], 3).size).toBe(0);
  });
});
