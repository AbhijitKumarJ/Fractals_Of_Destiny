import { GitBranch } from 'lucide-react';

interface BranchGraphEditorProps {
  sceneTitle: string;
  dialogueCount: number;
  hasDecision: boolean;
  choiceCount: number;
  promptText?: string;
}

export default function BranchGraphEditor({
  sceneTitle,
  dialogueCount,
  hasDecision,
  choiceCount,
  promptText
}: BranchGraphEditorProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <GitBranch className="w-4 h-4" /> Branch Graph Editor (FR-11)
          </div>
          <h1 className="text-xl font-bold text-white mt-1">{sceneTitle}</h1>
          <p className="text-sm text-slate-400">
            Decision checkpoints, branch DAG traversal and per-choice manifest versioning will be visualized here
            via <code>useWorldStateDAG</code>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="text-lg font-bold text-white">{hasDecision ? 1 : 0}</div>
            <div className="text-[11px] text-slate-400">Decision checkpoints</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="text-lg font-bold text-white">{choiceCount}</div>
            <div className="text-[11px] text-slate-400">Choices</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="text-lg font-bold text-white">{dialogueCount}</div>
            <div className="text-[11px] text-slate-400">Dialogue lines</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Decision prompt preview
          </div>
          <p className="text-sm text-slate-300 font-mono">
            {promptText || 'No decision defined in this scene — add `decision` to the manifest.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Runtime DAG wiring (P2-T4)
          </div>
          <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-4">
            <li>
              Play Mode (Studio Workspace header) mounts the compiled manifest in a dedicated
              player viewport via the shared{' '}
              <code className="text-sky-400">stageEngine</code> evaluator.
            </li>
            <li>
              <code className="text-sky-400">useWorldStateDAG</code> seeds{' '}
              <code>PersistentWorldState</code>; when the clock crosses{' '}
              <code className="text-sky-400">decision.triggerTime</code>, playback pauses and{' '}
              <code>DecisionCardModal</code> opens with a{' '}
              <code>timeoutSeconds</code> countdown (timeout auto-applies{' '}
              <code>defaultChoiceId</code>).
            </li>
            <li>
              Selecting a choice applies{' '}
              <code className="text-sky-400">applyChoiceAndBranch</code> → grants items, sets
              flags, pushes a checkpoint snapshot, then resumes playback.
            </li>
            <li>
              Locked choices (<code>requiredItemId</code> / <code>requiredFlag</code> not held)
              render disabled per <code>isChoiceUnlocked</code>.
            </li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Checkpoint snapshot restore and DAG node-graph editing (drag, reflow) remain deferred to a
            later phase.
          </div>
          <button
            disabled
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
          >
            Edit Branch Graph — Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}
