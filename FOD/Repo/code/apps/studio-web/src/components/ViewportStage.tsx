import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  InspectedPose,
  createPauseInspectorRuntime,
  PauseInspectorRuntime
} from './pauseInspectorRuntime';
import { CameraLifecycleMode } from '@chronos3d/react-player';
import {
  CompiledDialogueSegment,
  CompiledSceneManifest,
  STAGE_OBSTACLES,
  SymbolicSceneManifest
} from '@chronos3d/schema';
import {
  createStageScene,
  evaluateStageAtTime,
  StageSceneBundle
} from './stageEngine';
import PauseInspectHud from './PauseInspectHud';
import KaraokeSubtitleBar from './KaraokeSubtitleBar';

export interface PauseInspectorControls {
  cameraMode: CameraLifecycleMode;
  enterPauseInspect: () => void;
  triggerBezierSnapbackResume: (pos: THREE.Vector3, lookAt: THREE.Vector3) => void;
  evaluateSwerveProgress: (nowMs: number, swerveDurationSec?: number) => number;
}

interface ViewportStageProps {
  timeRef: React.MutableRefObject<number>;
  compiledManifestRef: React.MutableRefObject<CompiledSceneManifest>;
  editorCameraMode: boolean;
  onWaypointsUpdate: React.Dispatch<React.SetStateAction<SymbolicSceneManifest>>;
  onShotLabelChange: (label: string) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  activeShotLabel: string;
  activeDialogue: CompiledDialogueSegment | null;
  externalRenderRef?: React.MutableRefObject<((t: number) => void) | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  heightClass?: string;
  stageEditingDisabled?: boolean;
  pauseInspectorControls?: PauseInspectorControls | null;
  inspectorAllowed?: boolean;
}

interface InspectHudState {
  mode: 'off' | 'inspect' | 'snapback';
  orbitHint: string | null;
  snapPct: number;
}

export default function ViewportStage({
  timeRef,
  compiledManifestRef,
  editorCameraMode,
  onWaypointsUpdate,
  onShotLabelChange,
  isPlaying,
  currentTime,
  duration,
  activeShotLabel,
  activeDialogue,
  externalRenderRef,
  onCanvasReady,
  heightClass,
  stageEditingDisabled,
  pauseInspectorControls,
  inspectorAllowed = true
}: ViewportStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const editorCameraModeRef = useRef<boolean>(editorCameraMode);
  const inspectorControlsRef = useRef<PauseInspectorControls | null>(null);
  const inspectorAllowedRef = useRef<boolean>(inspectorAllowed);
  const runtimeRef = useRef<PauseInspectorRuntime | null>(null);
  const [inspectHud, setInspectHud] = useState<InspectHudState>({
    mode: 'off',
    orbitHint: null,
    snapPct: 0
  });

  useEffect(() => {
    editorCameraModeRef.current = editorCameraMode;
  }, [editorCameraMode]);

  useEffect(() => {
    inspectorControlsRef.current = pauseInspectorControls ?? null;
  }, [pauseInspectorControls]);

  useEffect(() => {
    inspectorAllowedRef.current = inspectorAllowed;
  }, [inspectorAllowed]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const bundle: StageSceneBundle = createStageScene();
    const scene = bundle.scene;

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / container.clientHeight,
      0.15,
      50
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pipCamera = new THREE.PerspectiveCamera(50, 1.6, 0.15, 80);
    onCanvasReady?.(renderer.domElement);

    const ghostFrustumCam = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / container.clientHeight,
      0.12,
      3.2
    );
    const ghostHelper = new THREE.CameraHelper(ghostFrustumCam);
    ghostHelper.visible = false;
    scene.add(ghostHelper);

    const runtime = createPauseInspectorRuntime(renderer.domElement, {
      isEnabled: () =>
        inspectorAllowedRef.current &&
        !editorCameraModeRef.current &&
        Boolean(inspectorControlsRef.current),
      getPickScene: () => ({ root: scene, camera }),
      onExitToSnapback: () => {
        const rt = runtimeRef.current;
        const controls = inspectorControlsRef.current;
        if (rt && controls) {
          const pose = rt.getPose();
          controls.triggerBezierSnapbackResume(
            pose.position.clone(),
            pose.lookAt.clone()
          );
        }
      },
      onEnterRequest: () => {
        inspectorControlsRef.current?.enterPauseInspect();
      },
      onOrbitTarget: (actorId) => {
        if (actorId === 'holo_core') return bundle.holoCoreMesh.position.clone();
        const rig = bundle.rigsMap.get(actorId);
        if (!rig) return null;
        const v = new THREE.Vector3();
        rig.root.updateMatrixWorld(true);
        rig.headBone.getWorldPosition(v);
        return v;
      }
    });
    runtimeRef.current = runtime;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHit = new THREE.Vector3();
    let draggedWaypoint: { trackId: string; idx: number } | null = null;
    let insideObstacleOnBegin = false;

    const previewPushoutMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 })
    );
    previewPushoutMesh.visible = false;
    previewPushoutMesh.position.y = 0.2;
    scene.add(previewPushoutMesh);

    const obstacleViolation = (x: number, z: number) =>
      STAGE_OBSTACLES.find(
        (ob) =>
          Math.hypot(x - ob.centerXZ[0], z - ob.centerXZ[1]) < ob.radius + 0.25
      ) || null;

    const computePushout = (x: number, z: number, ob: { centerXZ: [number, number]; radius: number }) => {
      const dx = x - ob.centerXZ[0];
      const dz = z - ob.centerXZ[1];
      const len = Math.hypot(dx, dz) || 1e-4;
      const r = ob.radius + 0.25;
      return [+(ob.centerXZ[0] + (dx / len) * r).toFixed(2), +(ob.centerXZ[1] + (dz / len) * r).toFixed(2)] as const;
    };

    const writeWaypoint = (trackId: string, idx: number, x: number, z: number) => {
      onWaypointsUpdate((prev) => {
        const clone: SymbolicSceneManifest = JSON.parse(JSON.stringify(prev));
        const spTrack = clone.tracks.find((tr) => tr.id === trackId);
        if (spTrack && spTrack.segments && spTrack.segments[0]) {
          spTrack.segments[0].waypoints[idx] = [x, 0, z];
        }
        return clone;
      });
    };

    const setDragTint = (trackId: string | null, tintHex: string) => {
      bundle.splineVisualsByTrackId.forEach((visual, tid) => {
        const hex = trackId && tid === trackId ? tintHex : visual.colorHex;
        visual.waypointMeshes.forEach((wp) => {
          const mat = wp.material as THREE.MeshStandardMaterial;
          mat.color.set(hex);
          mat.emissive.set(hex);
          mat.emissiveIntensity = 0.8;
        });
      });
    };

    const updatePointerNdc = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onMouseDown = (ev: MouseEvent) => {
      if (stageEditingDisabled) return;
      updatePointerNdc(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(bundle.waypointMeshes, false);
      if (hits.length > 0) {
        const ud = hits[0].object.userData as { trackId?: string; waypointIndex?: number };
        if (ud.trackId && typeof ud.waypointIndex === 'number') {
          draggedWaypoint = { trackId: ud.trackId, idx: ud.waypointIndex };
          insideObstacleOnBegin = obstacleViolation(
            hits[0].object.position.x,
            hits[0].object.position.z
          ) !== null;
          setDragTint(draggedWaypoint.trackId, '#fbbf24');
          previewPushoutMesh.visible = insideObstacleOnBegin;
        }
      }
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (draggedWaypoint === null) return;
      updatePointerNdc(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
        const newX = Number(THREE.MathUtils.clamp(planeHit.x, -4.5, 4.5).toFixed(2));
        const newZ = Number(THREE.MathUtils.clamp(planeHit.z, -3.5, 3.5).toFixed(2));
        writeWaypoint(draggedWaypoint.trackId, draggedWaypoint.idx, newX, newZ);

        const ob = obstacleViolation(newX, newZ);
        if (ob) {
          const [px, pz] = computePushout(newX, newZ, ob);
          previewPushoutMesh.visible = true;
          previewPushoutMesh.position.set(px, 0.2, pz);
          insideObstacleOnBegin = true;
        } else {
          previewPushoutMesh.visible = false;
          insideObstacleOnBegin = false;
        }
      }
    };

    const onMouseUp = () => {
      if (draggedWaypoint !== null) {
        const visual = bundle.splineVisualsByTrackId.get(draggedWaypoint.trackId);
        const handle = visual?.waypointMeshes[draggedWaypoint.idx];
        if (handle && insideObstacleOnBegin) {
          const ob = obstacleViolation(handle.position.x, handle.position.z);
          if (ob) {
            const [px, pz] = computePushout(handle.position.x, handle.position.z, ob);
            writeWaypoint(draggedWaypoint.trackId, draggedWaypoint.idx, px, pz);
          }
        }
        previewPushoutMesh.visible = false;
        insideObstacleOnBegin = false;
        setDragTint(null, '#fbbf24');
        draggedWaypoint = null;
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let rAF: number;
    let frameCount = 0;
    let lastLoopMs = performance.now();
    let lastGhostEnabled = false;
    let lastHudKey = '';

    const renderLoop = () => {
      frameCount++;
      const nowMs = performance.now();
      const dt = Math.min(0.05, (nowMs - lastLoopMs) / 1000);
      lastLoopMs = nowMs;

      const controls = inspectorControlsRef.current;
      const directorPose = evaluateStageAtTime(bundle, {
        manifest: compiledManifestRef.current,
        t: timeRef.current,
        camera,
        editorCameraMode: editorCameraModeRef.current,
        frameCount,
        onShotLabel: onShotLabelChange
      });

      let inspectorPose: InspectedPose | null = null;
      let inspectorBusy = false;

      if (controls && directorPose && !editorCameraModeRef.current) {
        const camMode = controls.cameraMode;
        const rtState = runtime.getStateLabel();

        if (camMode === 'PAUSED_INSPECTING' && rtState !== 'inspect') {
          runtime.enter({
            position: directorPose.position,
            lookAt: directorPose.lookAt,
            fov: directorPose.fov
          });
        }
        if (camMode === 'SNAPBACK_SWERVE' && rtState === 'inspect') {
          runtime.beginSnapback();
        }
        if (camMode === 'SNAPBACK_SWERVE') {
          controls.evaluateSwerveProgress(nowMs);
        }

        inspectorPose = runtime.tick(dt, {
          position: directorPose.position,
          lookAt: directorPose.lookAt,
          fov: directorPose.fov
        });
        inspectorBusy = runtime.busy();

        const snapPct = inspectorBusy
          ? Math.round(runtime.snapProgress() * 100)
          : 0;
        const hudKey = `${inspectorBusy}:${runtime.getStateLabel()}:${runtime.orbitHint() ?? ''}:${snapPct}:${camMode}`;
        if (hudKey !== lastHudKey) {
          lastHudKey = hudKey;
          setInspectHud({
            mode:
              runtime.getStateLabel() === 'snapback'
                ? 'snapback'
                : runtime.getStateLabel() === 'inspect'
                ? 'inspect'
                : 'off',
            orbitHint: runtime.orbitHint(),
            snapPct
          });
        }
      } else if (runtime.getStateLabel() !== 'outside') {
        runtime.forceClear();
      }

      if (inspectorBusy !== lastGhostEnabled) {
        lastGhostEnabled = inspectorBusy;
        ghostHelper.visible = inspectorBusy;
        if (!inspectorBusy) setInspectHud({ mode: 'off', orbitHint: null, snapPct: 0 });
      }

      if (inspectorBusy && directorPose && ghostHelper.visible) {
        ghostFrustumCam.fov = directorPose.fov;
        ghostFrustumCam.aspect = container.clientWidth / container.clientHeight;
        ghostFrustumCam.updateProjectionMatrix();
        ghostFrustumCam.position.copy(directorPose.position);
        ghostFrustumCam.lookAt(directorPose.lookAt);
        ghostFrustumCam.updateMatrixWorld(true);
        ghostHelper.update();
      }

      if (inspectorPose && directorPose) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, directorPose.fov, 0.25);
        camera.updateProjectionMatrix();
        camera.position.copy(inspectorPose.position);
        camera.lookAt(inspectorPose.lookAt);
        if (inspectorPose.dutchRollRad !== 0) camera.rotateZ(inspectorPose.dutchRollRad);
      } else if (editorCameraModeRef.current) {
        camera.position.lerp(new THREE.Vector3(0, 6.2, 5.2), 0.15);
        camera.lookAt(new THREE.Vector3(-0.4, 0.5, -0.2));
      } else if (directorPose) {
        camera.position.lerp(directorPose.position, 0.16);
        camera.lookAt(directorPose.lookAt);
        camera.fov = THREE.MathUtils.lerp(camera.fov, directorPose.fov, 0.16);
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);

      if (directorPose?.overhead) {
        const viewW = container.clientWidth;
        const viewH = container.clientHeight;
        const pipW = Math.round(viewW * 0.26);
        const pipH = Math.round(pipW * 0.6);
        pipCamera.aspect = pipW / pipH;
        pipCamera.updateProjectionMatrix();
        pipCamera.position.copy(directorPose.overhead.position);
        pipCamera.lookAt(directorPose.overhead.lookAt);
        renderer.setScissorTest(true);
        renderer.setViewport(viewW - pipW - 14, 14, pipW, pipH);
        renderer.setScissor(viewW - pipW - 14, 14, pipW, pipH);
        renderer.render(scene, pipCamera);
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, viewW, viewH);
      }

      rAF = requestAnimationFrame(renderLoop);
    };

    rAF = requestAnimationFrame(renderLoop);

    if (externalRenderRef) {
      externalRenderRef.current = (targetT: number) => {
        const manifestNow = compiledManifestRef.current;
        const clamped = Math.max(0, Math.min(manifestNow.duration, targetT));
        evaluateStageAtTime(bundle, {
          manifest: manifestNow,
          t: clamped,
          camera,
          editorCameraMode: false,
          frameCount: 1
        });
        renderer.render(scene, camera);
      };
    }

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      ghostFrustumCam.aspect = container.clientWidth / container.clientHeight;
      ghostFrustumCam.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rAF);
      runtime.dispose();
      runtimeRef.current = null;
      scene.remove(ghostHelper);
      ghostHelper.dispose();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (externalRenderRef) externalRenderRef.current = null;
      onCanvasReady?.(null);
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full ${heightClass ?? 'h-[400px]'} bg-black overflow-hidden`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span className="font-mono font-semibold text-white">
          T+{currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-400 font-medium">{activeShotLabel}</span>
      </div>

      <PauseInspectHud
        mode={inspectHud.mode}
        orbitHint={inspectHud.orbitHint}
        snapPct={inspectHud.snapPct}
      />

      <KaraokeSubtitleBar activeDialogue={activeDialogue} currentTime={currentTime} />
    </div>
  );
}
