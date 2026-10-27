import React from 'react';
import { CompiledDialogueSegment } from '@chronos3d/schema';

export interface KaraokeSubtitleBarProps {
  activeDialogue: CompiledDialogueSegment | null;
  currentTime: number;
}

export default function KaraokeSubtitleBar({
  activeDialogue,
  currentTime
}: KaraokeSubtitleBarProps) {
  if (!activeDialogue) return null;

  return (
    <div className="absolute bottom-3 inset-x-5 flex justify-center pointer-events-none">
      <div className="max-w-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-xl text-center shadow-2xl">
        <div className="text-[10px] font-bold tracking-wider uppercase text-sky-400 mb-1">
          {activeDialogue.speaker} ({activeDialogue.id})
        </div>
        <p className="text-sm md:text-base leading-relaxed">
          {activeDialogue.words.map((w) => {
            const isWordActive = currentTime >= w.start && currentTime <= w.end;
            return (
              <span
                key={w.index}
                className={`inline-block mr-1.5 px-1 rounded transition-all ${
                  isWordActive
                    ? 'bg-sky-500 text-slate-950 font-bold scale-105'
                    : currentTime > w.end
                    ? 'text-white'
                    : 'text-slate-400'
                }`}
              >
                {w.word}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
