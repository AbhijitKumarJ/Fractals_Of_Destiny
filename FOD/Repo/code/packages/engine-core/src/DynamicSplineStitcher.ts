import * as THREE from 'three';
import { Vector3Tuple } from '@chronos3d/schema';
import { buildArcLengthCatmullRom } from './SplineAndStrideSolver';

export function stitchBranchSplineWaypoints(
  rawWaypoints: Vector3Tuple[],
  inheritStartPose: boolean | undefined,
  liveOrPersistedPosition?: Vector3Tuple
): {
  stitchedWaypoints: Vector3Tuple[];
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
} {
  const waypoints: Vector3Tuple[] = rawWaypoints.map((w) => [w[0], w[1], w[2]]);

  if (inheritStartPose && liveOrPersistedPosition && waypoints.length > 0) {
    const [px, py, pz] = liveOrPersistedPosition;
    const [fx, , fz] = waypoints[0];
    const horizontalDist = Math.hypot(px - fx, pz - fz);

    if (horizontalDist > 0.15) {
      waypoints.unshift([px, py, pz]);
    } else {
      waypoints[0] = [px, py, pz];
    }
  }

  const { curve, totalLength } = buildArcLengthCatmullRom(waypoints);
  return {
    stitchedWaypoints: waypoints,
    curve,
    totalLength
  };
}
