import * as THREE from 'three';
import { CompiledSceneManifest } from '@chronos3d/schema';
import { smoothstep } from './SplineAndStrideSolver';

export interface EvaluatedCameraPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
  shotLabel: string;
  blendWeight: number;
  overhead?: EvaluatedCameraPose;
}

export interface CameraDirectorContext {
  actorHeadPositions: Map<string, THREE.Vector3>;
  actorForwards?: Map<string, THREE.Vector3>;
  actorSplineTangents?: Map<string, THREE.Vector3>;
  sceneCenter?: THREE.Vector3;
}

type CompiledCameraShot = CompiledSceneManifest['cameraShots'][number];

const FALLBACK_HEAD = new THREE.Vector3(0, 1.6, 0);

function getHead(ctx: CameraDirectorContext, actorId: string | undefined): THREE.Vector3 {
  if (actorId) {
    const pos = ctx.actorHeadPositions.get(actorId);
    if (pos) return pos.clone();
  }
  return FALLBACK_HEAD.clone();
}

function computeSceneCenter(ctx: CameraDirectorContext): THREE.Vector3 {
  if (ctx.sceneCenter) return ctx.sceneCenter.clone();
  const center = new THREE.Vector3();
  let count = 0;
  ctx.actorHeadPositions.forEach((pos) => {
    center.add(pos);
    count++;
  });
  if (count === 0) return new THREE.Vector3(0, 1.2, 0);
  center.divideScalar(count);
  center.y = Math.max(0.8, center.y * 0.75);
  return center;
}

function computeAxisFrame(
  subject: THREE.Vector3,
  secondary: THREE.Vector3,
  sideSign: number
): { lineDir: THREE.Vector3; sideNormal: THREE.Vector3 } {
  const lineDir = new THREE.Vector3().subVectors(secondary, subject).setY(0);
  if (lineDir.lengthSq() < 1e-6) lineDir.set(0, 0, 1);
  lineDir.normalize();
  const sideNormal = new THREE.Vector3(-lineDir.z, 0, lineDir.x)
    .multiplyScalar(sideSign)
    .normalize();
  return { lineDir, sideNormal };
}

function evaluateShotPose(
  shot: CompiledCameraShot,
  t: number,
  ctx: CameraDirectorContext
): EvaluatedCameraPose {
  const subjectHead = getHead(ctx, shot.subjectId);
  const secondaryHead = shot.secondaryId
    ? getHead(ctx, shot.secondaryId)
    : subjectHead.clone();
  const sideSign = shot.side === 'left' ? -1 : 1;
  const { sideNormal } = computeAxisFrame(subjectHead, secondaryHead, sideSign);

  const position = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let fov = shot.fov || 46;

  if (shot.shotType === 'splineDolly') {
    const tangent =
      ctx.actorSplineTangents?.get(shot.subjectId)?.clone().setY(0).normalize() ??
      ctx.actorForwards?.get(shot.subjectId)?.clone().setY(0).normalize() ??
      new THREE.Vector3(0, 0, 1);
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const mode = shot.dollyMode || 'lead';
    if (mode === 'follow') {
      position
        .copy(subjectHead)
        .addScaledVector(tangent, -3.4)
        .addScaledVector(right, 0.55);
      position.y = Math.max(1.72, subjectHead.y + 0.06);
      lookAt.copy(subjectHead).add(new THREE.Vector3(0, -0.02, 0));
    } else if (mode === 'parallel') {
      const rightSigned = right.clone().multiplyScalar(sideSign);
      position
        .copy(subjectHead)
        .addScaledVector(rightSigned, 3.0)
        .addScaledVector(tangent, 0.25);
      position.y = subjectHead.y + 0.1;
      lookAt.copy(subjectHead).add(new THREE.Vector3(0, -0.02, 0));
    } else {
      position
        .copy(subjectHead)
        .addScaledVector(tangent, 3.2)
        .addScaledVector(right, 0.5);
      position.y = Math.max(1.76, subjectHead.y + 0.08);
      lookAt.copy(subjectHead).add(new THREE.Vector3(0, -0.04, 0));
    }
  } else if (shot.shotType === 'twoShot') {
    const mid = new THREE.Vector3().lerpVectors(subjectHead, secondaryHead, 0.5);
    const sep = subjectHead.distanceTo(secondaryHead);
    position.copy(mid).addScaledVector(sideNormal, Math.max(3.2, sep * 1.15));
    position.y = Math.max(1.66, mid.y);
    lookAt.copy(mid).add(new THREE.Vector3(0, -0.02, 0));
  } else if (shot.shotType === 'closeUp') {
    const forward =
      ctx.actorForwards?.get(shot.subjectId)?.clone().setY(0).normalize() ??
      ctx.actorSplineTangents?.get(shot.subjectId)?.clone().setY(0).normalize() ??
      shotForwardFromSecondary(subjectHead, secondaryHead);
    position.copy(subjectHead).addScaledVector(forward, 1.55).addScaledVector(sideNormal, 0.18);
    position.y = subjectHead.y + 0.05;
    lookAt.copy(subjectHead).add(new THREE.Vector3(0, 0.01, 0));
    fov = shot.fov || 34;
  } else if (shot.shotType === 'establishingOrbit') {
    const center = computeSceneCenter(ctx);
    const spread = computeActorSpread(ctx);
    const radius = Math.max(5.4, spread * 2.2);
    const dur = Math.max(0.2, shot.endTime - shot.startTime);
    const u = THREE.MathUtils.clamp((t - shot.startTime) / dur, 0, 1);
    const angle0 = Math.atan2(subjectHead.x - center.x, subjectHead.z - center.z);
    const angle = angle0 + sideSign * 1.1 * u;
    position.set(
      center.x + Math.sin(angle) * radius,
      Math.max(3.4, radius * 0.62),
      center.z + Math.cos(angle) * radius
    );
    lookAt.copy(center).add(new THREE.Vector3(0, -0.15, 0));
    fov = shot.fov || 50;
  } else {
    const subj = subjectHead;
    let anchor = secondaryHead;
    if (anchor.distanceToSquared(subj) < 1e-6) {
      ctx.actorHeadPositions.forEach((pos, id) => {
        if (id !== shot.subjectId && anchor.distanceToSquared(subj) < 1e-6) {
          anchor = pos.clone();
        }
      });
    }
    const aToS = new THREE.Vector3().subVectors(subj, anchor).setY(0).normalize();
    position
      .copy(anchor)
      .addScaledVector(aToS, -1.5)
      .addScaledVector(sideNormal, 0.62);
    position.y = anchor.y - 0.02;
    lookAt.lerpVectors(anchor, subj, 0.82);
    fov = shot.fov || 35;
  }

  return {
    position,
    lookAt,
    fov,
    shotLabel: shot.label,
    blendWeight: 1
  };
}

function shotForwardFromSecondary(
  subjectHead: THREE.Vector3,
  secondaryHead: THREE.Vector3
): THREE.Vector3 {
  const forward = new THREE.Vector3().subVectors(subjectHead, secondaryHead).setY(0);
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
  return forward.normalize();
}

function computeActorSpread(ctx: CameraDirectorContext): number {
  const heads = Array.from(ctx.actorHeadPositions.values());
  let spread = 0;
  for (let i = 0; i < heads.length; i++) {
    for (let j = i + 1; j < heads.length; j++) {
      spread = Math.max(spread, heads[i].distanceTo(heads[j]));
    }
  }
  return spread;
}

function blendPoses(
  from: EvaluatedCameraPose,
  to: EvaluatedCameraPose,
  u: number
): EvaluatedCameraPose {
  return {
    position: new THREE.Vector3().lerpVectors(from.position, to.position, u),
    lookAt: new THREE.Vector3().lerpVectors(from.lookAt, to.lookAt, u),
    fov: THREE.MathUtils.lerp(from.fov, to.fov, u),
    shotLabel: to.shotLabel,
    blendWeight: u
  };
}

export function evaluateOverheadCranePose(
  sceneCenter: THREE.Vector3,
  t: number
): EvaluatedCameraPose {
  const position = sceneCenter
    .clone()
    .add(new THREE.Vector3(Math.sin(t * 0.12) * 0.8, 6.4, 4.8));
  return {
    position,
    lookAt: sceneCenter.clone().add(new THREE.Vector3(0, -0.2, 0)),
    fov: 50,
    shotLabel: 'Overhead Crane Monitor',
    blendWeight: 1
  };
}

export function evaluateCameraDirectorAtTime(
  t: number,
  manifest: CompiledSceneManifest,
  context: CameraDirectorContext
): EvaluatedCameraPose {
  const shots = manifest.cameraShots;
  if (shots.length === 0) {
    const center = computeSceneCenter(context);
    return {
      position: center.clone().add(new THREE.Vector3(0, 1.6, 4.5)),
      lookAt: center,
      fov: 44,
      shotLabel: 'No Shots (Default)',
      blendWeight: 1
    };
  }

  let activeIdx = 0;
  for (let i = 0; i < shots.length; i++) {
    if (t >= shots[i].startTime) activeIdx = i;
  }

  let pose = evaluateShotPose(shots[activeIdx], t, context);
  const activeShot = shots[activeIdx];
  const transition = activeShot.transitionDuration ?? 0;
  const intoShot = t - activeShot.startTime;

  if (activeIdx > 0 && transition > 0 && intoShot >= 0 && intoShot < transition) {
    const prevPose = evaluateShotPose(shots[activeIdx - 1], t, context);
    const u = smoothstep(intoShot / transition);
    pose = blendPoses(prevPose, pose, u);
  }

  pose.overhead = evaluateOverheadCranePose(computeSceneCenter(context), t);
  return pose;
}

export function evaluateQuadraticBezierSnapback(
  uRaw: number,
  startPos: THREE.Vector3,
  startLookAt: THREE.Vector3,
  targetDirectorPose: EvaluatedCameraPose
): { position: THREE.Vector3; lookAt: THREE.Vector3; dutchRollRad: number } {
  const u = smoothstep(uRaw);
  const midControl = new THREE.Vector3()
    .lerpVectors(startPos, targetDirectorPose.position, 0.5)
    .add(new THREE.Vector3(0, 1.15, 0.6));

  const oneMinusU = 1 - u;
  const position = new THREE.Vector3()
    .addScaledVector(startPos, oneMinusU * oneMinusU)
    .addScaledVector(midControl, 2 * oneMinusU * u)
    .addScaledVector(targetDirectorPose.position, u * u);

  const lookAt = new THREE.Vector3().lerpVectors(
    startLookAt,
    targetDirectorPose.lookAt,
    u
  );
  const dutchRollRad = Math.sin(u * Math.PI) * THREE.MathUtils.degToRad(11);

  return { position, lookAt, dutchRollRad };
}
