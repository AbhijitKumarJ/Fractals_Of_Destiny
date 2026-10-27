import { ShieldCheck } from 'lucide-react';
import { SanitizerRepairEntry } from '@chronos3d/compiler';

export default function SanitizerLogPanel({ repairs }: { repairs: SanitizerRepairEntry[] }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> 8B Self-Healing Sanitizer Log
        </span>
        <span className="text-[10px] font-mono text-slate-400">{repairs.length} Repairs</span>
      </div>

      <div className="space-y-2.5 overflow-y-auto pr-1">
        {repairs.map((rep, idx) => (
          <div
            key={idx}
            className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs"
          >
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {rep.ruleId}
              </span>
              <span className="text-slate-400">{rep.targetPath}</span>
            </div>
            <div className="font-mono text-[11px] space-y-0.5">
              <div className="text-rose-400 line-through">Before: {rep.beforeValue}</div>
              <div className="text-emerald-400 font-semibold">After: {rep.afterValue}</div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{rep.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
