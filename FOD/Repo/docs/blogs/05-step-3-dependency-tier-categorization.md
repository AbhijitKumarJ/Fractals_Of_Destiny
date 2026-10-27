# Turn 05 — Step 3: Dependency Tier Categorization

*Source: `Latest From branched onward.md` — turn 5 of 18*

**User:**

yes

---

**AI:**

## Step 3: Least-to-Most Dependent File Categorization — Chronos3D (`chronos-3d-studio`)

The **Chronos3D** monorepo is engineered around a strict **Directed Acyclic Dependency Graph (DAG)** at both the package level and the per-frame runtime execution level. Foundational data contracts and mathematical primitives sit at the bottom with zero external runtime dependencies, while high-level React orchestrators, multi-track NLE studio views, and LLM training pipelines sit at the top.

---

### 1. Visual Dependency Flow Across Architectural Tiers

```text
[Tier 0: Zero-Dependency Data Contracts & Stage Constants (@chronos3d/schema, models.py)]
       │
       ├──► [Tier 1: Pure Symbolic Parsers, Prosody Math & Sanitizer (@chronos3d/compiler leaves)]
       │           │
       │           ▼
       │    [Tier 2: 4-Pass AST-to-IR Orchestrator (compile-symbolic-manifest.ts & TTS Providers)]
       │           │
       ├───────────┼──► [Tier 3: 3D Scene Primitives, Rig Builders & Solvers (@chronos3d/engine-core)]
       │           │           │
       │           │           ▼
       │           ├──► [Tier 4: 2D+3D A/V Mastering & Offline Muxers (@chronos3d/video-exporter)]
       │           │           │
       │           ▼           ▼
       └──► [Tier 5: Stateful React Hooks & Embeddable SDK (@chronos3d/react-player)]
                               │
                               ▼
            [Tier 6: Top-Level Studio Apps, FastAPI Entrypoints & QLoRA Training Pipelines]

```

---

### 2. Tier-by-Tier Breakdown (Least Dependent $\to$ Most Dependent)

#### Tier 0: Zero-Dependency Leaf Schemas & Stage Constants (0 Runtime Dependencies)

These files define pure TypeScript interfaces, compile-time constants, JSON Schemas, and Pydantic data models. They import nothing from the rest of the repository and serve as the universal contract between the 8B LLM, the symbolic compiler, the Python TTS service, and the Three.js runtime.

* **`packages/schema/src/symbolic-ast.types.ts`:** Leaf type module defining `TimeExpression`, `Vector3Tuple`, `ShotType`, `EmotionPreset`, the 14 `VisemeName` constants (`ALL_VISEMES`), `SymbolicDialogueLine`, `SymbolicSplineSegment`, `SymbolicArmIKKeyframe`, `SymbolicTrack`, `SymbolicCameraShot`, and `SymbolicDecisionPrompt`.


* **`packages/schema/src/compiled-ir.types.ts`:** Depends only on `symbolic-ast.types.ts` to define the hydrated numeric Intermediate Representation (`CompiledSceneManifest`, `TTSWordBoundary`, `VisemeCue`, `CompiledDialogueSegment`, and `CompiledAnchorResolutionLog`).


* **`packages/schema/src/world-state.types.ts`:** Depends only on `symbolic-ast.types.ts` (`Vector3Tuple`) to define cross-chapter persistence (`PersistentWorldState`, `InventoryItem`, `SocketAttachment`, `CharacterTransformSnapshot`, and `WorldCheckpointSnapshot`).


* **`packages/schema/src/llm-json-schema.ts`:** Depends only on `symbolic-ast.types.ts` to export calibrated stage geometry (`STAGE_OBSTACLES`, `STAGE_LANDMARKS`) and the Draft 2020-12 `LLM_SCENE_JSON_SCHEMA` used by Ollama and vLLM for constrained token decoding.


* **`services/tts-aligner-service/app/models.py`:** Standalone Python Pydantic leaf schema defining `SynthesizeAlignedRequest`, `AlignedWordOffset`, `AlignedVisemeCue`, and `SynthesizeAlignedResponse`.


* **`services/llm-director-training/system_prompt.md`:** Zero-dependency Markdown specification encoding the causal field ordering rules and 9-zone stage landmarks for 8B model prompting and fine-tuning.



---

#### Tier 1: Pure Symbolic Parsers, Acoustic Estimators & Self-Healing Rules

Files in Tier 1 depend **only on Tier 0 (`@chronos3d/schema` or `models.py`)**. They contain pure, deterministic string/math transformations with zero DOM, WebGL, or network dependencies.

* **`packages/compiler/src/expression-parser.ts`:** Imports `TimeExpression` and `TTSWordBoundary` from `@chronos3d/schema` to implement `evaluateTimeExpression(expr, symbolTable)`, resolving `@line.start`, `@line.end`, `@line.word("token")`, and `@line.progress(p)` with `+`/`-` offsets.


* **`packages/compiler/src/viseme-compiler.ts`:** Imports dialogue and viseme types from `@chronos3d/schema` to implement `charToOculusViseme()` and `synthesizeWordTimingsForLine()`, converting either real TTS word offsets or syllable/punctuation prosody rules into 14-viseme envelopes.


* **`packages/compiler/src/llm-sanitizer.ts`:** Imports `STAGE_OBSTACLES` and `SymbolicSceneManifest` from `@chronos3d/schema` to implement `sanitizeAndRepairLLMScene()`, repairing unchained `start: 0` lines, morphological word-stem mismatches, central pedestal waypoint collisions, and 180-degree camera flips.


* **`services/tts-aligner-service/app/providers/{kokoro_whisperx,elevenlabs_align,azure_viseme}.py`:** Depend only on `app/models.py` and Python standard library modules to translate provider-specific phoneme, character, or viseme events into `AlignedWordOffset` and `AlignedVisemeCue` lists.


* **`services/llm-director-training/generate_synthetic_scenes.py` & `eval_sanitizer_pass_rate.py`:** Standalone Python scripts that encode the Tier 0 stage landmark rules to generate and audit collision-free JSONL training data.



---

#### Tier 2: Multi-Pass AST Compiler & Unit Test Suites

Tier 2 orchestrates the Tier 1 leaf parsers to transform a complete `SymbolicSceneManifest` into a `CompiledSceneManifest`.

* **`packages/compiler/src/compile-symbolic-manifest.ts`:** Depends on `@chronos3d/schema` (Tier 0) plus `expression-parser.ts` and `viseme-compiler.ts` (Tier 1). Executes the 4-pass compilation pipeline (Pass 1: Dialogue & Word Boundaries $\to$ Pass 2: Catmull-Rom Splines $\to$ Pass 3: Gestures, Gaze, Emotions & Arm IK $\to$ Pass 4: Camera Director Shots).


* **`packages/compiler/__tests__/compiler.test.ts` & `sanitizer.test.ts`:** Depend on `@chronos3d/schema` and `@chronos3d/compiler` to verify WPM time-warping elasticity, sub-1.5ms compilation speed, and the 4 sanitizer repair rules.



---

#### Tier 3: Deterministic 3D Biomechanics, Rig Builders & Solvers (`@chronos3d/engine-core`)

Tier 3 introduces `three` (`THREE`) alongside `@chronos3d/schema` (Tier 0). Within `@chronos3d/engine-core`, files are further ordered from independent mathematical/scene primitives to composite rig consumers:

1. **Independent 3D Math & Camera Primitives (Depend only on `three` + `@chronos3d/schema`):**
* **`SplineAndStrideSolver.ts`:** Exports `smoothstep`, `buildArcLengthCatmullRom`, and `evaluateSplineLocomotionAtTime` for uniform arc-length velocity and distance-locked stride phase ($\phi_{\text{stride}} = d(t) / L_{\text{stride}}$).


* **`PauseInspectorCam.ts`:** Exports `createInitialPauseCameraState` and `stepPauseInspectorCamera` for 6-DOF `WASD`/`QE` free-roam flight and 360° turntable orbit math.


* **`ProceduralRigBuilder.ts`:** Exports `createCharacterRig`, `CharacterRigInstance`, and `EMOTION_PRESETS`, constructing the 15-bone humanoid hierarchy, 14 viseme morph targets, and 5 `THREE.AnimationClip` actions.




2. **Composite Engine Consumers (Depend on `ProceduralRigBuilder.ts` or `SplineAndStrideSolver.ts`):**
* **`AssetRegistry.ts`:** Imports `CharacterRigInstance` to pool character rigs, scene props, geometries, and materials across chapters.


* **`GLTFCharacterLoader.ts`:** Imports `CharacterRigInstance` and `ALL_VISEMES` to map ReadyPlayerMe/Mixamo `.glb` skeletons onto the canonical rig contract.


* **`DynamicSplineStitcher.ts`:** Imports `buildArcLengthCatmullRom` from `SplineAndStrideSolver.ts` to inject a character's live $[x, y, z]$ coordinate as Waypoint 0 when `inheritStartPose: true` is active.


* **`IKSolvers.ts`:** Imports `CharacterRigInstance` to apply post-mixer `applyCharacterLookAtIK` and closed-form Law-of-Cosines `solveAnalyticalTwoBoneArmIK`.


* **`BoneSocketManager.ts`:** Imports `CharacterRigInstance` and `SocketAttachment` to lock held 3D inventory props onto `ForearmR`, `ForearmL`, or `Spine` world matrices.


* **`CameraDirectorAndPauseCam.ts`:** Imports `smoothstep` from `SplineAndStrideSolver.ts` and `CompiledSceneManifest` from `@chronos3d/schema` to evaluate `twoShot`, `overTheShoulder`, and `splineDolly` framing as well as `evaluateQuadraticBezierSnapback`.





---

#### Tier 4: 2D+3D Video Compositor, WebAudio Synth & Hardware Muxers (`@chronos3d/video-exporter`)

Tier 4 depends on `@chronos3d/schema` (Tier 0) and browser Web APIs (`CanvasRenderingContext2D`, `AudioContext`, `MediaRecorder`, `VideoEncoder`) to turn rendered 3D frames into standalone video files.

* **`packages/video-exporter/src/WebAudioSceneSynth.ts`:** Zero internal dependencies; builds the WebAudio triangle-wave formant synthesizer and `MediaStreamAudioDestinationNode`.


* **`packages/video-exporter/src/MediaRecorderExporter.ts`:** Zero internal dependencies; probes H.264 `.mp4` vs. VP9 `.webm` support and records multiplexed canvas + audio streams.


* **`packages/video-exporter/src/WebCodecsOfflineMuxer.ts`:** Zero internal dependencies; steps `VideoEncoder` and `VideoFrame` for faster-than-real-time offline rendering.


* **`packages/video-exporter/src/Canvas2DCompositor.ts`:** Imports `CompiledDialogueSegment` from `@chronos3d/schema` to blit the Three.js WebGL canvas onto a 2D canvas with 2.35:1 cinema letterbox bars and karaoke word-highlighted subtitles.



---

#### Tier 5: Stateful React Hooks, Overlays & Embeddable Player SDK (`@chronos3d/react-player`)

Tier 5 bridges React 18 state management with `@chronos3d/schema` (Tier 0) and `@chronos3d/compiler` (Tier 2).

* **`packages/react-player/src/hooks/useTimelineClock.ts`:** Standalone React hook driving the `requestAnimationFrame` clock, `seek()`, and slow-motion time-scale ramping.


* **`packages/react-player/src/hooks/usePauseInspector.ts`:** Depends on `three` + React to manage the `DIRECTOR_PLAYING` $\leftrightarrow$ `PAUSED_INSPECTING` $\leftrightarrow$ `SNAPBACK_SWERVE` state machine.


* **`packages/react-player/src/hooks/useWorldStateDAG.ts`:** Depends on `@chronos3d/schema` + React to manage persistent inventory, world flags, bone-socket attachments, and $O(1)$ checkpoint time-travel.


* **`packages/react-player/src/overlays/DecisionCardModal.tsx`:** Depends on `@chronos3d/schema` + React to render mid-video branching decision prompts with item lock badges.


* **`packages/react-player/src/ChronosPlayer.tsx`:** Combines `@chronos3d/schema`, `@chronos3d/compiler` (`sanitizeAndRepairLLMScene`, `compileSymbolicManifest`), and `useTimelineClock` into a drop-in React component.



---

#### Tier 6: Top-Level Application Orchestrators & Service Entrypoints (Most Dependent)

Tier 6 represents the highest-level integration points where all lower tiers converge:

* **`apps/studio-web/src/sampleManifest.ts`:** Depends on `@chronos3d/schema` to define `RAW_8B_SCENE_MANIFEST` with intentional 8B errors for interactive testing.


* **`apps/studio-web/src/App.tsx` (and `InteractiveBranchingWorldPlayer` in ``):** The most dependent TypeScript file in the monorepo. Imports from `@chronos3d/schema` (Tier 0), `@chronos3d/compiler` (Tier 2), `@chronos3d/engine-core` (Tier 3), `three`, `lucide-react`, and `sampleManifest.ts` to orchestrate the 3D WebGL stage, raycast floor-plane waypoint dragging, WPM prosody time-warping, 8B sanitizer diff logs, and the 6-stage 60 FPS frame evaluation loop.


* **`apps/studio-web/src/main.tsx`:** Application entry point mounting `<App/>` into `#root`.


* **`services/tts-aligner-service/app/main.py`:** FastAPI application entrypoint integrating `app/models.py` (Tier 0) and `app/providers/*` (Tier 1) behind `POST /api/v1/synthesize-aligned`.


* **`services/llm-director-training/train_lora_unsloth.py`:** Top-level ML training orchestrator consuming `system_prompt.md` (Tier 0) and `synthetic_chronos3d_train.jsonl` (output of Tier 1 `generate_synthetic_scenes.py`) to fine-tune Qwen-2.5-7B or Llama-3.1-8B via HuggingFace `SFTTrainer`.



---

Would you like to dive deeper into any specific dependency tier or cross-module data flow, or are you ready to move to **Step 4: Plan a Deep-Dive Blog Series (10+ Blogs)**?
