import React, { useMemo, useRef, useState } from 'react';
import { Eye, Footprints, Hand, MessageSquare, Clapperboard } from 'lucide-react';
import { CompiledSceneManifest, SymbolicSceneManifest } from '@chronos3d/schema';

interface SnapCandidate {
  time: number;
  kind: 'word' | 'lineStart' | 'lineEnd' | 'edge' | 'time';
  lineId: string;
  word: string | null;
}

interface NleChip extends SnapCandidate {
  left: number;
  width: number;
  color: string;
}

interface SpanItem {
  key: string;
  kind: 'dialogue' | 'spline' | 'shot';
  id: string;
  label: string;
  start: number;
  end: number;
  rawIdx: number;
  segIdx?: number;
}

interface MarkerItem {
  key: string;
  kind: 'arm' | 'gaze';
  id: string;
  label: string;
  time: number;
  spanEnd: number;
  trackIdx: number;
  kfIdx: number;
}

interface DragState {
  itemKey: string;
  mode: 'body' | 'start' | 'end' | 'time';
  startX: number;
  origStart: number;
  origEnd: number;
  moved: boolean;
}

interface DragPreview {
  itemKey: string;
  delta: number;
  snapAt: number | null;
}

const SNAP_THRESHOLD = 0.09;
const LANE_META = [
  { kind: 'dialogue', label: 'Dialogue', icon: MessageSquare, chip: 'border-sky-500/50 bg-sky-500/30 text-sky-200' },
  { kind: 'spline', label: 'Gait · Spline', icon: Footprints, chip: 'border-emerald-500/50 bg-emerald-500/30 text-emerald-200' },
  { kind: 'arm', label: 'Arm IK', icon: Hand, chip: 'border-amber-500/60 bg-amber-500/40 text-amber-200' },
  { kind: 'gaze', label: 'Gaze', icon: Eye, chip: 'border-violet-500/60 bg-violet-500/40 text-violet-200' },
  { kind: 'shot', label: 'Camera', icon: Clapperboard, chip: 'border-rose-500/50 bg-rose-500/30 text-rose-200' }
] as const;

export default function MultiTrackTimeline({
  manifest,
  rawScene,
  onRawSceneChange,
  currentTime,
  onSeek
}: {
  manifest: CompiledSceneManifest;
  rawScene: SymbolicSceneManifest;
  onRawSceneChange: React.Dispatch<React.SetStateAction<SymbolicSceneManifest>>;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const duration = manifest.duration;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { spans, markers, chips, snapTimes } = useMemo(() => {
    const spans: SpanItem[] = [];
    const markers: MarkerItem[] = [];

    manifest.dialogue.forEach((line) => {
      const rawIdx = rawScene.dialogue.findIndex((rd) => rd.id === line.id);
      if (rawIdx < 0) return;
      spans.push({
        key: `dialogue:${line.id}`,
        kind: 'dialogue',
        id: line.id,
        label: `${line.speaker} · ${line.id}`,
        start: line.start,
        end: line.end,
        rawIdx
      });
    });

    manifest.tracks.forEach((ct) => {
      const rawIdx = rawScene.tracks.findIndex((rt) => rt.id === ct.id);
      if (rawIdx < 0) return;
      const raw = rawScene.tracks[rawIdx];

      if (ct.property === 'splinePath' && ct.segments) {
        ct.segments.forEach((seg, segIdx) => {
          spans.push({
            key: `spline:${raw.id}:${segIdx}`,
            kind: 'spline',
            id: `${raw.id}#s${segIdx}`,
            label: `${raw.targetId} walk path`,
            start: seg.startTime,
            end: seg.endTime,
            rawIdx,
            segIdx
          });
        });
      } else if (ct.property === 'armIK' && ct.ikKeyframes) {
        ct.ikKeyframes.forEach((ik, kfIdx) => {
          const next = ct.ikKeyframes![kfIdx + 1];
          markers.push({
            key: `arm:${raw.id}:${kfIdx}`,
            kind: 'arm',
            id: `${raw.id}#k${kfIdx}`,
            label: `IK → ${typeof ik.target === 'string' ? ik.target : 'target3D'} (w=${ik.weight})`,
            time: ik.time,
            spanEnd: next ? next.time : duration,
            trackIdx: rawIdx,
            kfIdx
          });
        });
      } else if (ct.property === 'lookAtTarget' && ct.keyframes) {
        ct.keyframes.forEach((kf, kfIdx) => {
          const rawKf = raw.keyframes?.[kfIdx];
          if (!rawKf) return;
          const next = ct.keyframes![kfIdx + 1];
          const valStr =
            typeof kf.value === 'string'
              ? kf.value.replace('actor_', '@')
              : 'vec3 target';
          markers.push({
            key: `gaze:${raw.id}:${kfIdx}`,
            kind: 'gaze',
            id: `${raw.id}#k${kfIdx}`,
            label: `gaze → ${valStr}`,
            time: kf.time,
            spanEnd: next ? next.time : duration,
            trackIdx: rawIdx,
            kfIdx
          });
        });
      }
    });

    rawScene.cameraShots.forEach((shot, shotIdx) => {
      const compiled = manifest.cameraShots.find((cs) => cs.id === shot.id);
      if (!compiled) return;
      spans.push({
        key: `shot:${shot.id}`,
        kind: 'shot',
        id: shot.id,
        label: `${shot.shotType}${shot.dollyMode ? ` · ${shot.dollyMode}` : ''}`,
        start: compiled.startTime,
        end: compiled.endTime,
        rawIdx: shotIdx
      });
    });

    const chips: NleChip[] = [];
    manifest.dialogue.forEach((line, lineIdx) => {
      const rawLine = rawScene.dialogue[lineIdx];
      if (!rawLine) return;
      const isAria = line.speakerId === 'actor_aria';
      chips.push({
        time: line.start,
        kind: 'lineStart',
        lineId: rawLine.id,
        word: null,
        left: (line.start / duration) * 100,
        width: 2.5,
        color: isAria ? 'bg-sky-400/80' : 'bg-emerald-400/80'
      });
      line.words.forEach((w) => {
        chips.push({
          time: w.start,
          kind: 'word',
          lineId: rawLine.id,
          word: cleanWord(w.word),
          left: (w.start / duration) * 100,
          width: Math.max(2.2, ((w.end - w.start) / duration) * 100),
          color: isAria ? 'bg-sky-400/60' : 'bg-emerald-400/60'
        });
      });
      chips.push({
        time: line.end,
        kind: 'lineEnd',
        lineId: rawLine.id,
        word: null,
        left: (line.end / duration) * 100,
        width: 2.5,
        color: isAria ? 'bg-sky-400/80' : 'bg-emerald-400/80'
      });
    });

    const snapTimes: SnapCandidate[] = [
      { time: 0, kind: 'edge', lineId: '', word: null },
      { time: duration, kind: 'edge', lineId: '', word: null }
    ];
    chips.forEach((chip) =>
      snapTimes.push({ time: chip.time, kind: chip.kind, lineId: chip.lineId, word: chip.word })
    );
    spans.forEach((s) => {
      snapTimes.push({ time: s.start, kind: 'edge', lineId: s.id, word: null });
      snapTimes.push({ time: s.end, kind: 'edge', lineId: s.id, word: null });
    });
    markers.forEach((m) => snapTimes.push({ time: m.time, kind: 'time', lineId: m.id, word: null }));
    snapTimes.sort((a, b) => a.time - b.time);

    return { spans, markers, chips, snapTimes };
  }, [manifest, rawScene, duration]);

  const pxToSeconds = () => duration / (bodyRef.current?.getBoundingClientRect().width || 1);

  const findSnap = (t: number): SnapCandidate | null => {
    let best: SnapCandidate | null = null;
    let bestDist = SNAP_THRESHOLD;
    for (const cand of snapTimes) {
      const dist = Math.abs(cand.time - t);
      if (dist < bestDist) {
        bestDist = dist;
        best = cand;
      }
    }
    return best;
  };

  const handleItemPointerDown = (
    ev: React.PointerEvent,
    itemKey: string,
    mode: DragState['mode'],
    origStart: number,
    origEnd: number
  ) => {
    ev.stopPropagation();
    setSelectedKey(itemKey);
    dragStateRef.current = { itemKey, mode, startX: ev.clientX, origStart, origEnd, moved: false };
  };

  const handlePointerMove = (ev: React.PointerEvent) => {
    const st = dragStateRef.current;
    if (!st) return;
    if (Math.abs(ev.clientX - st.startX) > 3) st.moved = true;
    let delta = (ev.clientX - st.startX) * pxToSeconds();
    const boundary = st.mode === 'end' ? st.origEnd : st.origStart;
    const snap = findSnap(boundary + delta);
    if (snap) delta = snap.time - boundary;
    setPreview({ itemKey: st.itemKey, delta, snapAt: snap ? snap.time : null });
  };

  const handlePointerUp = () => {
    const st = dragStateRef.current;
    const pv = preview;
    dragStateRef.current = null;
    setPreview(null);
    if (!st || !pv || !st.moved) return;

    const item = spans.find((s) => s.key === pv.itemKey) ?? markers.find((m) => m.key === pv.itemKey);
    if (!item) return;

    const anchorExpr = (t: number) => {
      const snap = findSnap(t);
      if (!snap) return Number(t.toFixed(3));
      if (snap.kind === 'word') return `@${snap.lineId}.word("${snap.word}")`;
      if (snap.kind === 'lineStart') return `@${snap.lineId}.start`;
      if (snap.kind === 'lineEnd') return `@${snap.lineId}.end`;
      return Number(t.toFixed(3));
    };

    onRawSceneChange((prev) => {
      const clone: SymbolicSceneManifest = JSON.parse(JSON.stringify(prev));
      const round = (t: number) => Math.max(0, Math.round(t * 1000) / 1000);

      if (isSpan(item)) {
        const minGap = item.kind === 'dialogue' ? 0.2 : 0.15;
        if (item.kind === 'dialogue') {
          const newStart = Math.max(0, round(st.origStart + pv.delta));
          if (newStart >= 0) clone.dialogue[item.rawIdx].start = newStart;
        } else if (item.kind === 'spline') {
          const seg = clone.tracks[item.rawIdx]?.segments?.[item.segIdx ?? 0];
          if (!seg) return clone;
          if (st.mode === 'body') {
            seg.startTime = round(st.origStart + pv.delta);
            seg.endTime = round(st.origEnd + pv.delta);
          } else if (st.mode === 'start') {
            seg.startTime = round(Math.min(st.origStart + pv.delta, st.origEnd - minGap));
          } else {
            seg.endTime = round(Math.max(st.origEnd + pv.delta, st.origStart + minGap));
          }
        } else {
          const shot = clone.cameraShots[item.rawIdx];
          if (!shot) return clone;
          if (st.mode === 'body') {
            shot.startTime = round(st.origStart + pv.delta);
            shot.endTime = round(st.origEnd + pv.delta);
          } else if (st.mode === 'start') {
            shot.startTime = round(Math.min(st.origStart + pv.delta, st.origEnd - minGap));
          } else {
            shot.endTime = round(Math.max(st.origEnd + pv.delta, st.origStart + minGap));
          }
        }
      } else {
        const track = clone.tracks[item.trackIdx];
        if (!track) return clone;
        const t = anchorExpr(st.origStart + pv.delta);
        if (item.kind === 'arm' && track.ikKeyframes) {
          track.ikKeyframes[item.kfIdx].time = t;
        } else if (item.kind === 'gaze' && track.keyframes) {
          track.keyframes[item.kfIdx].time = t;
        }
      }
      return clone;
    });
  };

  const handleBodyPointerDown = (ev: React.PointerEvent) => {
    if (dragStateRef.current) return;
    setSelectedKey(null);
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = ((ev.clientX - rect.left) / rect.width) * duration;
    onSeek(Math.max(0, Math.min(duration, t)));
  };

  const applySnapToSelection = (chip: NleChip) => {
    const targetItem =
      spans.find((s) => s.key === selectedKey) ?? markers.find((m) => m.key === selectedKey);
    if (!targetItem) {
      onSeek(chip.time);
      return;
    }

    const expr =
      chip.kind === 'word'
        ? `@${chip.lineId}.word("${chip.word}")`
        : chip.kind === 'lineStart'
        ? `@${chip.lineId}.start`
        : `@${chip.lineId}.end`;

    onRawSceneChange((prev) => {
      const clone: SymbolicSceneManifest = JSON.parse(JSON.stringify(prev));
      if (isSpan(targetItem) && targetItem.kind === 'dialogue') {
        if (chip.kind !== 'lineEnd') clone.dialogue[targetItem.rawIdx].start = expr;
      } else if (isSpan(targetItem) && targetItem.kind === 'spline') {
        const seg = clone.tracks[targetItem.rawIdx]?.segments?.[targetItem.segIdx ?? 0];
        if (!seg) return clone;
        if (chip.kind === 'lineEnd') seg.endTime = expr;
        else seg.startTime = expr;
      } else if (isSpan(targetItem)) {
        const shot = clone.cameraShots[targetItem.rawIdx];
        if (!shot) return clone;
        if (chip.kind === 'lineEnd') shot.endTime = expr;
        else shot.startTime = expr;
      } else {
        const track = clone.tracks[targetItem.trackIdx];
        if (!track) return clone;
        if (targetItem.kind === 'arm' && track.ikKeyframes) {
          track.ikKeyframes[targetItem.kfIdx].time = expr;
        } else if (targetItem.kind === 'gaze' && track.keyframes) {
          track.keyframes[targetItem.kfIdx].time = expr;
        }
      }
      return clone;
    });
  };

  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let s = 0; s <= duration; s += 0.5) arr.push(Number(s.toFixed(1)));
    return arr;
  }, [duration]);

  const selectedItem =
    spans.find((s) => s.key === selectedKey) ?? markers.find((m) => m.key === selectedKey) ?? null;
  const pct = (t: number) => (t / duration) * 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
          <Clapperboard className="w-4 h-4" /> 5-Lane NLE Timeline
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Drag edges/body to edit · click a word chip with a block selected to snap it to a word anchor
        </span>
      </div>

      <div className="flex gap-2 select-none">
        <div className="w-28 shrink-0 pt-[22px] grid grid-rows-5 justify-items-end text-right font-mono text-[10px] uppercase tracking-wide text-slate-400">
          {LANE_META.map((lane) => (
            <div key={lane.kind} className="flex items-center justify-end gap-1.5">
              <span>{lane.label}</span>
              <lane.icon className="w-3 h-3" />
            </div>
          ))}
        </div>

        <div
          ref={bodyRef}
          className="relative flex-1 h-[172px] bg-slate-950/70 border border-slate-800 rounded-lg overflow-hidden cursor-crosshair"
          onPointerDown={handleBodyPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {ticks.map((s) => (
            <div
              key={s}
              className="absolute top-0 bottom-0 border-l border-slate-800/70 pointer-events-none"
              style={{ left: `${pct(s)}%` }}
            >
              {Number.isInteger(s) && (
                <span className="absolute top-0.5 -translate-x-1/2 font-mono text-[9px] text-slate-500">
                  {s}s
                </span>
              )}
            </div>
          ))}

          {LANE_META.map((lane, laneIdx) => {
            const top = 22 + laneIdx * 30;
            const laneItems: (SpanItem | MarkerItem)[] =
              lane.kind === 'arm'
                ? markers.filter((m) => m.kind === 'arm')
                : lane.kind === 'gaze'
                ? markers.filter((m) => m.kind === 'gaze')
                : spans.filter((sp) => sp.kind === lane.kind);
            const isMarkerLane = lane.kind === 'arm' || lane.kind === 'gaze';
            return (
              <div
                key={lane.kind}
                className="absolute left-0 right-0 h-7 border-b border-slate-800/40"
                style={{ top }}
              >
                {isMarkerLane &&
                  laneItems
                    .filter((m): m is MarkerItem => m.kind === 'arm' || m.kind === 'gaze')
                    .map((m) =>
                      m.spanEnd > m.time + 0.01 && m.spanEnd < duration - 0.01 ? (
                      <span
                        key={`band-${m.key}`}
                        className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm pointer-events-none"
                        style={{
                          left: `${pct(m.time)}%`,
                          width: `${pct(m.spanEnd) - pct(m.time)}%`,
                          backgroundColor:
                            m.kind === 'arm' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)'
                        }}
                      />
                    ) : null
                  )}
                {laneItems.map((item) => {
                  const delta = preview && preview.itemKey === item.key ? preview.delta : 0;
                  if (isSpan(item)) {
                    const start = item.start + delta;
                    const end = item.end + delta;
                    return (
                      <div
                        key={item.key}
                        onPointerDown={(e) =>
                          handleItemPointerDown(e, item.key, 'body', item.start, item.end)
                        }
                        className={`absolute top-1 bottom-1 border rounded-md cursor-grab active:cursor-grabbing ${
                          LANE_META.find((l) => l.kind === lane.kind)!.chip
                        } ${selectedKey === item.key ? 'ring-2 ring-white/80 z-10' : ''}`}
                        style={{
                          left: `${pct(Math.max(0, start))}%`,
                          width: `${Math.max(0.3, pct(end) - pct(start))}%`
                        }}
                        title={`${item.id} — ${item.label}`}
                      >
                        <span className="block text-[9px] font-bold truncate px-1 pt-0.5">{item.label}</span>
                        {item.kind !== 'dialogue' && (
                          <>
                            <span
                              onPointerDown={(e) =>
                                handleItemPointerDown(e, item.key, 'start', item.start, item.end)
                              }
                              className="absolute -left-0.5 top-0 bottom-0 w-2 cursor-ew-resize"
                            />
                            <span
                              onPointerDown={(e) =>
                                handleItemPointerDown(e, item.key, 'end', item.start, item.end)
                              }
                              className="absolute -right-0.5 top-0 bottom-0 w-2 cursor-ew-resize"
                            />
                          </>
                        )}
                      </div>
                    );
                  }
                  const t = item.time + delta;
                  return (
                    <button
                      key={item.key}
                      onPointerDown={(e) =>
                        handleItemPointerDown(e, item.key, 'time', item.time, item.time)
                      }
                      className={`absolute w-3 h-3 rounded-full border-2 cursor-ew-resize ${
                        LANE_META.find((l) => l.kind === lane.kind)!.chip
                      } ${selectedKey === item.key ? 'ring-2 ring-white/80 z-10' : ''}`}
                      style={{ left: `${pct(t)}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                      title={`${item.id} — ${item.label}`}
                    />
                  );
                })}
              </div>
            );
          })}

          {chips.map((chip, idx) => (
            <button
              key={`${chip.kind}-${chip.time.toFixed(3)}-${idx}`}
              className={`absolute h-2 rounded-sm opacity-80 hover:opacity-100 hover:h-3 ${
                selectedKey ? 'ring-1 ring-white/40' : ''
              } ${chip.color}`}
              style={{ left: `${chip.left}%`, width: `${chip.width}%`, top: 2 }}
              title={`${chip.kind === 'word' ? 'word' : 'line'} anchor @ ${chip.time.toFixed(2)}s${
                chip.word ? ` · "${chip.word}"` : ''
              } — click to ${selectedKey ? 'snap selection' : 'seek'}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                applySnapToSelection(chip);
              }}
            />
          ))}

          {preview?.snapAt != null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-20 pointer-events-none"
              style={{ left: `${pct(preview.snapAt)}%` }}
            />
          )}

          <div
            className="absolute top-0 bottom-0 w-px bg-white/90 z-30 pointer-events-none"
            style={{ left: `${pct(Math.max(0, Math.min(duration, currentTime)))}%` }}
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="font-mono">
          {selectedItem
            ? `Selected · ${selectedItem.id} — ${selectedItem.label}`
            : 'Nothing selected — click a block or marker, then click a word chip to snap'}
        </span>
        <span>
          {spans.length} spans · {markers.length} keyframes · {chips.length} anchors
        </span>
      </div>
    </div>
  );
}

function isSpan(item: SpanItem | MarkerItem): item is SpanItem {
  return item.kind === 'dialogue' || item.kind === 'spline' || item.kind === 'shot';
}

function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}
