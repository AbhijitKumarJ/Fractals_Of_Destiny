import React, { useState } from 'react';
import { Clapperboard, Download, GitBranch } from 'lucide-react';
import { SymbolicSceneManifest } from '@chronos3d/schema';
import { RAW_8B_SCENE_MANIFEST } from './sampleManifest';
import { SCENE_LIBRARY, SceneLibraryEntry } from './sampleScenes';
import StudioWorkspace from './pages/StudioWorkspace';
import BranchGraphEditor from './pages/BranchGraphEditor';

type StudioPage = 'studio' | 'export' | 'branch';

const NAV_ITEMS: { id: StudioPage; label: string; icon: React.FunctionComponent<{ className?: string }> }[] = [
  { id: 'studio', label: 'Studio Workspace', icon: Clapperboard },
  { id: 'export', label: 'Export Deck', icon: Download },
  { id: 'branch', label: 'Branch Graph', icon: GitBranch }
];

export default function App() {
  const [rawScene, setRawScene] = useState<SymbolicSceneManifest>(RAW_8B_SCENE_MANIFEST);
  const [activeSceneId, setActiveSceneId] = useState<string>(SCENE_LIBRARY[0].id);
  const [page, setPage] = useState<StudioPage>('studio');

  const handleSceneSelected = (entry: SceneLibraryEntry) => {
    setActiveSceneId(entry.id);
    setRawScene(entry.manifest);
  };

  return (
    <div className="relative">
      {/* Page Navigation */}
      <div className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-slate-950 font-black text-xs">
              C3
            </span>
            <span className="text-sm font-bold text-white tracking-tight">Chronos3D Studio</span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  page === item.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {(page === 'studio' || page === 'export') && (
        <StudioWorkspace
          rawScene={rawScene}
          onRawSceneChange={setRawScene}
          sceneLibrary={SCENE_LIBRARY}
          activeSceneId={activeSceneId}
          onSelectScene={handleSceneSelected}
          exportDeckOpen={page === 'export'}
          onExportDeckClose={() => setPage('studio')}
        />
      )}
      {page === 'branch' && (
        <BranchGraphEditor
          sceneTitle={rawScene.title}
          dialogueCount={rawScene.dialogue.length}
          hasDecision={Boolean(rawScene.decision)}
          choiceCount={rawScene.decision?.choices.length ?? 0}
          promptText={rawScene.decision?.promptText}
        />
      )}
    </div>
  );
}
