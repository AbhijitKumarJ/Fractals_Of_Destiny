import { Sliders } from 'lucide-react';

export default function ProsodyPanel({
  ariaWpm,
  onAriaWpmChange,
  zephyrWpm,
  onZephyrWpmChange,
  interTurnPauseDelta,
  onInterTurnPauseDeltaChange
}: {
  ariaWpm: number;
  onAriaWpmChange: (wpm: number) => void;
  zephyrWpm: number;
  onZephyrWpmChange: (wpm: number) => void;
  interTurnPauseDelta: number;
  onInterTurnPauseDeltaChange: (delta: number) => void;
}) {
  return (
    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
        <Sliders className="w-4 h-4 text-sky-400" /> TTS Voice Prosody WPM Time-Warp
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-slate-400">Aria WPM</span>
          <span className="text-sky-400 font-bold">{ariaWpm} WPM</span>
        </div>
        <input
          type="range"
          min={90}
          max={220}
          step={5}
          value={ariaWpm}
          onChange={(e) => onAriaWpmChange(parseInt(e.target.value, 10))}
          className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-slate-400">Zephyr WPM</span>
          <span className="text-emerald-400 font-bold">{zephyrWpm} WPM</span>
        </div>
        <input
          type="range"
          min={90}
          max={220}
          step={5}
          value={zephyrWpm}
          onChange={(e) => onZephyrWpmChange(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-slate-400">Inter-Turn Pause Delta</span>
          <span className="text-amber-300 font-bold">
            {interTurnPauseDelta >= 0 ? '+' : ''}
            {interTurnPauseDelta.toFixed(2)}s
          </span>
        </div>
        <input
          type="range"
          min={-0.2}
          max={1.0}
          step={0.05}
          value={interTurnPauseDelta}
          onChange={(e) => onInterTurnPauseDeltaChange(parseFloat(e.target.value))}
          className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
}
