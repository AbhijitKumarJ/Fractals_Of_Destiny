import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  CompiledSceneManifest,
  SymbolicSceneManifest
} from '@chronos3d/schema';
import {
  compileSymbolicManifest,
  sanitizeAndRepairLLMScene
} from '@chronos3d/compiler';
import ViewportStage from '../components/ViewportStage';
import StudioHeader from '../components/StudioHeader';
import SymbolicAnchorTable from '../components/SymbolicAnchorTable';
import ProsodyPanel from '../components/ProsodyPanel';
import SanitizerLogPanel from '../components/SanitizerLogPanel';
import ArmIKEmotionPanel from '../components/ArmIKEmotionPanel';
import MultiTrackTimeline from '../components/MultiTrackTimeline';
import PlayModeOverlay from '../components/PlayModeOverlay';
import { PauseInspectorControls } from '../components/ViewportStage';
import ExportMasteringDeck from './ExportMasteringDeck';
import { usePauseInspector } from '@chronos3d/react-player';
import { SceneLibraryEntry } from '../sampleScenes';

interface StudioWorkspaceProps {
  rawScene: SymbolicSceneManifest;
  onRawSceneChange: React.Dispatch<React.SetStateAction<SymbolicSceneManifest>>;
  exportDeckOpen?: boolean;
  onExportDeckClose?: () => void;
  sceneLibrary?: SceneLibraryEntry[];
  activeSceneId?: string;
  onSelectScene?: (entry: SceneLibraryEntry) => void;
}

export default function StudioWorkspace({
  rawScene,
  onRawSceneChange: setRawScene,
  exportDeckOpen,
  onExportDeckClose,
  sceneLibrary,
  activeSceneId,
  onSelectScene
}: StudioWorkspaceProps) {
  const [useSanitizer, setUseSanitizer] = useState<boolean>(true);
  const [editorCameraMode, setEditorCameraMode] = useState<boolean>(false);
  const [deckOpen, setDeckOpen] = useState<boolean>(false);
  const [playModeOpen, setPlayModeOpen] = useState<boolean>(false);

  const [ariaWpm, setAriaWpm] = useState<number>(145);
  const [zephyrWpm, setZephyrWpm] = useState<number>(140);
  const [interTurnPauseDelta, setInterTurnPauseDelta] = useState<number>(0.0);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [activeShotLabel, setActiveShotLabel] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastSpokenSegRef = useRef<string | null>(null);
  const shotLabelRef = useRef<string>('');
  const timeScaleRef = useRef<number>(1);
  const [webglCanvas, setWebglCanvas] = useState<HTMLCanvasElement | null>(null);
  const externalRenderRef = useRef<((t: number) => void) | null>(null);

  const pauseInspector = usePauseInspector((scale: number) => {
    timeScaleRef.current = scale;
    if (scale === 0) setIsPlaying(false);
    else if (scale >= 0.999) setIsPlaying(true);
  });

  useEffect(() => {
    if (exportDeckOpen) setDeckOpen(true);
  }, [exportDeckOpen]);

  // Run 8B Self-Healing Sanitizer
  const { activeSymbolicManifest, sanitizerRepairs } = useMemo(() => {
    const result = sanitizeAndRepairLLMScene(rawScene);
    return {
      activeSymbolicManifest: useSanitizer ? result.repairedManifest : rawScene,
      sanitizerRepairs: result.repairs
    };
  }, [rawScene, useSanitizer]);

  // Run 4-Pass Symbolic-to-Numeric Compiler
  const compiledManifest = useMemo<CompiledSceneManifest>(() => {
    return compileSymbolicManifest(
      activeSymbolicManifest,
      {
        actor_aria: ariaWpm,
        actor_zephyr: zephyrWpm
      },
      interTurnPauseDelta
    );
  }, [activeSymbolicManifest, ariaWpm, zephyrWpm, interTurnPauseDelta]);

  const compiledManifestRef = useRef<CompiledSceneManifest>(compiledManifest);
  useEffect(() => {
    compiledManifestRef.current = compiledManifest;
  }, [compiledManifest]);

  const activeDialogue = useMemo(() => {
    return (
      compiledManifest.dialogue.find(
        (d) => currentTime >= d.start && currentTime <= d.end
      ) || null
    );
  }, [compiledManifest.dialogue, currentTime]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(compiledManifest.duration, t));
      timeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [compiledManifest.duration]
  );

  // Browser Web Speech TTS Preview
  useEffect(() => {
    if (!isPlaying || !activeDialogue) {
      if (!isPlaying && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (lastSpokenSegRef.current !== activeDialogue.id) {
      lastSpokenSegRef.current = activeDialogue.id;
      if (ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(activeDialogue.text);
        const wpm = activeDialogue.speakerId === 'actor_aria' ? ariaWpm : zephyrWpm;
        utter.rate = THREE.MathUtils.clamp(wpm / 145, 0.65, 1.6);
        utter.pitch = activeDialogue.speakerId === 'actor_zephyr' ? 0.85 : 1.12;
        window.speechSynthesis.speak(utter);
      }
    }
  }, [activeDialogue, isPlaying, ttsEnabled, ariaWpm, zephyrWpm]);

  // Master rAF Timeline Clock
  useEffect(() => {
    let rAF: number;
    const tick = (now: number) => {
      if (isPlaying && lastFrameRef.current !== null) {
        const delta = (now - lastFrameRef.current) / 1000;
        let next = timeRef.current + delta * timeScaleRef.current;
        if (next >= compiledManifestRef.current.duration) {
          next = 0;
        }
        timeRef.current = next;
        setCurrentTime(next);
      }
      lastFrameRef.current = now;
      rAF = requestAnimationFrame(tick);
    };
    rAF = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rAF);
  }, [isPlaying]);

  const copySymbolicJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeSymbolicManifest, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  const downloadSymbolicJson = () => {
    const blob = new Blob([JSON.stringify(activeSymbolicManifest, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeSymbolicManifest.id || 'symbolic_manifest'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importSymbolicJson = (manifest: SymbolicSceneManifest): boolean => {
    setRawScene(manifest);
    return true;
  };

  const closeExportDeck = () => {
    setDeckOpen(false);
    if (exportDeckOpen && onExportDeckClose) onExportDeckClose();
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Studio Header */}
        <StudioHeader
          editorCameraMode={editorCameraMode}
          onToggleCameraMode={() => setEditorCameraMode(!editorCameraMode)}
          useSanitizer={useSanitizer}
          onToggleSanitizer={() => setUseSanitizer(!useSanitizer)}
          sanitizerRepairCount={sanitizerRepairs.length}
          copiedJson={copiedJson}
          onCopyJson={copySymbolicJson}
          onDownloadJson={downloadSymbolicJson}
          onImportJson={importSymbolicJson}
          onOpenPlayMode={() => setPlayModeOpen(true)}
          sceneLibrary={sceneLibrary}
          activeSceneId={activeSceneId}
          onSelectScene={onSelectScene}
        />

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Columns: 3D Viewport + Symbolic Compilation Log */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <ViewportStage
                timeRef={timeRef}
                compiledManifestRef={compiledManifestRef}
                editorCameraMode={editorCameraMode}
                onWaypointsUpdate={setRawScene}
                onShotLabelChange={(label) => {
                  shotLabelRef.current = label;
                  setActiveShotLabel(label);
                }}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={compiledManifest.duration}
                activeShotLabel={activeShotLabel}
                activeDialogue={activeDialogue}
                externalRenderRef={externalRenderRef}
                onCanvasReady={setWebglCanvas}
                pauseInspectorControls={pauseInspector}
                inspectorAllowed={!deckOpen && !playModeOpen}
              />

              {/* Scrubber & Transport */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                <input
                  type="range"
                  min={0}
                  max={compiledManifest.duration}
                  step={0.02}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs transition"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>

                    <button
                      onClick={() => seek(0)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => pauseInspector.enterPauseInspect()}
                      disabled={isPlaying}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isPlaying
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
                      }`}
                    >
                      Pause Inspector
                    </button>

                    <button
                      onClick={() => setTtsEnabled(!ttsEnabled)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        ttsEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ttsEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4" /> Live TTS On
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" /> TTS Muted
                        </>
                      )}
                    </button>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    Tip: Drag the track-colored spline handles in the 3D scene (keep-out rings push them out on release)
                  </span>
                </div>
              </div>
            </div>

            <MultiTrackTimeline
              manifest={compiledManifest}
              rawScene={rawScene}
              onRawSceneChange={setRawScene}
              currentTime={currentTime}
              onSeek={seek}
            />

            <SymbolicAnchorTable
              table={compiledManifest.resolutionLog}
              onSeek={seek}
            />
          </div>

          {/* Right Column: Prosody Sliders & 8B Self-Healing Audit Log */}
          <div className="flex flex-col gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <ProsodyPanel
              ariaWpm={ariaWpm}
              onAriaWpmChange={setAriaWpm}
              zephyrWpm={zephyrWpm}
              onZephyrWpmChange={setZephyrWpm}
              interTurnPauseDelta={interTurnPauseDelta}
              onInterTurnPauseDeltaChange={setInterTurnPauseDelta}
            />

            <ArmIKEmotionPanel
              rawScene={rawScene}
              onRawSceneChange={setRawScene}
              compiled={compiledManifest}
            />

            <SanitizerLogPanel repairs={sanitizerRepairs} />
          </div>
        </div>
      </div>

      {playModeOpen && (
        <PlayModeOverlay
          manifest={compiledManifest}
          rawScene={rawScene}
          onClose={() => setPlayModeOpen(false)}
        />
      )}

      {deckOpen && (
        <ExportMasteringDeck
          webglCanvas={webglCanvas}
          duration={compiledManifest.duration}
          timeRef={timeRef}
          manifestRef={compiledManifestRef}
          shotLabelRef={shotLabelRef}
          externalRenderRef={externalRenderRef}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onSeek={seek}
          onClose={closeExportDeck}
        />
      )}
    </div>
  );
}
