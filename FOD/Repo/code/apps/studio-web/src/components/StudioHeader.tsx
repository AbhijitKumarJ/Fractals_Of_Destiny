import React, { useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Check, Code2, Copy, Download, PlayCircle, ShieldCheck, Upload } from 'lucide-react';
import { SymbolicSceneManifest } from '@chronos3d/schema';
import { SceneLibraryEntry } from '../sampleScenes';

interface StudioHeaderProps {
  editorCameraMode: boolean;
  onToggleCameraMode: () => void;
  useSanitizer: boolean;
  onToggleSanitizer: () => void;
  sanitizerRepairCount: number;
  copiedJson: boolean;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onImportJson: (manifest: SymbolicSceneManifest) => boolean;
  onOpenPlayMode?: () => void;
  sceneLibrary?: SceneLibraryEntry[];
  activeSceneId?: string;
  onSelectScene?: (entry: SceneLibraryEntry) => void;
}

export default function StudioHeader({
  editorCameraMode,
  onToggleCameraMode,
  useSanitizer,
  onToggleSanitizer,
  sanitizerRepairCount,
  copiedJson,
  onCopyJson,
  onDownloadJson,
  onImportJson,
  onOpenPlayMode,
  sceneLibrary,
  activeSceneId,
  onSelectScene
}: StudioHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChosen = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    file
      .text()
      .then((text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          setImportError('Not valid JSON');
          setTimeout(() => setImportError(null), 2500);
          return;
        }
        const candidate = parsed as SymbolicSceneManifest;
        if (
          !candidate ||
          typeof candidate !== 'object' ||
          !Array.isArray(candidate.dialogue) ||
          !Array.isArray(candidate.tracks)
        ) {
          setImportError('Missing dialogue/tracks arrays — not a SymbolicSceneManifest');
          setTimeout(() => setImportError(null), 2500);
          return;
        }
        if (onImportJson(candidate)) {
          setImportError(null);
        } else {
          setImportError('Rejected by sanitizer');
          setTimeout(() => setImportError(null), 2500);
        }
      })
      .catch(() => {
        setImportError('Read failed');
        setTimeout(() => setImportError(null), 2500);
      });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
      <div>
        <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <Code2 className="w-4 h-4" />
          Chronos3D Monorepo Studio (@chronos3d/schema + compiler + engine-core)
        </div>
        <h1 className="text-xl font-bold text-white mt-1">
          Declarative 3D Video Engine, Symbolic TTS Compiler & 8B Self-Healing Studio
        </h1>
        <p className="text-sm text-slate-400">
          Drag cyan 3D waypoints on the floor grid, toggle the 8B Self-Healing Sanitizer, or warp speaker WPM rates in real time
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleCameraMode}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
            editorCameraMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {editorCameraMode ? 'Camera: 3D Stage Editor' : 'Camera: Director Lens'}
        </button>

        <button
          onClick={onToggleSanitizer}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
            useSanitizer
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}
        >
          {useSanitizer ? (
            <>
              <ShieldCheck className="w-4 h-4" /> Sanitized ({sanitizerRepairCount} Fixes)
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" /> Raw 8B (Unfixed)
            </>
          )}
        </button>

        <button
          onClick={onCopyJson}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-sky-400 transition"
        >
          {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copiedJson ? 'Copied AST!' : 'Copy Symbolic JSON'}
        </button>

        {sceneLibrary && sceneLibrary.length > 1 && onSelectScene && (
          <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 transition">
            <BookOpen className="w-4 h-4 text-violet-400" />
            <select
              value={activeSceneId}
              onChange={(event) => {
                const entry = sceneLibrary.find((item) => item.id === event.target.value);
                if (entry) onSelectScene(entry);
              }}
              title={sceneLibrary.find((item) => item.id === activeSceneId)?.tagline}
              className="bg-transparent outline-none cursor-pointer font-semibold text-slate-200"
            >
              {sceneLibrary.map((entry) => (
                <option key={entry.id} value={entry.id} className="bg-slate-900">
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {onOpenPlayMode && (
          <button
            onClick={onOpenPlayMode}
            className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 transition"
          >
            <PlayCircle className="w-4 h-4" />
            Play Mode
          </button>
        )}

        <button
          onClick={onDownloadJson}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-sky-400 transition"
        >
          <Download className="w-4 h-4" />
          Download
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-sky-400 transition"
        >
          <Upload className="w-4 h-4" />
          Load JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>

      {importError && (
        <div className="md:absolute md:right-6 md:top-24 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-3 py-1.5 rounded-xl text-xs">
          {importError}
        </div>
      )}
    </div>
  );
}
