import { useState, useCallback } from 'react';
import {
  DecisionChoice,
  PersistentWorldState,
  WorldCheckpointSnapshot
} from '@chronos3d/schema';

export function useWorldStateDAG(initialState: PersistentWorldState) {
  const [worldState, setWorldState] = useState<PersistentWorldState>(initialState);
  const [checkpoints, setCheckpoints] = useState<WorldCheckpointSnapshot[]>([
    {
      checkpointId: 'cp_0',
      chapterId: initialState.currentChapterId,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(initialState))
    }
  ]);

  const isChoiceUnlocked = useCallback(
    (choice: DecisionChoice): boolean => {
      if (choice.requiredItemId) {
        const hasItem = worldState.inventory.some(
          (i) => i.id === choice.requiredItemId
        );
        if (!hasItem) return false;
      }
      if (choice.requiredFlag && !worldState.flags[choice.requiredFlag]) {
        return false;
      }
      return true;
    },
    [worldState.inventory, worldState.flags]
  );

  const applyChoiceAndBranch = useCallback((choice: DecisionChoice) => {
    setWorldState((prev) => {
      const next: PersistentWorldState = JSON.parse(JSON.stringify(prev));
      next.currentChapterId = choice.targetChapterId;

      if (
        choice.grantItemId &&
        !next.inventory.some((i) => i.id === choice.grantItemId)
      ) {
        next.inventory.push({
          id: choice.grantItemId,
          name: choice.grantItemId,
          icon: 'cube'
        });
      }
      if (choice.setFlag) {
        next.flags[choice.setFlag] = true;
      }
      if (choice.attachPropToSocket) {
        next.socketAttachments.push({
          propId: choice.attachPropToSocket.propId,
          characterId: choice.attachPropToSocket.characterId,
          boneSocket: choice.attachPropToSocket.boneSocket,
          localOffset: [0, -0.3, 0.16],
          localScale: [0.24, 0.24, 0.24]
        });
      }

      setCheckpoints((oldCps) => [
        ...oldCps,
        {
          checkpointId: `cp_${oldCps.length}`,
          chapterId: next.currentChapterId,
          timestamp: Date.now(),
          state: JSON.parse(JSON.stringify(next))
        }
      ]);

      return next;
    });
  }, []);

  const restoreCheckpoint = useCallback((index: number) => {
    setCheckpoints((prev) => {
      const target = prev[index];
      if (target) {
        setWorldState(JSON.parse(JSON.stringify(target.state)));
      }
      return prev.slice(0, index + 1);
    });
  }, []);

  return {
    worldState,
    checkpoints,
    isChoiceUnlocked,
    applyChoiceAndBranch,
    restoreCheckpoint
  };
}
