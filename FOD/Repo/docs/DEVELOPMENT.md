# Development Guide — Chronos3D

How the codebase is organized, how to build/test it, and how to extend it. For the technology inventory see `TECH-STACK.md`; for what's missing see `GAP-ANALYSIS.md`.

---

## 1. Setup

**Prerequisites:** Node.js ≥ 20, pnpm, git. Python 3.10+ for services.

```bash
pnpm install --ignore-scripts   # offline-friendly; no postinstall needed
pnpm dev                        # turbo → studio vite (port 5173)
```

| Command | What it does |
|---|---|
| `pnpm typecheck` | Turbo: `tsc --noEmit` in all 6 TS workspaces |
| `pnpm --filter @chronos3d/compiler test` | Vitest (2 suites, 4 tests) |
| `pnpm --filter @chronos3d/compiler test:watch` | Vitest watch mode |
| `pnpm build` | Turbo → `tsc && vite build` in `apps/studio-web` (only app with a build) |
| `pnpm clean` | Turbo clean |

---

## 2. Repository Map (68 files including `.gitignore`)

```
package.json                     turbo + typescript; engines node>=20
pnpm-workspace.yaml              packages/* + apps/*
tsconfig.base.json               ES2022, bundler resolution, strict
turbo.json                       build/dev/typecheck/clean graph
.gitignore                       node_modules, dist, .turbo, __pycache__, .venv

apps/studio-web/
  index.html                     Tailwind via CDN; #root
  vite.config.ts                 react plugin; port 5173
  tsconfig.json                  inherits base; noEmit: true
  src/main.tsx                   React root
  src/App.tsx                    tab-nav shell (rawScene lifted here)
  src/pages/StudioWorkspace.tsx  pipeline memos, clock/TTS, transport, layout
  src/pages/ExportMasteringDeck.tsx  export deck overlay: realtime recorder + offline WebCodecs
  src/pages/BranchGraphEditor.tsx    decision-runtime briefing (FR-11; graph editor still open)
  src/components/ViewportStage.tsx   Three.js effect, waypoint drag, HUD, karaoke
  src/components/stageEngine.ts     shared scene factory + evaluateStageAtTime (viewport & player)
  src/components/PlayModeOverlay.tsx full-screen Play Mode: player viewport + decision DAG (FR-11)
  src/components/pauseInspectorRuntime.ts  inspector runtime: keys/pointer/pick/snapback capture (FR-12)
  src/components/PauseInspectHud.tsx  inspector/snapback banner component (used by ViewportStage)
  src/components/KaraokeSubtitleBar.tsx  karaoke word-highlight caption component
  src/components/ArmIKEmotionPanel.tsx  live arm-IK + emotion keyframe authoring (right column)
  src/components/StudioHeader.tsx    header actions incl. JSON copy/download/upload + Play Mode
  src/components/SymbolicAnchorTable.tsx  pass 1–4 table
  src/components/MultiTrackTimeline.tsx  5-lane NLE: spans, keyframes, anchor chips
  src/components/ProsodyPanel.tsx    WPM/pause sliders
  src/components/SanitizerLogPanel.tsx  repair cards
  src/sampleManifest.ts          demo scene (symbolic_reactor_briefing; 2 spline paths + branch decision)
  src/sampleScenes.ts            SCENE_LIBRARY (3 scenes: reactor demo + "Nebula Standoff" + "Mars Dispatch")

packages/schema/                 zero-dependency contracts
  src/symbolic-ast.types.ts      SymbolicSceneManifest, track/actor/shot types
  src/compiled-ir.types.ts       resolved timeline types (seconds)
  src/world-state.types.ts       inventory/flags/decisions/branches
  src/llm-json-schema.ts         draft 2020-12 schema for constrained decoding
  src/index.ts

packages/compiler/               symbolic → IR + sanitation
  src/expression-parser.ts       time DSL parser/resolver
  src/compile-symbolic-manifest.ts  4-pass compile (anchors → dialogue →
                                 tracks → camera/resolution log)
  src/llm-sanitizer.ts           4 repair rules + SanitizerRepairEntry log
  src/viseme-compiler.ts         char→viseme, word-timing synthesis
  src/index.ts
  __tests__/compiler.test.ts     3 tests (DSL, word anchors, SLA)
  __tests__/sanitizer.test.ts    1 test (all 4 rules)
  vitest.config.ts

packages/engine-core/            deterministic simulation (no rendering)
  src/ProceduralRigBuilder.ts    builds 13-bone humanoid + morph mouth, presets
  src/SplineAndStrideSolver.ts   arc-length CatmullRom, stride phase, heading
  src/IKSolvers.ts               head look-at ±62°/±28°; law-of-cosines arm IK
  src/CameraDirectorAndPauseCam.ts  director shots + Bezier snapback math
  src/PauseInspectorCam.ts       free-roam / orbit-asset pause camera
  src/AssetRegistry.ts           rig/geometry/material caches
  src/GLTFCharacterLoader.ts     bone alias binding (Mixamo/RPM), morph detect
  src/DynamicSplineStitcher.ts   branch stitching + 0.15 m pinch-knot guard
  src/BoneSocketManager.ts       prop sockets (ForearmL/R, Spine)
  src/index.ts

packages/video-exporter/         output pipelines
  src/Canvas2DCompositor.ts      2.35:1 bars, karaoke captions, telemetry HUD
  src/WebAudioSceneSynth.ts      formant triangle pulse voice (235/135 Hz)
  src/MediaRecorderExporter.ts   MIME probe + realtime recorder
  src/WebCodecsOfflineMuxer.ts   offline H.264 chunk encode (avc1.42001f)
  src/index.ts

packages/react-player/           embeddable player SDK
  src/ChronosPlayer.tsx          minimal shell (manifest/autoSanitize/autoPlay)
  src/hooks/useTimelineClock.ts  rAF clock, scrub, timeScale 0–2
  src/hooks/useWorldStateDAG.ts  inventory/flags/checkpoints/branch apply
  src/hooks/usePauseInspector.ts PAUSED_INSPECTING → SNAPBACK_SWERVE ramp
  src/overlays/DecisionCardModal.tsx
  src/index.ts

services/tts-aligner-service/
  app/main.py                    FastAPI; /health + /api/v1/synthesize-aligned;
                                 inline prosody+viseme estimator
  app/models.py                  pydantic request/response models
  app/providers/                 kokoro_whisperx | elevenlabs_align | azure_viseme
                                 (pure-python adapters, not yet wired)
  requirements.txt

services/llm-director-training/
  generate_synthetic_scenes.py   template-based JSONL dataset generator
  train_lora_unsloth.py          QLoRA SFT (trl; Qwen2.5-7B default)
  eval_sanitizer_pass_rate.py    offline audit of scene validity rules
  system_prompt.md               director prompt for LLM scene generation
  requirements.txt
```

---

## 3. Data Flow

```
LLM / author
    │  SymbolicSceneManifest (JSON)
    ▼
sanitizeAndRepairLLMScene()          compiler/llm-sanitizer.ts
    │  sanitized manifest + RepairEntry[]
    ▼
compileSymbolicManifest()            compiler/compile-symbolic-manifest.ts
    │  CompiledSceneManifest (resolved seconds, tracks, shots, resolutionLog)
    ▼
evaluate*AtTime(t)                   engine-core (pure functions)
    │  per-frame pose/camera/viseme state
    ▼
render / record                      studio three.js loop, video-exporter
```

Key invariant: **all simulation is stateless**. Every evaluator takes `t` and returns state. That is what makes scrubbing, branch jumps, pause inspection, and offline encode exact without special cases.

---

## 4. Public APIs (by package)

- `@chronos3d/schema` — types + constants (`ALL_VISEMES`, `EMOTION_PRESETS`, `STAGE_LANDMARKS`, `STAGE_OBSTACLES`, `LLM_SCENE_JSON_SCHEMA`). No dependencies.
- `@chronos3d/compiler` — `compileSymbolicManifest`, `sanitizeAndRepairLLMScene`, `evaluateTimeExpression` (from `expression-parser`), `charToOculusViseme`, `synthesizeWordTimingsForLine`.
- `@chronos3d/engine-core` — `createCharacterRig`, `buildArcLengthCatmullRom`, `evaluateSplineLocomotionAtTime` (now returns `bankRoll`/`speed`), `composeBankedHeading`, `evaluateSkeletalClipWeights`, `applyCharacterLookAtIK` (3-tier gaze + blink), `evaluateBlinkAmount`, `evaluateAutoGazeTarget`, `solveAnalyticalTwoBoneArmIK` (pole vector + spine lean), `solveDualHandArmIK`, `evaluateCameraDirectorAtTime` (context-based signature: `(t, manifest, { actorHeadPositions, actorForwards?, actorSplineTangents?, sceneCenter? })`), `evaluateOverheadCranePose`, `evaluateQuadraticBezierSnapback`, `AssetRegistry`, `bindLoadedGLTFToCharacterRig`, `stitchBranchSplineWaypoints`, `applyBoneSocketAttachments`, `createInitialPauseCameraState`, `stepPauseInspectorCamera`.
- `@chronos3d/video-exporter` — `compositeWebGLAndSubtitlesTo2DCanvas`, `createSceneAudioSynth`, `probeSupportedVideoMimeType`, `startCanvasMediaRecorder`, `renderOfflineWithWebCodecs`.
- `@chronos3d/react-player` — `ChronosPlayer`, `useTimelineClock`, `useWorldStateDAG`, `usePauseInspector`, `DecisionCardModal`.

---

## 5. Conventions

1. **TypeScript strict, ESM only.** No CommonJS shims.
2. **Lower layers are dependency-free.** `schema` depends on nothing; `compiler`/`video-exporter` depend only on `schema`. Keep it that way — do not pull three/react into them.
3. **Pure functions for simulation.** Name evaluators `evaluate…AtTime(t)`. No hidden clocks, no mutated global state.
4. **Deterministic outputs.** Synthesizers (prosody, viseme, formant) must be reproducible from inputs alone — no `Math.random()` without a seeded generator.
5. **Symbolic first.** New timing semantics go into the DSL/parser, never as numeric literals sprinkled through the engine.
6. **Repairs are data.** Any automatic correction must emit a `SanitizerRepairEntry` with rule id, path, before/after, and explanation.
7. **Kebab-case filenames** in the compiler package (`compile-symbolic-manifest.ts`), PascalCase for classes/components modules elsewhere, matching existing layout.
8. **No comments unless load-bearing.** The codebase is comment-sparse; keep conceptual notes in docs.

---

## 6. Testing

- Framework: **Vitest** in `compiler` and `engine-core` packages (`vitest.config.ts`, node environment).
- Existing coverage: compiler — DSL evaluation/word anchors (3 tests) and sanitizer rules (1 test); engine-core — camera director framing/orbits/transitions/PiP (5), gaze IK/clamps/blink/arm IK (7), spline banking/crossfade weights (6). Total 22 tests.
- Add tests alongside `__tests__/`; run with `pnpm --filter @chronos3d/compiler test` or `pnpm --filter @chronos3d/engine-core test`.
- **Untested surfaces** (good first contributions): DAG transitions, pause ramps, compositor layout, player hooks, and all NFR benchmarks.

---

## 7. Extension Recipes

### 7.1 Add a new track type (e.g. `prop_attach`)

1. `schema/symbolic-ast.types.ts` — add the track interface to the union.
2. `schema/llm-json-schema.ts` — extend the schema for LLM generation.
3. `compiler/compile-symbolic-manifest.ts` — add a pass that resolves its expressions into the compiled IR (`compiled-ir.types.ts`).
4. `engine-core` — add an `evaluatePropAttachAtTime(t)` function; export from `index.ts`.
5. `apps/studio-web/src/App.tsx` — evaluate it in the render loop (and consider `react-player` if it belongs in playback).

### 7.2 Add a sanitizer rule

1. Implement the check/fix inside `llm-sanitizer.ts` following the existing four rule shapes.
2. Push a `SanitizerRepairEntry` (it renders automatically in the studio log).
3. Add a case to `sanitizer.test.ts`.

### 7.3 Add a camera shot type

1. Extend `ShotType` in `schema/symbolic-ast.types.ts`.
2. Add the math branch in `evaluateCameraDirectorAtTime` (`CameraDirectorAndPauseCam.ts:12`).
3. Add a shot to `sampleManifest.ts` to see it live.

### 7.4 Add a TTS provider

1. Create `services/tts-aligner-service/app/providers/<name>.py` with `synthesize(text, speaker, wpm) -> aligned payload`.
2. Wire it into `app/main.py` behind a provider switch (currently inline — the four existing providers are unconnected).
3. Keep output deterministic for tests; document required env vars (API keys must never be committed).

### 7.5 Add a synthetic-scene template

`generate_synthetic_scenes.py` — add a scenario builder that emits a valid manifest and tag its records with the scenario name; extend `eval_sanitizer_pass_rate.py` coverage as needed.

---

## 8. Known Limitations (intentional or pending)

| Limitation | Detail |
|---|---|
| Packages export TS source | `main: ./src/index.ts`; no build artifacts. Fine for the monorepo, blocks npm publishing (needs tsup or equivalent). |
| `noEmit: true` in studio tsconfig | Prevents `tsc` from emitting JS next to sources during `pnpm build`; `vite build` produces the real output. |
| No container muxer | WebCodecs offline path downloads an H.264 elementary stream (`chronos_master.h264`), not an MP4 file. Add `mp4-muxer` to finish the export; audio scratch track is also not wired (deck records/captures video only). |
| TTS endpoint recomputes inline | Provider modules exist but are unused; real Kokoro/WhisperX/ElevenLabs/Azure calls are outstanding. |
| Studio split is mechanical | `App.tsx` (66 lines) routes tabs; the 3D loop lives in `stageEngine.ts` (shared factory + `evaluateStageAtTime`) consumed by `ViewportStage` and `PlayModeOverlay`; `StudioWorkspace` owns all effects; finer-grained hooks/decomposition remains open. |
| Play Mode decision scopes | `decision.triggerTime` resolves only `@line_X.end/start` and `@line_X.word("…")` (± offsets) against the compiled dialogue, plus raw numbers; richer DSL forms never trigger. `ChronosPlayer` in `react-player` keeps its headless clock/scrub API (no 3D) — the visual player is studio-web's `PlayModeOverlay` (which reuses `ViewportStage`; waypoint taps are no-ops there). Checkpoint restore has no UI yet. |
| Pause inspector test coverage | Orbit mode is keyboard+drag only (engine lacks mouse elevation); the pause path and HUD components have no unit tests. Waypoint drag edits **segment 0** of a `splinePath` track only (sample scenes are single-segment; other segments are editable from the timeline lane). `AIPromptGeneratorBar` remains the one deferred P2 component. |
| Camera numbers are engine defaults | Shot families (lead/follow/parallel dolly, twoShot, closeUp, OTS) use widened defaults after visual review; per-shot `fov` in a scene still overrides them, so narrow author-chosen lenses can crop faces again. |
| Blink is geometric | The rig's 15 bones now include `EyeL`/`EyeR`, but blinking is implemented as an eye-scale squash (no eyelid geometry/morph yet); eyelid/cheek emotion channels remain future work. |
| Training scripts unproven | No dataset/model artifacts have been produced; `bitsandbytes`/`unsloth` not in requirements. |
| UI untested | Engine math now has 18 tests (camera/IK/spline/weights), but DAG transitions, pause ramps, compositor layout, player hooks, and NFR benchmarks remain untested; treat `GAP-ANALYSIS.md` §4 as the test backlog. |

---

## 9. Definition of Done (for contributions)

1. `pnpm typecheck` — 6/6 tasks green.
2. `pnpm --filter @chronos3d/compiler test` and `pnpm --filter @chronos3d/engine-core test` — all tests green (add new ones for changed behavior).
3. `pnpm build` — studio bundles without errors and without emitting files into `src/`.
4. If you touched server logic: service starts and `/health` + a request path verified.
5. Docs updated when public APIs, formats, or rules change (`PRD.md`, `USER-MANUAL.md`, this file).
