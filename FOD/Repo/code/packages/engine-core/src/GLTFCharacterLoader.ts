import * as THREE from 'three';
import { ALL_VISEMES, Vector3Tuple } from '@chronos3d/schema';
import { CharacterRigInstance } from './ProceduralRigBuilder';

const BONE_ALIASES: Record<string, string[]> = {
  Hips: ['Hips', 'mixamorigHips', 'Pelvis', 'root_hips'],
  Spine: ['Spine', 'Spine1', 'Spine2', 'mixamorigSpine', 'mixamorigSpine2'],
  Head: ['Head', 'mixamorigHead', 'head'],
  BrowL: ['BrowL', 'LeftEyebrow', 'Brow_L'],
  BrowR: ['BrowR', 'RightEyebrow', 'Brow_R'],
  ShoulderL: ['ShoulderL', 'LeftArm', 'mixamorigLeftArm', 'UpperArm_L'],
  ForearmL: ['ForearmL', 'LeftForeArm', 'mixamorigLeftForeArm', 'LowerArm_L'],
  ShoulderR: ['ShoulderR', 'RightArm', 'mixamorigRightArm', 'UpperArm_R'],
  ForearmR: ['ForearmR', 'RightForeArm', 'mixamorigRightForeArm', 'LowerArm_R'],
  EyeL: ['EyeL', 'LeftEye', 'mixamorigLeftEye', 'Eye_L'],
  EyeR: ['EyeR', 'RightEye', 'mixamorigRightEye', 'Eye_R']
};

function findBoneByAlias(root: THREE.Object3D, canonicalName: string): THREE.Bone {
  const candidates = BONE_ALIASES[canonicalName] || [canonicalName];
  let matched: THREE.Bone | null = null;

  root.traverse((obj) => {
    if (matched) return;
    if ((obj as THREE.Bone).isBone && candidates.includes(obj.name)) {
      matched = obj as THREE.Bone;
    }
  });

  if (matched) return matched;

  const fallbackBone = new THREE.Bone();
  fallbackBone.name = canonicalName;
  root.add(fallbackBone);
  return fallbackBone;
}

export function bindLoadedGLTFToCharacterRig(
  id: string,
  gltfSceneRoot: THREE.Group,
  animations: THREE.AnimationClip[],
  initPos: Vector3Tuple,
  initRotY: number
): CharacterRigInstance {
  gltfSceneRoot.name = id;
  gltfSceneRoot.position.set(...initPos);
  gltfSceneRoot.rotation.set(0, initRotY, 0);

  const morphMeshes: THREE.Mesh[] = [];
  gltfSceneRoot.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const hasVisemes = ALL_VISEMES.some(
        (v) => typeof mesh.morphTargetDictionary![v] === 'number'
      );
      if (hasVisemes) {
        morphMeshes.push(mesh);
      }
    }
  });

  const mixer = new THREE.AnimationMixer(gltfSceneRoot);
  const actions = new Map<string, THREE.AnimationAction>();
  animations.forEach((clip) => {
    const act = mixer.clipAction(clip);
    act.play();
    act.setEffectiveWeight(clip.name === 'Idle' ? 1 : 0);
    actions.set(clip.name, act);
  });

  return {
    id,
    root: gltfSceneRoot,
    mixer,
    actions,
    morphMeshes,
    hipsBone: findBoneByAlias(gltfSceneRoot, 'Hips'),
    spineBone: findBoneByAlias(gltfSceneRoot, 'Spine'),
    headBone: findBoneByAlias(gltfSceneRoot, 'Head'),
    browLBone: findBoneByAlias(gltfSceneRoot, 'BrowL'),
    browRBone: findBoneByAlias(gltfSceneRoot, 'BrowR'),
    shoulderLBone: findBoneByAlias(gltfSceneRoot, 'ShoulderL'),
    forearmLBone: findBoneByAlias(gltfSceneRoot, 'ForearmL'),
    shoulderRBone: findBoneByAlias(gltfSceneRoot, 'ShoulderR'),
    forearmRBone: findBoneByAlias(gltfSceneRoot, 'ForearmR'),
    eyeLBone: findBoneByAlias(gltfSceneRoot, 'EyeL'),
    eyeRBone: findBoneByAlias(gltfSceneRoot, 'EyeR'),
    smoothedHeadingQuat: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, initRotY, 0)
    ),
    smoothedHeadOffset: new THREE.Quaternion(),
    smoothedSpineOffset: new THREE.Quaternion(),
    smoothedArmLeanOffset: new THREE.Quaternion(),
    currentSplineTangent: new THREE.Vector3(Math.sin(initRotY), 0, Math.cos(initRotY))
  };
}
