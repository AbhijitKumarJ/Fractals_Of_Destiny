import * as THREE from 'three';
import {
  CharacterRigInstance,
  buildArcLengthCatmullRom,
  composeBankedHeading,
  createCharacterRig,
  EMOTION_PRESETS,
  evaluateCameraDirectorAtTime,
  evaluateSkeletalClipWeights,
  evaluateSplineLocomotionAtTime,
  applyCharacterLookAtIK,
  evaluateAutoGazeTarget,
  smoothstep,
  solveAnalyticalTwoBoneArmIK,
  EvaluatedCameraPose
} from '@chronos3d/engine-core';
import {
  ALL_VISEMES,
  CompiledSceneManifest,
  EmotionPreset,
  STAGE_OBSTACLES,
  Vector3Tuple
} from '@chronos3d/schema';

const DEFAULT_WAYPOINTS: Vector3Tuple[] = [
  [-3.1, 0, -1.5],
  [-2.0, 0, 0.4],
  [-0.85, 0, 0.55]
];

const TRACK_COLOR_PALETTE = ['#38bdf8', '#10b981', '#f59e0b', '#a855f7', '#f43f5e'];

export interface SplineVisualBundle {
  tube: THREE.Mesh;
  waypointMeshes: THREE.Mesh[];
  colorHex: string;
}

export interface StageSceneBundle {
  scene: THREE.Scene;
  holoCoreMesh: THREE.Mesh<THREE.TorusKnotGeometry, THREE.MeshStandardMaterial>;
  waypointGroup: THREE.Group;
  waypointMeshes: THREE.Mesh[];
  rigsMap: Map<string, CharacterRigInstance>;
  ariaRig: CharacterRigInstance;
  zephyrRig: CharacterRigInstance;
  splineVisualsByTrackId: Map<string, SplineVisualBundle>;
  rebuildSplineTrack: (trackId: string, waypoints: Vector3Tuple[], colorHex: string) => void;
  trackColorFor: (trackId: string) => string;
  lastWaypointsJsonByTrack: Map<string, string>;
}

export function createStageScene(): StageSceneBundle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070b14');

  scene.add(new THREE.AmbientLight(0xffffff, 0.92));
  const keyLight = new THREE.PointLight('#60a5fa', 2.8, 28);
  keyLight.position.set(2, 7, 5);
  scene.add(keyLight);

  scene.add(new THREE.GridHelper(20, 20, '#1e293b', '#1e293b'));

  const pedestalMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.48, 0.95, 24),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.7 })
  );
  pedestalMesh.position.set(-0.15, 0.475, -0.45);
  scene.add(pedestalMesh);

  STAGE_OBSTACLES.forEach((ob) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ob.radius - 0.02, ob.radius + 0.02, 48),
      new THREE.MeshBasicMaterial({
        color: '#f43f5e',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ob.centerXZ[0], 0.02, ob.centerXZ[1]);
    scene.add(ring);
  });

  const holoCoreMesh: StageSceneBundle['holoCoreMesh'] = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.5, 0.16, 80, 16),
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#38bdf8',
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.8
    })
  );
  holoCoreMesh.position.set(-0.15, 1.48, -0.45);
  holoCoreMesh.scale.set(0.42, 0.42, 0.42);
  holoCoreMesh.userData.stageActorId = 'holo_core';
  scene.add(holoCoreMesh);

  const ariaRig = createCharacterRig('actor_aria', '#f1f5f9', '#38bdf8', [-3.1, 0, -1.5], 0.5);
  const zephyrRig = createCharacterRig('actor_zephyr', '#334155', '#10b981', [1.85, 0, 0.35], -1.1);
  ariaRig.root.userData.stageActorId = 'actor_aria';
  zephyrRig.root.userData.stageActorId = 'actor_zephyr';
  scene.add(ariaRig.root, zephyrRig.root);

  const rigsMap = new Map<string, CharacterRigInstance>([
    ['actor_aria', ariaRig],
    ['actor_zephyr', zephyrRig]
  ]);

  const waypointGroup = new THREE.Group();
  scene.add(waypointGroup);

  const splineVisualsByTrackId = new Map<string, SplineVisualBundle>();
  const waypointMeshes: THREE.Mesh[] = [];
  const lastWaypointsJsonByTrack = new Map<string, string>();

  const trackIndexByTrackId = new Map<string, number>();
  let nextTrackColorIdx = 0;
  const trackColorFor = (trackId: string) => {
    if (!trackIndexByTrackId.has(trackId)) {
      trackIndexByTrackId.set(trackId, nextTrackColorIdx++);
    }
    const idx = trackIndexByTrackId.get(trackId) ?? 0;
    return TRACK_COLOR_PALETTE[idx % TRACK_COLOR_PALETTE.length];
  };

  const refreshWaypointMeshes = () => {
    waypointMeshes.length = 0;
    splineVisualsByTrackId.forEach((v) => {
      v.waypointMeshes.forEach((m) => waypointMeshes.push(m));
    });
  };

  const rebuildSplineTrack = (
    trackId: string,
    waypoints: Vector3Tuple[],
    colorHex: string
  ) => {
    const existing = splineVisualsByTrackId.get(trackId);
    if (existing) {
      scene.remove(existing.tube);
      existing.tube.geometry.dispose();
      existing.waypointMeshes.forEach((m) => waypointGroup.remove(m));
    }

    const { curve } = buildArcLengthCatmullRom(waypoints);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, 0.03, 8, false),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.75 })
    );
    tube.position.y = 0.03;
    scene.add(tube);

    const wpMeshes: THREE.Mesh[] = waypoints.map((wp, idx) => {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.26, 20),
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: '#0284c7',
          emissiveIntensity: 0.8
        })
      );
      cyl.position.set(wp[0], 0.13, wp[2]);
      cyl.userData = { waypointIndex: idx, trackId };
      waypointGroup.add(cyl);
      return cyl;
    });

    splineVisualsByTrackId.set(trackId, { tube, waypointMeshes: wpMeshes, colorHex });
    refreshWaypointMeshes();
  };

  return {
    scene,
    holoCoreMesh,
    waypointGroup,
    waypointMeshes,
    rigsMap,
    ariaRig,
    zephyrRig,
    splineVisualsByTrackId,
    rebuildSplineTrack,
    trackColorFor,
    lastWaypointsJsonByTrack
  };
}

export interface StageEvalOptions {
  manifest: CompiledSceneManifest;
  t: number;
  camera: THREE.PerspectiveCamera;
  editorCameraMode: boolean;
  frameCount?: number;
  onShotLabel?: (label: string) => void;
}

export function evaluateStageAtTime(
  bundle: StageSceneBundle,
  {
    manifest,
    t,
    camera,
    editorCameraMode,
    frameCount = 1,
    onShotLabel
  }: StageEvalOptions
): EvaluatedCameraPose | null {
  const { holoCoreMesh, rigsMap, ariaRig, zephyrRig } = bundle;

  const splineTracks = manifest.tracks.filter(
    (tr) => tr.property === 'splinePath' && tr.segments && tr.segments[0]
  );

  splineTracks.forEach((track, trackIdx) => {
    const seg = track.segments![0];
    const trackId = track.id || `spline_${trackIdx}`;

    if (!trackId) return;
    const currentWaypoints = seg.waypoints || DEFAULT_WAYPOINTS;

    const wpKey = `${trackId}:${JSON.stringify(currentWaypoints)}`;
    if (wpKey !== bundle.lastWaypointsJsonByTrack.get(trackId)) {
      bundle.lastWaypointsJsonByTrack.set(trackId, wpKey);
      bundle.rebuildSplineTrack(trackId, currentWaypoints, bundle.trackColorFor(trackId));
    }
  });

  const scaleTrack = manifest.tracks.find((tr) => tr.id === 'track_core_scale');
  if (scaleTrack && scaleTrack.keyframes) {
    const kfs = scaleTrack.keyframes;
    let sVal = kfs[0].value;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (t >= kfs[i].time && t <= kfs[i + 1].time) {
        const span = Math.max(0.01, kfs[i + 1].time - kfs[i].time);
        const a = smoothstep((t - kfs[i].time) / span);
        sVal = kfs[i].value.map(
          (v: number, idx: number) => v + (kfs[i + 1].value[idx] - v) * a
        );
        break;
      } else if (t > kfs[i + 1].time) {
        sVal = kfs[i + 1].value;
      }
    }
    holoCoreMesh.scale.set(sVal[0], sVal[1], sVal[2]);
  }

  const colorTrack = manifest.tracks.find((tr) => tr.id === 'track_core_color');
  if (
    colorTrack &&
    colorTrack.keyframes &&
    holoCoreMesh.material instanceof THREE.MeshStandardMaterial
  ) {
    let activeColor = colorTrack.keyframes[0].value;
    for (let i = 0; i < colorTrack.keyframes.length; i++) {
      if (t >= colorTrack.keyframes[i].time) {
        activeColor = colorTrack.keyframes[i].value;
      }
    }
    holoCoreMesh.material.color.lerp(new THREE.Color(activeColor), 0.2);
    holoCoreMesh.material.emissive.lerp(new THREE.Color(activeColor), 0.2);
  }
  holoCoreMesh.rotation.set(t * 1.8, t * 2.6, 0);

  rigsMap.forEach((rig, charId) => {
    const clipTrack = manifest.tracks.find(
      (tr) => tr.targetId === charId && tr.property === 'animationClip'
    );

    let walkWeight = 0;
    let stridePhase = 0;
    const ownerSplineTrack = splineTracks.find((tr) => tr.targetId === charId);

    if (ownerSplineTrack) {
      const walkSeg = ownerSplineTrack.segments![0];
      const currentWaypoints = walkSeg?.waypoints || DEFAULT_WAYPOINTS;
      const { curve: walkCurve, totalLength: walkCurveLen } =
        buildArcLengthCatmullRom(currentWaypoints);

      const loco = evaluateSplineLocomotionAtTime(
        t,
        walkSeg.startTime,
        walkSeg.endTime,
        walkCurve,
        walkCurveLen,
        walkSeg.strideLength
      );
      rig.root.position.copy(loco.position);
      rig.currentSplineTangent.copy(loco.tangent);
      walkWeight = loco.walkWeight;
      stridePhase = loco.stridePhase;

      rig.smoothedHeadingQuat.slerp(
        composeBankedHeading(loco.headingYaw, loco.bankRoll),
        0.25
      );
      rig.root.quaternion.copy(rig.smoothedHeadingQuat);
    }

    const clipWeights = evaluateSkeletalClipWeights(clipTrack?.keyframes, t);
    if (clipWeights.size === 0) clipWeights.set('Idle', 1);

    rig.actions.forEach((act, name) => {
      if (name === 'Walk') {
        act.setEffectiveWeight(walkWeight);
        act.time = stridePhase * act.getClip().duration;
        return;
      }
      const weight = clipWeights.get(name) ?? 0;
      if (weight <= 0.001) {
        act.setEffectiveWeight(0);
        return;
      }
      const isUpper = name === 'Explain' || name === 'PointRight' || name === 'Wave';
      act.setEffectiveWeight(isUpper ? weight * 0.9 : weight * (1 - walkWeight));
      act.time = t % (act.getClip().duration || 1);
    });

    rig.mixer.update(0);
  });

  const ariaHeadPos = new THREE.Vector3();
  const zephyrHeadPos = new THREE.Vector3();
  ariaRig.root.updateMatrixWorld(true);
  zephyrRig.root.updateMatrixWorld(true);
  ariaRig.headBone.getWorldPosition(ariaHeadPos);
  zephyrRig.headBone.getWorldPosition(zephyrHeadPos);

  const gazeTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_gaze');
  let ariaTargetId = 'actor_zephyr';
  if (gazeTrack && gazeTrack.keyframes) {
    for (let i = 0; i < gazeTrack.keyframes.length; i++) {
      if (t >= gazeTrack.keyframes[i].time) {
        ariaTargetId = String(gazeTrack.keyframes[i].value);
      }
    }
  }

  const actorHeads = new Map<string, THREE.Vector3>([
    ['actor_aria', ariaHeadPos.clone()],
    ['actor_zephyr', zephyrHeadPos.clone()]
  ]);

  let ariaGazePos: THREE.Vector3;
  if (ariaTargetId === 'holo_core') {
    ariaGazePos = holoCoreMesh.position.clone();
  } else if (ariaTargetId === 'auto') {
    ariaGazePos = evaluateAutoGazeTarget(t, manifest, 'actor_aria', actorHeads) ?? zephyrHeadPos.clone();
  } else {
    ariaGazePos = actorHeads.get(ariaTargetId) ?? zephyrHeadPos.clone();
  }
  applyCharacterLookAtIK(ariaRig, ariaHeadPos, ariaGazePos, t);
  const zephyrGazePos =
    evaluateAutoGazeTarget(t, manifest, 'actor_zephyr', actorHeads) ?? ariaHeadPos.clone();
  applyCharacterLookAtIK(zephyrRig, zephyrHeadPos, zephyrGazePos, t);

  const armIkTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_arm_ik');
  if (armIkTrack && armIkTrack.ikKeyframes) {
    let activeIk = armIkTrack.ikKeyframes[0];
    for (let i = 0; i < armIkTrack.ikKeyframes.length; i++) {
      if (t >= armIkTrack.ikKeyframes[i].time) {
        activeIk = armIkTrack.ikKeyframes[i];
      }
    }
    if (activeIk && activeIk.target === 'holo_core' && activeIk.weight > 0) {
      const targetWorld = holoCoreMesh.position
        .clone()
        .add(new THREE.Vector3(...activeIk.surfaceOffset));
      solveAnalyticalTwoBoneArmIK(
        ariaRig,
        'right',
        targetWorld,
        activeIk.weight,
        activeIk.poleOffset
      );
    }
  }

  const emoTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_emotion');
  let activeEmotion: EmotionPreset = 'neutral';
  if (emoTrack && emoTrack.keyframes) {
    for (let i = 0; i < emoTrack.keyframes.length; i++) {
      if (t >= emoTrack.keyframes[i].time) {
        activeEmotion = emoTrack.keyframes[i].value as EmotionPreset;
      }
    }
  }
  const emoCfg = EMOTION_PRESETS[activeEmotion] || EMOTION_PRESETS.neutral;
  ariaRig.browLBone.position.y = 0.19 + emoCfg.browLift;
  ariaRig.browRBone.position.y = 0.19 + emoCfg.browLift;
  ariaRig.browLBone.rotation.z = THREE.MathUtils.degToRad(emoCfg.browTiltDeg);
  ariaRig.browRBone.rotation.z = THREE.MathUtils.degToRad(-emoCfg.browTiltDeg);

  rigsMap.forEach((rig, charId) => {
    const activeLine = manifest.dialogue.find(
      (d) => d.speakerId === charId && t >= d.start && t <= d.end
    );
    const weights: Record<string, number> = {};
    ALL_VISEMES.forEach((v: string) => {
      weights[v] = 0;
    });

    if (activeLine) {
      activeLine.visemes.forEach((cue) => {
        const center = cue.time + cue.duration * 0.5;
        const halfW = Math.max(0.035, cue.duration * 0.8);
        const dist = Math.abs(t - center);
        if (dist < halfW) {
          const norm = dist / halfW;
          const inf = (1 - norm * norm) * cue.weight;
          weights[cue.viseme] = Math.max(weights[cue.viseme] || 0, inf);
        }
      });
    }

    const smileTarget = charId === 'actor_aria' ? emoCfg.smileMorph : 0;

    rig.morphMeshes.forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!dict || !inf) return;
      ALL_VISEMES.forEach((vName: string) => {
        const idx = dict[vName];
        if (typeof idx === 'number') {
          inf[idx] = THREE.MathUtils.lerp(inf[idx], weights[vName] || 0, 0.45);
        }
      });
      const smileIdx = dict['smile'];
      if (typeof smileIdx === 'number') {
        inf[smileIdx] = THREE.MathUtils.lerp(
          inf[smileIdx],
          THREE.MathUtils.clamp(smileTarget, -1, 1),
          0.35
        );
      }
    });
  });

  let directorPose: EvaluatedCameraPose | null = null;

  if (editorCameraMode) {
    camera.position.lerp(new THREE.Vector3(0, 6.2, 5.2), 0.15);
    camera.lookAt(new THREE.Vector3(-0.4, 0.5, -0.2));
    if (frameCount % 4 === 0 && onShotLabel) {
      onShotLabel('Stage Editor Crane View (Drag Splines · Push-out Preview)');
    }
  } else {
    const actorForwards = new Map<string, THREE.Vector3>();
    rigsMap.forEach((rig, charId) => {
      const forward = new THREE.Vector3();
      rig.root.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
      else forward.normalize();
      actorForwards.set(charId, forward);
    });

    const splineTangents = new Map<string, THREE.Vector3>();
    rigsMap.forEach((rig, charId) => {
      splineTangents.set(charId, rig.currentSplineTangent.clone());
    });

    directorPose = evaluateCameraDirectorAtTime(t, manifest, {
      actorHeadPositions: actorHeads,
      actorForwards,
      actorSplineTangents: splineTangents,
      sceneCenter: new THREE.Vector3(0, 1.2, -0.2)
    });
    camera.position.lerp(directorPose.position, 0.16);
    camera.lookAt(directorPose.lookAt);
    camera.fov = THREE.MathUtils.lerp(camera.fov, directorPose.fov, 0.16);
    camera.updateProjectionMatrix();
    if (frameCount % 4 === 0 && onShotLabel) {
      onShotLabel(directorPose.shotLabel);
    }
  }

  return directorPose;
}
