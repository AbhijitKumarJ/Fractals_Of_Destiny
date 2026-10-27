import { Cpu } from 'lucide-react';

export default function SymbolicAnchorTable({
  table,
  onSeek
}: {
  table: {
    sourceCategory: 'Dialogue' | 'Spline' | 'Gesture/Prop' | 'ArmIK' | 'Camera';
    targetLabel: string;
    symbolicExpr: string;
    resolvedSeconds: number;
    matchedTokenInfo: string;
  }[];
  onSeek: (t: number) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
          <Cpu className="w-4 h-4" />
          Compiled Symbolic Anchor Table (Pass 1–4 Output)
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Click any row to seek playhead
        </span>
      </div>

      <div className="overflow-x-auto max-h-56 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
              <th className="py-2 px-2.5">Category</th>
              <th className="py-2 px-2.5">Target Property</th>
              <th className="py-2 px-2.5">Symbolic Expression</th>
              <th className="py-2 px-2.5">Resolved</th>
              <th className="py-2 px-2.5">Binding Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {table.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onSeek(row.resolvedSeconds)}
                className="cursor-pointer hover:bg-slate-800/60 text-slate-300 transition"
              >
                <td className="py-2 px-2.5 text-sky-300">{row.sourceCategory}</td>
                <td className="py-2 px-2.5 font-sans text-slate-200">{row.targetLabel}</td>
                <td className="py-2 px-2.5 text-amber-300">{row.symbolicExpr}</td>
                <td className="py-2 px-2.5 text-sky-400 font-bold">
                  {row.resolvedSeconds.toFixed(2)}s
                </td>
                <td className="py-2 px-2.5 text-slate-400 font-sans">{row.matchedTokenInfo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
