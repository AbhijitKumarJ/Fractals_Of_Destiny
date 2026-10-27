import React from 'react';
import { DecisionChoice, SymbolicDecisionPrompt } from '@chronos3d/schema';

export interface DecisionCardModalProps {
  decision: SymbolicDecisionPrompt;
  countdownSec: number;
  isChoiceUnlocked: (choice: DecisionChoice) => boolean;
  onSelectChoice: (choice: DecisionChoice) => void;
}

export const DecisionCardModal: React.FC<DecisionCardModalProps> = ({
  decision,
  countdownSec,
  isChoiceUnlocked,
  onSelectChoice
}) => {
  const pct = Math.max(0, Math.min(100, (countdownSec / decision.timeoutSeconds) * 100));

  return (
    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-20">
      <div className="max-w-md w-full bg-slate-900 border-2 border-sky-500/60 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Interactive Branch Decision
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800">
            {countdownSec}s
          </span>
        </div>

        <p className="text-sm font-semibold text-white">{decision.promptText}</p>

        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-2">
          {decision.choices.map((choice) => {
            const unlocked = isChoiceUnlocked(choice);
            return (
              <button
                key={choice.id}
                disabled={!unlocked}
                onClick={() => onSelectChoice(choice)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                  unlocked
                    ? 'bg-slate-950 border-slate-700 hover:border-sky-400 text-white cursor-pointer'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <div className="font-semibold">{choice.label}</div>
                {choice.requiredItemId && (
                  <div className="text-[10px] font-mono text-sky-400 mt-1">
                    Requires Item: {choice.requiredItemId}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
