import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, Loader2, Square, X } from 'lucide-react';
import { CompiledSceneManifest } from '@chronos3d/schema';
import {
  compositeWebGLAndSubtitlesTo2DCanvas,
  probeSupportedVideoMimeType,
  renderOfflineWithWebCodecs,
  startCanvasMediaRecorder
} from '@chronos3d/video-exporter';

type DeckStatus = 'idle' | 'recording' | 'encoding' | 'done' | 'failed';

interface ExportMasteringDeckProps {
  webglCanvas: HTMLCanvasElement | null;
  duration: number;
  timeRef: React.MutableRefObject<number>;
  manifestRef: React.MutableRefObject<CompiledSceneManifest>;
  shotLabelRef: React.MutableRefObject<string>;
  externalRenderRef: React.MutableRefObject<((t: number) => void) | null>;
  onPause: () => void;
  onPlay: () => void;
  onSeek: (t: number) => void;
  onClose: () => void;
}

const RES_PRESETS = [
  { id: '720p', width: 1280, height: 720 },
  { id: '1080p', width: 1920, height: 1080 }
] as const;

const FPS_PRESETS = [24, 30, 60] as const;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function ExportMasteringDeck({
  webglCanvas,
  duration,
  timeRef,
  manifestRef,
  shotLabelRef,
  externalRenderRef,
  onPause,
  onPlay,
  onSeek,
  onClose
}: ExportMasteringDeckProps) {
  const capabilities = useMemo(
    () => ({
      probe: probeSupportedVideoMimeType(),
      webCodecs: typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
    }),
    []
  );

  const [status, setStatus] = useState<DeckStatus>('idle');
  const [fps, setFps] = useState<number>(24);
  const [resPreset, setResPreset] = useState<(typeof RES_PRESETS)[number]['id']>('720p');
  const [bitrateMbps, setBitrateMbps] = useState<number>(12);
  const [progress, setProgress] = useState<{ done: number; total: number | null } | null>(null);
  const [result, setResult] = useState<{
    url: string;
    filename: string;
    mimeLabel: string;
    sizeBytes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compositeRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<{ stopAndExport: () => Promise<RecordedArtifactShape> } | null>(null);

  interface RecordedArtifactShape {
    url: string;
    mimeType: string;
    extension: 'mp4' | 'webm';
    sizeBytes: number;
  }

  const resolveFrame = (t: number) => {
    const manifest = manifestRef.current;
    const composite = compositeRef.current;
    if (!composite || !webglCanvas) return null;
    const ctx = composite.getContext('2d')!;
    const activeLine =
      manifest.dialogue.find(
        (d) => t >= d.start && t <= d.end
      ) ?? null;
    compositeWebGLAndSubtitlesTo2DCanvas(
      ctx,
      webglCanvas,
      t,
      manifest.duration,
      shotLabelRef.current,
      activeLine
    );
    return { composite, ctx };
  };

  const stopRealtimeCapture = async () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return;
    const artifact = await recorder.stopAndExport();
    setResult({
      url: artifact.url,
      filename: `chronos_master.${artifact.extension}`,
      mimeLabel: `Realtime · ${artifact.mimeType}`,
      sizeBytes: artifact.sizeBytes
    });
    setStatus('done');
  };

  const startRealtime = () => {
    if (!webglCanvas || status === 'recording' || status === 'encoding') return;
    const preset = RES_PRESETS.find((r) => r.id === resPreset)!;
    const composite = compositeRef.current!;
    composite.width = preset.width;
    composite.height = preset.height;
    compositeRef.current = composite;
    onSeek(0);
    onPlay();
    const handle = startCanvasMediaRecorder(composite, null, fps);
    recorderRef.current = handle;
    setStatus('recording');

    const loop = () => {
      const manifest = manifestRef.current;
      const t = Math.min(timeRef.current, manifest.duration);
      resolveFrame(t);
      setProgress({ done: t, total: manifest.duration });
      if (t >= manifest.duration - 0.02) {
        stopRealtimeCapture();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const startOffline = async () => {
    if (!webglCanvas || !capabilities.webCodecs || status === 'recording' || status === 'encoding')
      return;
    const preset = RES_PRESETS.find((r) => r.id === resPreset)!;
    const composite = compositeRef.current!;
    composite.width = preset.width;
    composite.height = preset.height;
    onPause();
    setStatus('encoding');
    setProgress({ done: 0, total: Math.ceil(duration * fps) });
    setError(null);
    try {
      const offline = await renderOfflineWithWebCodecs(composite, {
        width: preset.width,
        height: preset.height,
        fps,
        durationSeconds: duration,
        bitrate: bitrateMbps * 1_000_000,
        renderFrameAtTime: (ts) => {
          externalRenderRef.current?.(ts);
          const shot = manifestRef.current.cameraShots.find((s) => ts >= s.startTime && ts <= s.endTime);
          const prevLabel = shotLabelRef.current;
          if (shot) {
            shotLabelRef.current = shot.label;
          }
          resolveFrame(ts);
          shotLabelRef.current = prevLabel;
        },
        onProgress: (done, total) => setProgress({ done, total })
      });
      const blob = new Blob(offline.encodedChunks as unknown as BlobPart[]);
      setResult({
        url: URL.createObjectURL(blob),
        filename: 'chronos_master.h264',
        mimeLabel: `Offline WebCodecs · H.264 (${offline.codec}) · ${offline.totalFrames} frames`,
        sizeBytes: blob.size
      });
      setStatus('done');
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    const composite = document.createElement('canvas');
    composite.width = 1280;
    composite.height = 720;
    compositeRef.current = composite;
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  const busy = status === 'recording' || status === 'encoding';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/92 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl space-y-5 p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Film className="w-4 h-4" /> Export Mastering Deck
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              {duration > 0 ? `${duration.toFixed(2)}s master` : 'No compiled scene'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
            <div className="font-semibold text-slate-200 uppercase tracking-wide">Realtime path</div>
            <div className="text-slate-400 font-mono">
              {capabilities.probe.mimeType} ({capabilities.probe.extension})
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs space-y-1">
            <div className="font-semibold text-slate-200 uppercase tracking-wide">Offline path</div>
            <div className={`font-mono ${capabilities.webCodecs ? 'text-emerald-400' : 'text-rose-400'}`}>
              {capabilities.webCodecs ? 'VideoEncoder / VideoFrame available' : 'WebCodecs unsupported in this browser'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">Frame rate</div>
            <div className="flex gap-1.5">
              {FPS_PRESETS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    fps === f
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {f} fps
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-slate-400">Resolution</div>
            <div className="flex gap-1.5">
              {RES_PRESETS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setResPreset(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    resPreset === r.id
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {r.id}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span className="uppercase">Bitrate (offline)</span>
              <span className="text-amber-300 font-bold">{bitrateMbps} Mbps</span>
            </div>
            <input
              type="range"
              min={4}
              max={24}
              step={2}
              value={bitrateMbps}
              onChange={(e) => setBitrateMbps(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={status === 'recording' ? stopRealtimeCapture : startRealtime}
            disabled={!webglCanvas || status === 'encoding'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${
              status === 'recording'
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 hover:bg-rose-500/35'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-transparent'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {status === 'recording' ? (
              <>
                <Square className="w-4 h-4" /> Stop & Finalize
              </>
            ) : (
              <>
                <Film className="w-4 h-4" /> Start Realtime Recording
              </>
            )}
          </button>

          <button
            onClick={startOffline}
            disabled={!webglCanvas || !capabilities.webCodecs || busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'encoding' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Rendering H.264…
              </>
            ) : (
              <>
                <Film className="w-4 h-4" /> Render H.264 (Offline WebCodecs)
              </>
            )}
          </button>
        </div>

        {busy && status === 'encoding' && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>
                frame {progress?.done ?? 0} / {progress?.total ?? '…'}
              </span>
              <span>
                {progress && progress.total
                  ? `${Math.round((progress.done / progress.total) * 100)}%`
                  : ''}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-lg overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{
                  width:
                    progress && progress.total
                      ? `${Math.min(100, (progress.done / progress.total) * 100)}%`
                      : '4%'
                }}
              />
            </div>
          </div>
        )}

        {busy && status === 'recording' && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>
                capturing {progress?.done?.toFixed(1) ?? '0.0'}s / {(progress?.total ?? duration).toFixed(2)}s
              </span>
              <span>
                {progress && progress.total
                  ? `${Math.round((progress.done / progress.total) * 100)}%`
                  : ''}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-lg overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all"
                style={{
                  width:
                    progress && progress.total
                      ? `${Math.min(100, (progress.done / progress.total) * 100)}%`
                      : '4%'
                }}
              />
            </div>
          </div>
        )}

        {status === 'done' && result && (
          <div className="bg-slate-950/70 border border-emerald-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-emerald-400">Master ready</div>
              <div className="text-slate-300 font-mono">{result.mimeLabel}</div>
              <div className="text-slate-500 font-mono">
                {result.filename} · {formatBytes(result.sizeBytes)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={result.url}
                download={result.filename}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-semibold transition"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                onClick={() => {
                  setStatus('idle');
                  setResult(null);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 transition"
              >
                New export
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && error && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 font-mono">
            {error}
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Realtime path records the composited output (letterboxed cinema frame + telemetry + karaoke captions) with
          MediaRecorder at capture fps. Offline path drives the engine deterministically through
          <code className="text-slate-400"> renderOfflineWithWebCodecs</code> and downloads an H.264 elementary
          stream — container muxing (MP4/WebM file) is a known gap (GA §4 P0-7). Audio scratch track is not wired yet.
        </p>
      </div>
    </div>
  );
}
