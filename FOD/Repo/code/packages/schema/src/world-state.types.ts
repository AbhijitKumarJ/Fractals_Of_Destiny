import { Vector3Tuple } from './symbolic-ast.types';

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
}

export interface SocketAttachment {
  propId: string;
  characterId: string;
  boneSocket: 'ForearmR' | 'ForearmL' | 'Spine';
  localOffset: Vector3Tuple;
  localScale: Vector3Tuple;
}

export interface CharacterTransformSnapshot {
  characterId: string;
  position: Vector3Tuple;
  rotationY: number;
}

export interface PersistentWorldState {
  currentChapterId: string;
  inventory: InventoryItem[];
  flags: Record<string, boolean>;
  socketAttachments: SocketAttachment[];
  characterPoses: Record<string, CharacterTransformSnapshot>;
}

export interface WorldCheckpointSnapshot {
  checkpointId: string;
  chapterId: string;
  timestamp: number;
  state: PersistentWorldState;
}
