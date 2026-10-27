import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';

export type CameraLifecycleMode =
  | 'DIRECTOR_PLAYING'
  | 'PAUSED_INSPECTING'
  | 'SNAPBACK_SWERVE';

export function usePauseInspector(onSetTimeScale: (scale: number) => void) {
  const [cameraMode, setCameraMode] = useState<CameraLifecycleMode>('DIRECTOR_PLAYING');
  const swerveStartMsRef = useRef<number>(0);
  const swerveOriginPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const swerveOriginLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const enterPauseInspect = useCallback(() => {
    onSetTimeScale(0);
    setCameraMode('PAUSED_INSPECTING');
  }, [onSetTimeScale]);

  const triggerBezierSnapbackResume = useCallback(
    (currentInspectPos: THREE.Vector3, currentInspectLookAt: THREE.Vector3) => {
      swerveOriginPosRef.current.copy(currentInspectPos);
      swerveOriginLookAtRef.current.copy(currentInspectLookAt);
      swerveStartMsRef.current = performance.now();
      onSetTimeScale(0.06);
      setCameraMode('SNAPBACK_SWERVE');
    },
    [onSetTimeScale]
  );

  const evaluateSwerveProgress = useCallback(
    (nowMs: number, swerveDurationSec: number = 1.45): number => {
      const elapsedSec = (nowMs - swerveStartMsRef.current) / 1000;
      const u = Math.min(1, Math.max(0, elapsedSec / swerveDurationSec));
      // Smoothly ramp timeline clock from 0.06x slow-motion (PRD constant) back to 1.0x real time
      onSetTimeScale(0.06 + 0.94 * u);
      if (u >= 1) {
        onSetTimeScale(1.0);
        setCameraMode('DIRECTOR_PLAYING');
      }
      return u;
    },
    [onSetTimeScale]
  );

  return {
    cameraMode,
    swerveOriginPosRef,
    swerveOriginLookAtRef,
    enterPauseInspect,
    triggerBezierSnapbackResume,
    evaluateSwerveProgress
  };
}
