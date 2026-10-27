# Technology Stack — Chronos3D

Inventory of every technology actually used by the implementation in `../code/`, with versions, purpose, and constraints. Derived from the workspace manifests, not from aspiration.

---

## 1. At a Glance

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Language (web) | TypeScript | ^5.5.4 | `strict: true`, ES2022 target, ESM only |
| Runtime (web) | Node.js | >= 20 | Declared in root `engines`; verified on v24.14.1 |
| Package manager | pnpm (workspaces) | declared `pnpm@9.7.0` | Verified working on 8.12.0 as well |
| Monorepo orchestration | Turborepo | ^2.1.0 | Task graph: `build`, `dev`, `typecheck`, `clean` |
| UI framework | React | ^18.3.1 | Function components + hooks only; no state library |
| 3D engine | Three.js | ^0.167.1 | WebGL renderer, procedural rigs, splines |
| Build tool (app) | Vite | ^5.4.0 | Dev server on port 5173 |
| Unit testing | Vitest | ^2.0.5 | Compiler package only (4 tests) |
| Icons | lucide-react | ^0.427.0 | UI chrome |
| Styling | Tailwind CSS | CDN (3.x) | Loaded via `cdn.tailwindcss.com` in `index.html`; local `tailwindcss`/`postcss`/`autoprefixer` devDeps are currently unused |
| TTS/alignment service | Python 3 + FastAPI | fastapi 0.115.0 | uvicorn 0.30.6, pydantic 2.9.2, numpy 2.1.1 |
| LLM training scripts | PyTorch ecosystem | torch ≥ 2.4, transformers ≥ 4.44, datasets ≥ 2.21, trl ≥ 0.10.1, peft ≥ 0.12.0 | Scripts only; not yet run to produce artifacts |

---

## 2. Workspace Layout & Dependency Graph

```
packages/schema          zero-dependency types + constants + LLM JSON schema
packages/compiler        depends on schema            (symbolic→IR, sanitizer, visemes)
packages/engine-core     depends on schema + three    (rigs, splines, IK, cameras, gizmo-free math)
packages/video-exporter  depends on schema            (Canvas2D compositor, MediaRecorder, WebCodecs, audio synth)
packages/react-player    depends on compiler + engine-core + schema + react + lucide-react + three
apps/studio-web          depends on compiler + engine-core + schema + video-exporter + react + three
```

All internal dependencies use `workspace:*`. The packages export TypeScript source directly (`main`/`types`/`exports` → `./src/index.ts`); there is **no package build step** — Vite transpiles them into the studio bundle. This is a deliberate monorepo simplification but blocks independent npm publishing (see `GAP-ANALYSIS.md` §4 item 9).

### Root tooling

| File | Purpose |
|---|---|
| `pnpm-workspace.yaml` | Includes `packages/*` and `apps/*` (services are not workspace members) |
| `tsconfig.base.json` | Shared compiler options: ES2022, `moduleResolution: bundler`, `strict`, `jsx` handling left to app, `isolatedModules`, declarations enabled |
| `turbo.json` | `build` depends on `^build`, outputs `dist/**`; `typecheck` depends on `^build`; `dev` persistent/uncached |
| `package.json` scripts | `pnpm dev` (turbo), `pnpm build` (turbo → studio `tsc && vite build`), `pnpm typecheck`, `pnpm clean` |

---

## 3. Web Runtime Technologies

### 3.1 Core libraries

- **Three.js 0.167** — scene graph, `CatmullRomCurve3`, `SkinnedMesh`/`Bone` rigs, `AnimationMixer`, `Raycaster`, `CanvasTexture`. Types via `@types/three ^0.167`.
- **React 18** — studio and player UI. No Redux/Zustand/context store; state lives in component refs/state (timeline clock and DAG are ref-based hooks for frame-rate independence).
- **Vite 5 + @vitejs/plugin-react 4** — dev server, HMR, production bundling. Output: single JS bundle ≈ 714 kB (≈ 194 kB gzip).

### 3.2 Browser platform APIs (the real "engine")

| API | Used for | Where |
|---|---|---|
| WebGL 2 (via three) | Real-time preview rendering | studio viewport |
| Canvas 2D | 2.35:1 letterboxed offline compositing, karaoke captions, telemetry HUD | `video-exporter/Canvas2DCompositor.ts` |
| Web Audio | Formant voice synthesizer (triangle-wave pulses, 235/135 Hz base), audio stream routing for muxing | `video-exporter/WebAudioSceneSynth.ts` |
| MediaRecorder + `MediaStream.captureStream` | Real-time WebM/MP4 canvas recording; MIME probing | `video-exporter/MediaRecorderExporter.ts` |
| WebCodecs (`VideoEncoder`, `VideoFrame`, `EncodedVideoChunk`) | Offline (faster-than-real-time) H.264 encoding at `avc1.42001f` | `video-exporter/WebCodecsOfflineMuxer.ts` |
| Web Speech API (`speechSynthesis`) | Studio TTS preview only (rate/pitch clamped) | `apps/studio-web/src/App.tsx` |
| `requestAnimationFrame` + `performance.now()` | Timeline clock, scrubbing | `react-player/hooks/useTimelineClock.ts` |
| Pointer events + `Raycaster` | Spline waypoint dragging on the ground plane | `apps/studio-web/src/App.tsx` |

**Browser-support consequence:** the export stack is Chromium-centric (WebCodecs, MediaRecorder MIME behavior). Firefox/Safari will need the MediaRecorder fallback path and container muxing. This is unaddressed in the PRD (see `GAP-ANALYSIS.md` §5 item 11).

### 3.3 Deliberate non-choices

- **No physics engine** (spring bones are closed-form math where implemented; Rapier/cannon are not dependencies).
- **No animation-state library** — scrub-safe evaluation is manual (`mixer.update(0)` + weight assignment).
- **No runtime schema validator** (no ajv/zod); validation is compile-time TypeScript + hand-rolled sanitizer.
- **No state management library**, **no CSS framework in the bundle** (Tailwind is CDN), **no backend** for the studio.

---

## 4. Python Services

### 4.1 `services/tts-aligner-service` (TTS + phonetic alignment)

| Item | Value |
|---|---|
| Framework | FastAPI 0.115.0, uvicorn[standard] 0.30.6 |
| Models/validation | pydantic 2.9.2 |
| Numerics | numpy 2.1.1 |
| Endpoints | `GET /health`, `POST /api/v1/synthesize-aligned` |
| Providers present | `kokoro_whisperx` (deterministic fallback estimator), `elevenlabs_align` (char→word projection), `azure_viseme` (22-ID viseme map) |
| Reality check | The endpoint computes prosody **inline** and does not call the providers; no Kokoro/WhisperX/ElevenLabs/Azure SDKs are installed. Provider modules are pure-Python adapters with deterministic output. |

### 4.2 `services/llm-director-training` (dataset + LoRA fine-tuning)

| Item | Value |
|---|---|
| Stack | torch ≥ 2.4, transformers ≥ 4.44, datasets ≥ 2.21, trl ≥ 0.10.1, peft ≥ 0.12.0, pydantic ≥ 2.9.2 |
| Scripts | `generate_synthetic_scenes.py` (3 scenario templates), `train_lora_unsloth.py` (Qwen2.5-7B default, 4-bit QLoRA via `trl.SFTTrainer`), `eval_sanitizer_pass_rate.py` (audit + pass-rate) |
| Caveats | File name mentions Unsloth but `unsloth` is not a dependency; `bitsandbytes`/`flash-attn` (needed for real 4-bit QLoRA on GPU) are not listed; scripts have not been executed to produce artifacts |

---

## 5. Data Formats & Protocols

| Format | Where | Notes |
|---|---|---|
| Symbolic Scene Manifest (JSON) | schema ↔ compiler ↔ engine | The only interchange format; symbolic time expressions as strings |
| Compiled IR (TypeScript objects) | compiler → engine | Not serialized by contract, but structurally JSON-safe |
| LLM JSON Schema (draft 2020-12) | `schema/llm-json-schema.ts` | Shallow — no deep constraints on tracks/expressions |
| JSONL | training dataset output | One scene-fix record per line |
| glTF / GLB | `GLTFCharacterLoader.ts` binding path | File loading itself is done by the consumer (e.g. `three/examples` GLTFLoader); the package only (re)binds bones |
| Audio buffers (PCM Float32) | TTS service ↔ compiler offsets | Word boundaries as `{ word, startSec, endSec }` |
| Encoded video chunks | WebCodecs path | `EncodedVideoChunk[]`; **no container muxer** yet (mp4-muxer not a dependency) |
| `.splat` | Blog 17 target | Not implemented; spec absent from PRD |

---

## 6. Toolchain Commands (quick reference)

| Command | Meaning |
|---|---|
| `pnpm install --ignore-scripts` | Install workspace deps (network required) |
| `pnpm dev` | Turbo → studio Vite dev server (http://127.0.0.1:5173) |
| `pnpm typecheck` | Turbo `tsc --noEmit` across all 6 TS packages/apps |
| `pnpm --filter @chronos3d/compiler test` | Vitest run (compiler + sanitizer suites) |
| `pnpm build` | Turbo build → `tsc && vite build` for the studio |
| `pnpm clean` | Turbo clean |
| `uvicorn app.main:app --reload --port 8000` | Run aligner service (from its directory) |

---

## 7. Version-Fact Table (exact pins from manifests)

| Dependency | Declared |
|---|---|
| typescript | ^5.5.4 |
| turbo | ^2.1.0 |
| vite | ^5.4.0 |
| react / react-dom | ^18.3.1 |
| three | ^0.167.1 |
| @types/three | ^0.167.0 |
| @vitejs/plugin-react | ^4.3.1 |
| lucide-react | ^0.427.0 |
| vitest | ^2.0.5 |
| tailwindcss / postcss / autoprefixer | ^3.4.10 / ^8.4.41 / ^10.4.20 (unused; CDN instead) |
| fastapi / uvicorn / pydantic / numpy | 0.115.0 / 0.30.6 / 2.9.2 / 2.1.1 |
| torch / transformers / datasets / trl / peft | ≥2.4.0 / ≥4.44.0 / ≥2.21.0 / ≥0.10.1 / ≥0.12.0 |

---

## 8. Design Principles Reflected in the Stack

1. **Zero-dependency inner layers.** `schema` has no dependencies; `compiler` depends only on `schema`; `video-exporter` depends only on `schema`. Portability and deterministic behavior over convenience.
2. **Pure functions over classes** for all simulation math (IK, splines, cameras, sanitizer) — trivially testable and frame-rate independent.
3. **No hidden state.** The engine never advances state on its own; the host supplies time (`evaluate*AtTime(t)`), which is what makes scrubbing, branching, and offline rendering exact.
4. **Source-first packages.** Internal packages ship TS source through the bundler; no intermediate build artifacts to drift.
5. **Platform APIs over bundled engines** where possible (WebCodecs, WebAudio, MediaRecorder) to keep the bundle lean.
