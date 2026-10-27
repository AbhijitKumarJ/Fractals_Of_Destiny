import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import {
  CompiledSceneManifest,
  EmotionPreset,
  SymbolicSceneManifest
} from '@chronos3d/schema';

const EMOTION_OPTIONS: EmotionPreset[] = [
  'neutral',
  'happy',
  'concerned',
  'surprised',
  'focused',
  'determined'
];

const IK_TARGET_OPTIONS: { label: string; value: string }[] = [
  { label: 'none (release hand)', value: '' },
  { label: 'holo core', value: 'holo_core' },
  { label: 'Aria', value: 'actor_aria' },
  { label: 'Zephyr', value: 'actor_zephyr' }
];

interface ArmIKEmotionPanelProps {
  rawScene: SymbolicSceneManifest;
  onRawSceneChange: React.Dispatch<React.SetStateAction<SymbolicSceneManifest>>;
  compiled: CompiledSceneManifest;
}

const KF_INPUT_CLASS =
  'bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-sky-300 focus:border-sky-500 focus:outline-none flex-1 min-w-0';

export default function ArmIKEmotionPanel({
  rawScene,
  onRawSceneChange: setRawScene,
  compiled
}: ArmIKEmotionPanelProps) {
  const ikIdx = useMemo(
    () =>
      rawScene.tracks.findIndex(
        (t) => t.property === 'armIK' && t.targetId === 'actor_aria'
      ),
    [rawScene.tracks]
  );
  const emoIdx = useMemo(
    () =>
      rawScene.tracks.findIndex(
        (t) => t.property === 'facialEmotion' && t.targetId === 'actor_aria'
      ),
    [rawScene.tracks]
  );

  const compiledIk = compiled.tracks.find(
    (t) => t.property === 'armIK' && t.targetId === 'actor_aria'
  );
  const compiledEmo = compiled.tracks.find(
    (t) => t.property === 'facialEmotion' && t.targetId === 'actor_aria'
  );

  const resolvedBySymbolic = useMemo(() => {
    const map = new Map<string, number>();
    compiledIk?.ikKeyframes?.forEach((kf) => map.set(String(kf.symbolicTime), kf.time));
    compiledEmo?.keyframes?.forEach((kf) => map.set(String(kf.symbolicTime), kf.time));
    return map;
  }, [compiledIk, compiledEmo]);

  const updateTrack = (
    trackIdx: number,
    mutate: (draftTrack: SymbolicSceneManifest['tracks'][number]) => void
  ) => {
    setRawScene((prev) => {
      const clone: SymbolicSceneManifest = JSON.parse(JSON.stringify(prev));
      const track = clone.tracks[trackIdx];
      if (track) mutate(track);
      return clone;
    });
  };

  const resolvedLabel = (timeExpr: string | number) => {
    if (typeof timeExpr === 'number') return `${timeExpr.toFixed(2)}s`;
    const resolved = resolvedBySymbolic.get(String(timeExpr));
    return typeof resolved === 'number' ? `${resolved.toFixed(2)}s` : '—';
  };

  const ikTrack = ikIdx >= 0 ? rawScene.tracks[ikIdx] : null;
  const emoTrack = emoIdx >= 0 ? rawScene.tracks[emoIdx] : null;

  return (
    <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
        <span className="text-purple-400">&gt;</span> Arm IK &amp; Emotion Keyframes (Aria)
      </div>

      <div>
        <div className="text-[11px] font-mono text-purple-300 mb-1 flex items-center justify-between">
          <span>arm_ik · {ikTrack?.hand ?? 'right'} hand</span>
          {ikTrack && (
            <button
              onClick={() =>
                updateTrack(ikIdx, (draft) => {
                  draft.ikKeyframes?.push({ time: '@line_1.start', target: null, weight: 0 });
                })
              }
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px]"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {ikIdx < 0 && (
            <div className="text-[11px] text-slate-500">
              No armIK symbolic track found in scene.
            </div>
          )}
          {ikIdx >= 0 && (rawScene.tracks[ikIdx].ikKeyframes ?? []).map((kf, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 flex-wrap">
              <input
                value={String(kf.time)}
                onChange={(e) =>
                  updateTrack(ikIdx, (draft) => {
                    if (draft.ikKeyframes) draft.ikKeyframes[rowIdx].time = e.target.value;
                  })
                }
                className={KF_INPUT_CLASS}
                placeholder="@line_2.word(&quot;surge&quot;) - 0.05"
              />
              <span className="text-[10px] font-mono text-slate-500 w-14 text-right shrink-0">
                → {resolvedLabel(kf.time)}
              </span>
              <select
                value={kf.target && typeof kf.target === 'string' ? kf.target : ''}
                onChange={(e) =>
                  updateTrack(ikIdx, (draft) => {
                    if (draft.ikKeyframes) {
                      const tgt: string | null =
                        e.target.value === '' ? null : e.target.value;
                      draft.ikKeyframes[rowIdx].target = tgt;
                      if (tgt === 'holo_core' && !draft.ikKeyframes[rowIdx].surfaceOffset) {
                        draft.ikKeyframes[rowIdx].surfaceOffset = [-0.22, 0, 0.18];
                      }
                    }
                  })
                }
                className={`${KF_INPUT_CLASS} flex-none w-28`}
              >
                {IK_TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={kf.weight}
                onChange={(e) =>
                  updateTrack(ikIdx, (draft) => {
                    if (draft.ikKeyframes) {
                      draft.ikKeyframes[rowIdx].weight = parseFloat(e.target.value);
                    }
                  })
                }
                className="w-20 accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono text-purple-300 w-8 shrink-0">
                {kf.weight.toFixed(2)}
              </span>
              <button
                onClick={() =>
                  updateTrack(ikIdx, (draft) => {
                    draft.ikKeyframes?.splice(rowIdx, 1);
                  })
                }
                className="p-1 text-slate-500 hover:text-rose-400"
                title="Delete keyframe"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-mono text-amber-300 mb-1 flex items-center justify-between">
          <span>facial_emotion</span>
          {emoTrack && (
            <button
              onClick={() =>
                updateTrack(emoIdx, (draft) => {
                  draft.keyframes?.push({ time: '@line_1.start', value: 'neutral' });
                })
              }
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 text-[10px]"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {emoIdx < 0 && (
            <div className="text-[11px] text-slate-500">
              No facialEmotion symbolic track found in scene.
            </div>
          )}
          {emoIdx >= 0 &&
            (rawScene.tracks[emoIdx].keyframes ?? []).map((kf, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1.5 flex-wrap">
              <input
                value={String(kf.time)}
                onChange={(e) =>
                  updateTrack(emoIdx, (draft) => {
                    if (draft.keyframes) draft.keyframes[rowIdx].time = e.target.value;
                  })
                }
                className={KF_INPUT_CLASS}
                placeholder="@line_2.word(&quot;surge&quot;)"
              />
              <span className="text-[10px] font-mono text-slate-500 w-14 text-right shrink-0">
                → {resolvedLabel(kf.time)}
              </span>
              <select
                value={String(kf.value)}
                onChange={(e) =>
                  updateTrack(emoIdx, (draft) => {
                    if (draft.keyframes) draft.keyframes[rowIdx].value = e.target.value;
                  })
                }
                className={`${KF_INPUT_CLASS} flex-none w-28`}
              >
                {EMOTION_OPTIONS.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  updateTrack(emoIdx, (draft) => {
                    draft.keyframes?.splice(rowIdx, 1);
                  })
                }
                className="p-1 text-slate-500 hover:text-rose-400"
                title="Delete keyframe"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 leading-relaxed">
        Edits write into the symbolic manifest and recompile live (sanitizer may retime).
        Target <em>holo_core</em> auto-fills the default surface offset; gaze &amp; clip
        keys stay manifest-file-authored.
      </div>
    </div>
  );
}
