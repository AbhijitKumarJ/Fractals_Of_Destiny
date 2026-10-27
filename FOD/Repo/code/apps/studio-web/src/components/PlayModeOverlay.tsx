import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CompiledSceneManifest,
  DecisionChoice,
  PersistentWorldState,
  SymbolicSceneManifest
} from '@chronos3d/schema';
import {
  DecisionCardModal,
  useWorldStateDAG,
  usePauseInspector
} from '@chronos3d/react-player';
import ViewportStage from './ViewportStage';

interface PlayModeOverlayProps {
  manifest: CompiledSceneManifest;
  rawScene: SymbolicSceneManifest;
  onClose: () => void;
}

const INITIAL_WORLD_STATE: PersistentWorldState = {
  currentChapterId: 'chapter_1',
  inventory: [],
  flags: {},
  socketAttachments: [],
  characterPoses: {}
};

interface ResolvedDecision {
  decision: NonNullable<SymbolicSceneManifest['decision']>;
  triggerSec: number | null;
}

function resolveDecision(
  manifest: CompiledSceneManifest,
  rawScene: SymbolicSceneManifest
): ResolvedDecision | null {
  if (!rawScene.decision) return null;
  const decision = rawScene.decision;
  let triggerSec: number | null = null;

  if (typeof decision.triggerTime === 'number') {
    triggerSec = decision.triggerTime;
  } else if (typeof decision.triggerTime === 'string') {
    const lineEnd = /^@line_(\d+)\.end(?:\s*\+\s*([\d.]+))?$/.exec(decision.triggerTime.trim());
    const lineStart = /^@line_(\d+)\.start(?:\s*\+\s*([\d.]+))?$/.exec(decision.triggerTime.trim());
    const wordHit = /@line_(\d+)\.word\("([^"]*)"\)(?:\s*\+\s*([\d.]+))?$/.exec(decision.triggerTime.trim());
    const line = (id: string) => manifest.dialogue.find((d) => d.id === id) ?? null;

    if (lineEnd) {
      const off = lineEnd[2] ? parseFloat(lineEnd[2]) : 0;
      const target = line(`line_${lineEnd[1]}`);
      triggerSec = (target?.end ?? 0) + off;
    } else if (lineStart) {
      const target = line(`line_${lineStart[1]}`);
      triggerSec = (target?.start ?? 0) + (lineStart[2] ? parseFloat(lineStart[2]) : 0);
    } else if (wordHit) {
      const target = line(`line_${wordHit[1]}`);
      const hit = target?.words?.find(
        (w) => w.word.toLowerCase() === wordHit[2].toLowerCase()
      );
      if (hit) triggerSec = hit.end + (wordHit[3] ? parseFloat(wordHit[3]) : 0);
      else triggerSec = target?.end ?? null;
    }
  }

  return { decision, triggerSec };
}

export default function PlayModeOverlay({ manifest, rawScene, onClose }: PlayModeOverlayProps) {
  const resolved = useMemo(() => resolveDecision(manifest, rawScene), [manifest, rawScene]);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [decisionShown, setDecisionShown] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const timeRef = useRef<number>(0);
  const timeScaleRef = useRef<number>(1);
  const lastFrameRef = useRef<number | null>(null);
  const decisionShownRef = useRef<boolean>(false);
  const manifestRef = useRef<CompiledSceneManifest>(manifest);
  manifestRef.current = manifest;

  const pauseInspector = usePauseInspector((scale: number) => {
    timeScaleRef.current = scale;
    if (scale === 0) setIsPlaying(false);
    else if (scale >= 0.999) setIsPlaying(true);
  });

  const {
    worldState,
    checkpoints,
    isChoiceUnlocked,
    applyChoiceAndBranch
  } = useWorldStateDAG(INITIAL_WORLD_STATE);

  const activeLine = useMemo(
    () =>
      manifest.dialogue.find(
        (d) => currentTime >= d.start && currentTime <= d.end
      ) || null,
    [manifest.dialogue, currentTime]
  );

  const isChoiceUnlockedStable = useRef(isChoiceUnlocked);
  isChoiceUnlockedStable.current = isChoiceUnlocked;

  const rafTick = useCallback(
    (now: number) => {
      if (isPlaying && lastFrameRef.current !== null) {
        const delta = (now - lastFrameRef.current) / 1000;
        let next = timeRef.current + delta * timeScaleRef.current;
        if (next >= manifest.duration) {
          next = Math.min(next, manifest.duration);
          setIsPlaying(false);
        }
        timeRef.current = next;
        setCurrentTime(next);
      }
      lastFrameRef.current = now;
    },
    [isPlaying, manifest.duration]
  );

  const clockRAF = useRef<number>(0);
  const rafTickRef = useRef(rafTick);
  rafTickRef.current = rafTick;

  useEffect(() => {
    const loop = (now: number) => {
      rafTickRef.current(now);
      clockRAF.current = requestAnimationFrame(loop);
    };
    clockRAF.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(clockRAF.current);
  }, []);

  const reserveDecision = useCallback(
    (choice: DecisionChoice | null) => {
      const pick =
        choice ??
        resolved?.decision.choices.find(
          (c) => c.id === resolved.decision.defaultChoiceId
        ) ??
        resolved?.decision.choices[0];
      if (pick) applyChoiceAndBranch(pick);
      decisionShownRef.current = true;
      setDecisionShown(true);
      setModalOpen(false);
      setIsPlaying(true);
    },
    [resolved]
  );

  useEffect(() => {
    if (
      isPlaying &&
      resolved &&
      resolved.triggerSec !== null &&
      !decisionShownRef.current &&
      currentTime >= resolved.triggerSec
    ) {
      setIsPlaying(false);
      setModalOpen(true);
      setCountdown(resolved.decision.timeoutSeconds);
    }
  }, [currentTime, isPlaying, resolved]);

  useEffect(() => {
    if (!modalOpen) return;
    const iv = window.setInterval(() => {
      setCountdown((prev) => Math.max(0, +(prev - 0.25).toFixed(2)));
    }, 250);
    return () => window.clearInterval(iv);
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen && countdown <= 0) {
      reserveDecision(null);
    }
  }, [modalOpen, countdown, reserveDecision]);

  const noopDispatch = useCallback(
    (() => {}) as React.Dispatch<React.SetStateAction<SymbolicSceneManifest>>,
    []
  );

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      <div className="absolute inset-0">
        <ViewportStage
          timeRef={timeRef}
          compiledManifestRef={manifestRef}
          editorCameraMode={false}
          onWaypointsUpdate={noopDispatch}
          onShotLabelChange={() => undefined}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={manifest.duration}
          activeShotLabel=""
          activeDialogue={activeLine}
          heightClass="h-full"
          stageEditingDisabled={true}
          pauseInspectorControls={pauseInspector}
          inspectorAllowed={!modalOpen}
        />
      </div>

      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-4 py-1.5 rounded-xl text-xs text-slate-300 pointer-events-none">
        <span className="font-mono font-semibold text-white">Play Mode</span>
        <span className="flex items-center gap-1 text-sky-400">
          {worldState.inventory.length} {worldState.inventory.length === 1 ? 'item' : 'items'}
        </span>
        <span className="font-mono text-emerald-400">{worldState.currentChapterId}</span>
        <span className="text-slate-400">Checkpoints: {checkpoints.length}</span>
        {resolved?.decision && !decisionShown && resolved.triggerSec !== null && (
          <span className="text-amber-400">
            Decision at {resolved.triggerSec.toFixed(2)}s
          </span>
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-950/85 border border-slate-800 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 px-3 py-2 rounded-xl text-xs font-semibold transition"
      >
        Exit Play Mode
      </button>

      <div className="absolute bottom-6 inset-x-6 flex items-center justify-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => {
            timeRef.current = 0;
            setCurrentTime(0);
            decisionShownRef.current = false;
            setDecisionShown(false);
            setModalOpen(false);
            setIsPlaying(true);
          }}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-xs transition"
        >
          Restart
        </button>
        <input
          type="range"
          min={0}
          max={manifest.duration}
          step={0.02}
          value={currentTime}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            timeRef.current = t;
            setCurrentTime(t);
          }}
          className="flex-1 max-w-md accent-sky-400"
        />
      </div>

      {modalOpen && resolved && (
        <DecisionCardModal
          decision={resolved.decision}
          countdownSec={countdown}
          isChoiceUnlocked={(c) => isChoiceUnlockedStable.current(c)}
          onSelectChoice={(c) => reserveDecision(c)}
        />
      )}

      {decisionShown && !modalOpen && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-emerald-500/40 rounded-xl px-3 py-2 text-[11px] text-slate-400">
          Decision resolved · branch applied{' '}
          <span className="font-mono text-emerald-400">
            {worldState.currentChapterId}
          </span>{' '}
          · checkpoint cp_{checkpoints.length - 1}
        </div>
      )}
    </div>
  );
}
