import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CompiledSceneManifest } from '@chronos3d/schema';
import {
  CameraDirectorContext,
  evaluateCameraDirectorAtTime,
  evaluateOverheadCranePose
} from '../src';

function makeShot(partial: Partial<CompiledSceneManifest['cameraShots'][number]>) {
  return {
    id: 'shot',
    label: 'Shot',
    symbolicStart: '0',
    symbolicEnd: '5',
    startTime: 0,
    endTime: 5,
    shotType: 'twoShot' as const,
    subjectId: 'actor_aria',
    side: 'right' as const,
    fov: 0,
    transitionDuration: 0,
    ...partial
  };
}

function makeManifest(
  cameraShots: CompiledSceneManifest['cameraShots']
): CompiledSceneManifest {
  return {
    id: 'test',
    title: 'Test',
    duration: 30,
    dialogue: [],
    tracks: [],
    cameraShots,
    resolutionLog: []
  };
}

function makeContext(): CameraDirectorContext {
  return {
    actorHeadPositions: new Map<string, THREE.Vector3>([
      ['actor_aria', new THREE.Vector3(-2, 1.7, 0)],
      ['actor_zephyr', new THREE.Vector3(2, 1.7, 0)]
    ]),
    actorForwards: new Map<string, THREE.Vector3>([
      ['actor_aria', new THREE.Vector3(0, 0, 1)]
    ]),
    actorSplineTangents: new Map<string, THREE.Vector3>([
      ['actor_aria', new THREE.Vector3(0, 0, 1)]
    ])
  };
}

describe('@chronos3d/engine-core — Declarative Camera Director', () => {
  it('frames a closeUp as an 85mm-style portrait in front of the subject', () => {
    const manifest = makeManifest([
      makeShot({ shotType: 'closeUp', endTime: 6 })
    ]);
    const ctx = makeContext();
    const pose = evaluateCameraDirectorAtTime(3, manifest, ctx);
    const head = ctx.actorHeadPositions.get('actor_aria')!;

    expect(pose.fov).toBe(34);
    const dist = pose.position.distanceTo(head);
    expect(dist).toBeGreaterThan(1.45);
    expect(dist).toBeLessThan(1.9);
    expect(pose.position.z).toBeGreaterThan(head.z);
  });

  it('orbits the stage center on an establishingOrbit with a stable radius', () => {
    const manifest = makeManifest([
      makeShot({ shotType: 'establishingOrbit', endTime: 10, fov: 50 })
    ]);
    const ctx = makeContext();
    const start = evaluateCameraDirectorAtTime(0.2, manifest, ctx);
    const mid = evaluateCameraDirectorAtTime(5, manifest, ctx);
    const end = evaluateCameraDirectorAtTime(9.8, manifest, ctx);

    const center = new THREE.Vector3(-0, 1.275, 0);
    const radiusStart = Math.hypot(start.position.x - center.x, start.position.z - center.z);
    const radiusEnd = Math.hypot(end.position.x - center.x, end.position.z - center.z);

    expect(start.fov).toBe(50);
    expect(start.position.y).toBeGreaterThanOrEqual(3.4);
    expect(Math.abs(radiusStart - radiusEnd)).toBeLessThan(0.01);
    expect(start.position.distanceTo(end.position)).toBeGreaterThan(1.5);
    expect(mid.position.distanceTo(end.position)).toBeGreaterThan(0.3);
  });

  it('distinguishes lead, follow, and parallel spline dolly modes', () => {
    const makeDolly = (dollyMode: 'lead' | 'follow' | 'parallel') =>
      evaluateCameraDirectorAtTime(
        1,
        makeManifest([makeShot({ shotType: 'splineDolly', dollyMode, endTime: 4 })]),
        makeContext()
      );

    const lead = makeDolly('lead');
    const follow = makeDolly('follow');
    const parallel = makeDolly('parallel');
    const head = new THREE.Vector3(-2, 1.7, 0);

    expect(lead.position.z).toBeGreaterThan(head.z + 1.5);
    expect(follow.position.z).toBeLessThan(head.z - 1.5);
    expect(Math.abs(parallel.position.x - head.x)).toBeGreaterThan(2.0);
    expect(Math.abs(follow.position.z - head.z)).toBeGreaterThan(2.0);
  });

  it('blends scrub-safely from the previous shot during transitionDuration', () => {
    const manifest = makeManifest([
      makeShot({
        id: 'shot_1',
        shotType: 'twoShot',
        startTime: 0,
        endTime: 5
      }),
      makeShot({
        id: 'shot_2',
        shotType: 'closeUp',
        startTime: 5,
        endTime: 10,
        transitionDuration: 1
      })
    ]);
    const ctx = makeContext();

    const atCut = evaluateCameraDirectorAtTime(5.0, manifest, ctx);
    const atMid = evaluateCameraDirectorAtTime(5.5, manifest, ctx);
    const atEnd = evaluateCameraDirectorAtTime(6.0, manifest, ctx);

    const prevPose = evaluateCameraDirectorAtTime(4.999, manifest, ctx);
    const finalPose = evaluateCameraDirectorAtTime(6.001, manifest, ctx);

    expect(atCut.blendWeight).toBeCloseTo(0, 1);
    expect(atMid.blendWeight).toBeCloseTo(0.5, 1);
    expect(atEnd.blendWeight).toBeCloseTo(1, 2);

    const distToFinal = atMid.position.distanceTo(finalPose.position);
    expect(distToFinal).toBeLessThan(atCut.position.distanceTo(finalPose.position));
    expect(distToFinal).toBeGreaterThan(0);
    expect(atCut.position.distanceTo(prevPose.position)).toBeLessThan(0.05);
  });

  it('attaches a deterministic overhead crane monitor pose to every shot', () => {
    const manifest = makeManifest([makeShot({ shotType: 'twoShot' })]);
    const pose = evaluateCameraDirectorAtTime(2, manifest, makeContext());

    expect(pose.overhead).toBeDefined();
    expect(pose.overhead!.fov).toBe(50);
    expect(pose.overhead!.position.y).toBeGreaterThan(6);

    const direct = evaluateOverheadCranePose(new THREE.Vector3(0, 1.275, 0), 2);
    expect(direct.position.toArray()).toEqual(pose.overhead!.position.toArray());
  });
});
