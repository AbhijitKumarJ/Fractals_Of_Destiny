import * as THREE from 'three';
import { SocketAttachment } from '@chronos3d/schema';
import { CharacterRigInstance } from './ProceduralRigBuilder';

export function applyBoneSocketAttachments(
  attachments: SocketAttachment[],
  rigsMap: Map<string, CharacterRigInstance>,
  propObjectsMap: Map<string, THREE.Object3D>
): void {
  attachments.forEach((att) => {
    const rig = rigsMap.get(att.characterId);
    const propObj = propObjectsMap.get(att.propId);
    if (!rig || !propObj) return;

    rig.root.updateMatrixWorld(true);
    const socketBone =
      att.boneSocket === 'ForearmR'
        ? rig.forearmRBone
        : att.boneSocket === 'ForearmL'
        ? rig.forearmLBone
        : rig.spineBone;

    const boneWorldPos = new THREE.Vector3();
    const boneWorldQuat = new THREE.Quaternion();
    socketBone.getWorldPosition(boneWorldPos);
    socketBone.getWorldQuaternion(boneWorldQuat);

    const worldOffset = new THREE.Vector3(...att.localOffset).applyQuaternion(
      boneWorldQuat
    );
    propObj.position.copy(boneWorldPos).add(worldOffset);
    propObj.quaternion.copy(boneWorldQuat);
    propObj.scale.set(...att.localScale);
  });
}
