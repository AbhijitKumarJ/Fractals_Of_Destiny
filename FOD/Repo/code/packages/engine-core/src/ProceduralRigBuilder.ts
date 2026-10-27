import * as THREE from 'three';
import { ALL_VISEMES, EmotionPreset, Vector3Tuple } from '@chronos3d/schema';

export interface CharacterRigInstance {
  id: string;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  morphMeshes: THREE.Mesh[];
  hipsBone: THREE.Bone;
  spineBone: THREE.Bone;
  headBone: THREE.Bone;
  browLBone: THREE.Bone;
  browRBone: THREE.Bone;
  shoulderLBone: THREE.Bone;
  forearmLBone: THREE.Bone;
  shoulderRBone: THREE.Bone;
  forearmRBone: THREE.Bone;
  eyeLBone: THREE.Bone;
  eyeRBone: THREE.Bone;
  smoothedHeadingQuat: THREE.Quaternion;
  smoothedHeadOffset: THREE.Quaternion;
  smoothedSpineOffset: THREE.Quaternion;
  smoothedArmLeanOffset: THREE.Quaternion;
  currentSplineTangent: THREE.Vector3;
}

export const EMOTION_PRESETS: Record<
  EmotionPreset,
  { browLift: number; browTiltDeg: number; smileMorph: number }
> = {
  neutral: { browLift: 0.0, browTiltDeg: 0, smileMorph: 0.0 },
  happy: { browLift: 0.03, browTiltDeg: -6, smileMorph: 0.85 },
  concerned: { browLift: 0.04, browTiltDeg: 16, smileMorph: -0.6 },
  surprised: { browLift: 0.075, browTiltDeg: -4, smileMorph: 0.1 },
  focused: { browLift: -0.035, browTiltDeg: -12, smileMorph: -0.2 },
  determined: { browLift: -0.05, browTiltDeg: -18, smileMorph: -0.45 }
};

export function createCharacterRig(
  id: string,
  color: string,
  accentColor: string,
  initPos: Vector3Tuple,
  initRotY: number
): CharacterRigInstance {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(...initPos);
  root.rotation.set(0, initRotY, 0);

  const hipsBone = new THREE.Bone();
  hipsBone.name = 'Hips';
  hipsBone.position.set(0, 1.02, 0);
  root.add(hipsBone);

  const spineBone = new THREE.Bone();
  spineBone.name = 'Spine';
  spineBone.position.set(0, 0.35, 0);
  hipsBone.add(spineBone);

  const headBone = new THREE.Bone();
  headBone.name = 'Head';
  headBone.position.set(0, 0.72, 0);
  spineBone.add(headBone);

  const browLBone = new THREE.Bone();
  browLBone.name = 'BrowL';
  browLBone.position.set(-0.14, 0.19, 0.31);
  headBone.add(browLBone);

  const browRBone = new THREE.Bone();
  browRBone.name = 'BrowR';
  browRBone.position.set(0.14, 0.19, 0.31);
  headBone.add(browRBone);

  const shoulderLBone = new THREE.Bone();
  shoulderLBone.name = 'ShoulderL';
  shoulderLBone.position.set(-0.55, 0.42, 0);
  spineBone.add(shoulderLBone);

  const forearmLBone = new THREE.Bone();
  forearmLBone.name = 'ForearmL';
  forearmLBone.position.set(-0.18, -0.4, 0);
  shoulderLBone.add(forearmLBone);

  const shoulderRBone = new THREE.Bone();
  shoulderRBone.name = 'ShoulderR';
  shoulderRBone.position.set(0.55, 0.42, 0);
  spineBone.add(shoulderRBone);

  const forearmRBone = new THREE.Bone();
  forearmRBone.name = 'ForearmR';
  forearmRBone.position.set(0.18, -0.4, 0);
  shoulderRBone.add(forearmRBone);

  const eyeLBone = new THREE.Bone();
  eyeLBone.name = 'EyeL';
  eyeLBone.position.set(-0.13, 0.05, 0.3);
  headBone.add(eyeLBone);

  const eyeRBone = new THREE.Bone();
  eyeRBone.name = 'EyeR';
  eyeRBone.position.set(0.13, 0.05, 0.3);
  headBone.add(eyeRBone);

  const thighLBone = new THREE.Bone();
  thighLBone.name = 'ThighL';
  thighLBone.position.set(-0.24, -0.08, 0);
  hipsBone.add(thighLBone);

  const shinLBone = new THREE.Bone();
  shinLBone.name = 'ShinL';
  shinLBone.position.set(0, -0.46, 0);
  thighLBone.add(shinLBone);

  const thighRBone = new THREE.Bone();
  thighRBone.name = 'ThighR';
  thighRBone.position.set(0.24, -0.08, 0);
  hipsBone.add(thighRBone);

  const shinRBone = new THREE.Bone();
  shinRBone.name = 'ShinR';
  shinRBone.position.set(0, -0.46, 0);
  thighRBone.add(shinRBone);

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.45
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.45,
    metalness: 0.65
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.65
  });

  hipsBone.add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.42), darkMat));

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.88, 0.46), bodyMat);
  torsoMesh.position.set(0, 0.14, 0);
  spineBone.add(torsoMesh);

  const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.06), accentMat);
  chestBadge.position.set(0, 0.28, 0.24);
  spineBone.add(chestBadge);

  const upperArmGeo = new THREE.CapsuleGeometry(0.11, 0.34, 8, 16);
  const armL = new THREE.Mesh(upperArmGeo, darkMat);
  armL.position.set(-0.1, -0.18, 0);
  shoulderLBone.add(armL);

  const handL = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.32, 8, 16), bodyMat);
  handL.position.set(0, -0.18, 0.05);
  forearmLBone.add(handL);

  const armR = new THREE.Mesh(upperArmGeo, darkMat);
  armR.position.set(0.1, -0.18, 0);
  shoulderRBone.add(armR);

  const handR = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.32, 8, 16), bodyMat);
  handR.position.set(0, -0.18, 0.05);
  forearmRBone.add(handR);

  const thighGeo = new THREE.CapsuleGeometry(0.13, 0.34, 8, 16);
  const shinGeo = new THREE.CapsuleGeometry(0.105, 0.38, 8, 16);

  const thighLMesh = new THREE.Mesh(thighGeo, darkMat);
  thighLMesh.position.set(0, -0.22, 0);
  thighLBone.add(thighLMesh);

  const shinLMesh = new THREE.Mesh(shinGeo, bodyMat);
  shinLMesh.position.set(0, -0.22, 0);
  shinLBone.add(shinLMesh);

  const thighRMesh = new THREE.Mesh(thighGeo, darkMat);
  thighRMesh.position.set(0, -0.22, 0);
  thighRBone.add(thighRMesh);

  const shinRMesh = new THREE.Mesh(shinGeo, bodyMat);
  shinRMesh.position.set(0, -0.22, 0);
  shinRBone.add(shinRMesh);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 0.6), bodyMat);
  headBone.add(headMesh);

  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.08), accentMat);
  visorMesh.position.set(0, 0.06, 0.28);
  headBone.add(visorMesh);

  const browGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
  browLBone.add(new THREE.Mesh(browGeo, darkMat));
  browRBone.add(new THREE.Mesh(browGeo, darkMat));

  const eyeGeo = new THREE.SphereGeometry(0.052, 16, 12);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.1
  });
  eyeLBone.add(new THREE.Mesh(eyeGeo, eyeMat));
  eyeRBone.add(new THREE.Mesh(eyeGeo, eyeMat));

  // Morph-Target Mouth Mesh (14 Visemes)
  const baseMouthGeo = new THREE.BoxGeometry(0.32, 0.075, 0.1, 8, 4, 2);
  const basePos = baseMouthGeo.attributes.position;
  const morphPositions: THREE.BufferAttribute[] = [];
  const morphDict: Record<string, number> = {};

  ALL_VISEMES.forEach((vName, idx) => {
    morphDict[vName] = idx;
    const cloned = basePos.clone();
    for (let i = 0; i < cloned.count; i++) {
      let x = cloned.getX(i);
      let y = cloned.getY(i);
      const z = cloned.getZ(i);
      if (vName === 'viseme_aa') {
        y *= 3.6;
        x *= 1.15;
      } else if (vName === 'viseme_O') {
        y *= 3.0;
        x *= 0.62;
      } else if (vName === 'viseme_PP') {
        y *= 0.25;
      } else {
        y *= 1.8;
      }
      cloned.setXYZ(i, x, y, z);
    }
    morphPositions.push(cloned);
  });

  const smilePositions = basePos.clone();
  for (let i = 0; i < smilePositions.count; i++) {
    const x = smilePositions.getX(i);
    const y = smilePositions.getY(i);
    const corner = Math.max(0, (Math.abs(x) - 0.08) / 0.08);
    smilePositions.setXYZ(i, x * (1 + 0.05 * corner), y + 0.055 * corner, smilePositions.getZ(i));
  }
  morphDict['smile'] = morphPositions.length;
  morphPositions.push(smilePositions);
  baseMouthGeo.morphAttributes.position = morphPositions;

  const mouthMesh = new THREE.Mesh(baseMouthGeo, accentMat);
  mouthMesh.morphTargetDictionary = morphDict;
  mouthMesh.morphTargetInfluences = new Array(morphPositions.length).fill(0);
  mouthMesh.position.set(0, -0.14, 0.29);
  headBone.add(mouthMesh);

  const qEuler = (x: number, y: number, z: number) =>
    new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();

  const walkTimes = [0.0, 0.25, 0.5, 0.75, 1.0];
  const walkClip = new THREE.AnimationClip('Walk', 1.0, [
    new THREE.VectorKeyframeTrack(
      'Hips.position',
      walkTimes,
      [-0.03, 0.99, 0, 0.0, 1.06, 0, 0.03, 0.99, 0, 0.0, 1.06, 0, -0.03, 0.99, 0]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ThighL.quaternion',
      walkTimes,
      [
        ...qEuler(0.52, 0, 0),
        ...qEuler(0.0, 0, 0),
        ...qEuler(-0.55, 0, 0),
        ...qEuler(-0.1, 0, 0),
        ...qEuler(0.52, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShinL.quaternion',
      walkTimes,
      [
        ...qEuler(0.15, 0, 0),
        ...qEuler(0.85, 0, 0),
        ...qEuler(0.08, 0, 0),
        ...qEuler(0.2, 0, 0),
        ...qEuler(0.15, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ThighR.quaternion',
      walkTimes,
      [
        ...qEuler(-0.55, 0, 0),
        ...qEuler(-0.1, 0, 0),
        ...qEuler(0.52, 0, 0),
        ...qEuler(0.0, 0, 0),
        ...qEuler(-0.55, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShinR.quaternion',
      walkTimes,
      [
        ...qEuler(0.08, 0, 0),
        ...qEuler(0.2, 0, 0),
        ...qEuler(0.15, 0, 0),
        ...qEuler(0.85, 0, 0),
        ...qEuler(0.08, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShoulderL.quaternion',
      walkTimes,
      [
        ...qEuler(-0.4, 0, -0.08),
        ...qEuler(0.0, 0, -0.08),
        ...qEuler(0.4, 0, -0.08),
        ...qEuler(0.0, 0, -0.08),
        ...qEuler(-0.4, 0, -0.08)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      walkTimes,
      [
        ...qEuler(0.4, 0, 0.08),
        ...qEuler(0.0, 0, 0.08),
        ...qEuler(-0.4, 0, 0.08),
        ...qEuler(0.0, 0, 0.08),
        ...qEuler(0.4, 0, 0.08)
      ]
    )
  ]);

  const gTimes = [0, 0.6, 1.2, 1.8, 2.4];
  const idleClip = new THREE.AnimationClip('Idle', 2.4, [
    new THREE.VectorKeyframeTrack(
      'Hips.position',
      gTimes,
      [0, 1.02, 0, 0, 1.04, 0, 0, 1.02, 0, 0, 1.04, 0, 0, 1.02, 0]
    )
  ]);

  const explainClip = new THREE.AnimationClip('Explain', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'ShoulderL.quaternion',
      gTimes,
      [
        ...qEuler(-0.75, 0.2, -0.35),
        ...qEuler(-1.1, -0.25, -0.65),
        ...qEuler(-0.6, 0.1, -0.25),
        ...qEuler(-1.0, -0.2, -0.6),
        ...qEuler(-0.75, 0.2, -0.35)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      gTimes,
      [
        ...qEuler(-0.9, -0.2, 0.5),
        ...qEuler(-0.55, 0.2, 0.25),
        ...qEuler(-1.1, -0.25, 0.65),
        ...qEuler(-0.65, 0.1, 0.35),
        ...qEuler(-0.9, -0.2, 0.5)
      ]
    )
  ]);

  const pointRightClip = new THREE.AnimationClip('PointRight', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      gTimes,
      [
        ...qEuler(-1.35, -0.35, 1.05),
        ...qEuler(-1.42, -0.4, 1.12),
        ...qEuler(-1.35, -0.35, 1.05),
        ...qEuler(-1.42, -0.4, 1.12),
        ...qEuler(-1.35, -0.35, 1.05)
      ]
    )
  ]);

  const waveClip = new THREE.AnimationClip('Wave', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      gTimes,
      [
        ...qEuler(0, 0, 2.2),
        ...qEuler(0, 0, 2.55),
        ...qEuler(0, 0, 1.95),
        ...qEuler(0, 0, 2.55),
        ...qEuler(0, 0, 2.2)
      ]
    )
  ]);

  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<string, THREE.AnimationAction>();
  [
    ['Idle', idleClip],
    ['Walk', walkClip],
    ['Explain', explainClip],
    ['PointRight', pointRightClip],
    ['Wave', waveClip]
  ].forEach(([cName, clip]) => {
    const act = mixer.clipAction(clip as THREE.AnimationClip);
    act.play();
    act.setEffectiveWeight(cName === 'Idle' ? 1 : 0);
    actions.set(cName as string, act);
  });

  return {
    id,
    root,
    mixer,
    actions,
    morphMeshes: [mouthMesh],
    hipsBone,
    spineBone,
    headBone,
    browLBone,
    browRBone,
    shoulderLBone,
    forearmLBone,
    shoulderRBone,
    forearmRBone,
    eyeLBone,
    eyeRBone,
    smoothedHeadingQuat: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, initRotY, 0)
    ),
    smoothedHeadOffset: new THREE.Quaternion(),
    smoothedSpineOffset: new THREE.Quaternion(),
    smoothedArmLeanOffset: new THREE.Quaternion(),
    currentSplineTangent: new THREE.Vector3(Math.sin(initRotY), 0, Math.cos(initRotY))
  };
}
