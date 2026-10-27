import * as THREE from 'three';
import { Vector3Tuple } from '@chronos3d/schema';

export function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_FORWARD = new THREE.Vector3(0, 0, 1);
const GRAVITY = 9.81;
const MAX_BANK_ROLL_RAD = THREE.MathUtils.degToRad(12);

export interface EvaluatedSplineState {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  headingYaw: number;
  bankRoll: number;
  speed: number;
  walkWeight: number;
  stridePhase: number;
}

export function composeBankedHeading(
  yaw: number,
  roll: number,
  out: THREE.Quaternion = new THREE.Quaternion()
): THREE.Quaternion {
  const qYaw = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, yaw);
  const qRoll = new THREE.Quaternion().setFromAxisAngle(WORLD_FORWARD, roll);
  return out.copy(qYaw).multiply(qRoll);
}

export interface SkeletalClipWeightKeyframe {
  time: number;
  value: any;
  crossFade?: number;
}

export function evaluateSkeletalClipWeights(
  keyframes: SkeletalClipWeightKeyframe[] | undefined,
  t: number
): Map<string, number> {
  const weights = new Map<string, number>();
  if (!keyframes || keyframes.length === 0) return weights;

  let activeIdx = 0;
  for (let i = 0; i < keyframes.length; i++) {
    if (t >= keyframes[i].time) activeIdx = i;
  }

  const activeClip = String(keyframes[activeIdx].value);
  let activeWeight = 1;

  if (activeIdx > 0) {
    const fade = keyframes[activeIdx].crossFade ?? 0;
    if (fade > 0 && t < keyframes[activeIdx].time + fade) {
      const u = smoothstep((t - keyframes[activeIdx].time) / fade);
      activeWeight = u;
      const prevClip = String(keyframes[activeIdx - 1].value);
      weights.set(prevClip, (weights.get(prevClip) || 0) + (1 - u));
    }
  }

  weights.set(activeClip, (weights.get(activeClip) || 0) + activeWeight);
  return weights;
}

export function buildArcLengthCatmullRom(waypoints: Vector3Tuple[]): {
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
} {
  const pts = waypoints.map((wp) => new THREE.Vector3(wp[0], wp[1], wp[2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  curve.arcLengthDivisions = 250;
  curve.updateArcLengths();
  return { curve, totalLength: curve.getLength() };
}

export function evaluateSplineLocomotionAtTime(
  t: number,
  startTime: number,
  endTime: number,
  curve: THREE.CatmullRomCurve3,
  totalLength: number,
  strideLength: number = 1.25
): EvaluatedSplineState {
  const dur = Math.max(0.05, endTime - startTime);
  const inWalk = t >= startTime && t <= endTime;
  const rawA = Math.max(0, Math.min(1, (t - startTime) / dur));
  const u = smoothstep(rawA);

  const position = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u).normalize();
  const headingYaw = Math.atan2(tangent.x, tangent.z);

  const uNext = smoothstep(Math.min(1, (t + 0.03 - startTime) / dur));
  const speed = (Math.abs(uNext - u) * totalLength) / 0.03;

  let walkWeight = 0;
  if (inWalk) {
    walkWeight = THREE.MathUtils.clamp(speed / 0.85, 0, 1);
  }

  const curvatureDelta = 0.01;
  const uA = Math.max(0, u - curvatureDelta);
  const uB = Math.min(1, u + curvatureDelta);
  let bankRoll = 0;
  if (uB > uA) {
    const tangentA = curve.getTangentAt(uA);
    const tangentB = curve.getTangentAt(uB);
    const crossY = tangentA.x * tangentB.z - tangentA.z * tangentB.x;
    const arcSpan = Math.max(1e-4, (uB - uA) * Math.max(0.001, totalLength));
    const curvatureY = Math.asin(THREE.MathUtils.clamp(crossY, -1, 1)) / arcSpan;
    bankRoll =
      THREE.MathUtils.clamp(
        -Math.atan((speed * speed * curvatureY) / GRAVITY),
        -MAX_BANK_ROLL_RAD,
        MAX_BANK_ROLL_RAD
      ) * walkWeight;
    if (bankRoll === 0) bankRoll = 0;
  }

  const stridePhase = ((u * totalLength) / Math.max(0.2, strideLength)) % 1.0;

  return {
    position,
    tangent,
    headingYaw,
    bankRoll,
    speed,
    walkWeight,
    stridePhase
  };
}
