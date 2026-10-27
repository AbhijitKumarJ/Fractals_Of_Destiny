import React from 'react';
import { Camera, Ghost } from 'lucide-react';

export interface PauseInspectHudProps {
  mode: 'off' | 'inspect' | 'snapback';
  orbitHint: string | null;
  snapPct: number;
}

export default function PauseInspectHud({
  mode,
  orbitHint,
  snapPct
}: PauseInspectHudProps) {
  if (mode === 'off') return null;

  if (mode === 'inspect') {
    return (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md border border-purple-500/50 px-4 py-2 rounded-xl text-xs text-purple-200 text-center pointer-events-none shadow-2xl">
        <div className="flex items-center justify-center gap-1.5 font-bold tracking-wider uppercase text-purple-300">
          <Ghost className="w-3.5 h-3.5" /> Pause Inspector · Free Roam
        </div>
        <div className="mt-0.5 text-[11px] text-slate-300">
          WASD move · Q/E descend/rise · drag look · click an actor/holo-core to orbit
          {orbitHint ? ` (orbiting ${orbitHint})` : ''} · Esc/P resume
        </div>
        <div className="mt-1 text-[10px] text-slate-500">
          Cyan wireframe = Ghost Director Frustum (where the camera will land)
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md border border-amber-500/50 px-4 py-2 rounded-xl text-xs text-amber-200 text-center pointer-events-none">
      <div className="flex items-center justify-center gap-1.5 font-bold tracking-wider uppercase text-amber-300">
        <Camera className="w-3.5 h-3.5" /> Bezier Snapback · Bullet-time resume
      </div>
      <div className="mt-1 w-56 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
        <div className="h-full bg-amber-400" style={{ width: `${snapPct}%` }} />
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400">
        0.06× → 1× timeline ramp · {snapPct}%
      </div>
    </div>
  );
}
