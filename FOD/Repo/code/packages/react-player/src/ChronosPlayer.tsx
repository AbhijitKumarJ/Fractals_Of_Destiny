import React, { useMemo } from 'react';
import { SymbolicSceneManifest } from '@chronos3d/schema';
import { compileSymbolicManifest, sanitizeAndRepairLLMScene } from '@chronos3d/compiler';
import { useTimelineClock } from './hooks/useTimelineClock';

export interface ChronosPlayerProps {
  manifest: SymbolicSceneManifest;
  autoSanitize?: boolean;
  autoPlay?: boolean;
}

export const ChronosPlayer: React.FC<ChronosPlayerProps> = ({
  manifest,
  autoSanitize = true,
  autoPlay = true
}) => {
  const compiled = useMemo(() => {
    const clean = autoSanitize
      ? sanitizeAndRepairLLMScene(manifest).repairedManifest
      : manifest;
    return compileSymbolicManifest(clean);
  }, [manifest, autoSanitize]);

  const { isPlaying, setIsPlaying, currentTime, seek } = useTimelineClock(
    compiled.duration,
    autoPlay
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-white">{compiled.title}</span>
        <span className="font-mono text-sky-400">
          {currentTime.toFixed(2)}s / {compiled.duration.toFixed(2)}s
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={compiled.duration}
        step={0.02}
        value={currentTime}
        onChange={(e) => seek(parseFloat(e.target.value))}
        className="w-full accent-sky-400"
      />

      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};
