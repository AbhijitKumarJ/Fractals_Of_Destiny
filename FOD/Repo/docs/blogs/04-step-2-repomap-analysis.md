# Turn 04 — Step 2: Repomap Analysis

*Source: `Latest From branched onward.md` — turn 4 of 18*

**User:**

proceed to Step 2

---

**AI:**

## Step 2: Repomap Analysis — Chronos3D Monorepo (`chronos-3d-studio`)

The **Chronos3D** (`chronos-3d-studio`) repository is organized as a modular TypeScript (`pnpm` + Turborepo) and Python monorepo separating zero-dependency data contracts (`@chronos3d/schema`), the symbolic compiler and self-healing sanitizer (`@chronos3d/compiler`), the deterministic 60 FPS Three.js engine (`@chronos3d/engine-core`), the 2D+3D video compositor and exporter (`@chronos3d/video-exporter`), the embeddable React SDK (`@chronos3d/react-player`), the visual NLE authoring studio (`apps/studio-web`), and the Python microservices (`services/tts-aligner-service` and `services/llm-director-training`).

---

### 1. Annotated Structural Tree

```text
chronos-3d-studio/
├── package.json                                      # Root pnpm workspace & Turborepo task runner
├── pnpm-workspace.yaml                               # Declares packages/* and apps/* workspaces
├── turbo.json                                        # Topological build/dev/typecheck task DAG
├── tsconfig.base.json                                # Shared strict ES2022 TypeScript compiler config
│
├── packages/
│   ├── schema/                                       # @chronos3d/schema — Zero-Dependency AST, IR & JSON Schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── symbolic-ast.types.ts                 # Authoring AST: SymbolicSceneManifest, TimeExpression, tracks & shots
│   │       ├── compiled-ir.types.ts                  # Runtime IR: CompiledSceneManifest, TTSWordBoundary, VisemeCue
│   │       ├── world-state.types.ts                  # Branching DAG state: PersistentWorldState, InventoryItem, SocketAttachment
│   │       ├── llm-json-schema.ts                    # Draft 2020-12 JSON Schema, STAGE_LANDMARKS & STAGE_OBSTACLES
│   │       └── index.ts                              # Package barrel export
│   │
│   ├── compiler/                                     # @chronos3d/compiler — 4-Pass Symbolic Compiler & 8B Sanitizer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts                          # Vitest test runner configuration
│   │   ├── src/
│   │   │   ├── expression-parser.ts                  # evaluateTimeExpression (@line.start, @line.word() +/- offset)
│   │   │   ├── viseme-compiler.ts                    # synthesizeWordTimingsForLine & 14-Oculus-viseme envelope generator
│   │   │   ├── llm-sanitizer.ts                      # sanitizeAndRepairLLMScene (4-rule spatial & semantic self-healer)
│   │   │   ├── compile-symbolic-manifest.ts          # compileSymbolicManifest (Pass 1–4 AST-to-IR compiler)
│   │   │   └── index.ts                              # Package barrel export
│   │   └── __tests__/
│   │       ├── compiler.test.ts                      # Unit tests for anchor math, WPM elasticity & <1.5ms SLA
│   │       └── sanitizer.test.ts                     # Unit tests for pedestal push-out, stem matching & 180° lock
│   │
│   ├── engine-core/                                  # @chronos3d/engine-core — Deterministic 60FPS Three.js Runtime
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── AssetRegistry.ts                      # Singleton Object3D, BufferGeometry & Material cache
│   │       ├── ProceduralRigBuilder.ts               # 15-bone humanoid rig, brow bones, 14 viseme morphs & 5 clips
│   │       ├── GLTFCharacterLoader.ts                # ReadyPlayerMe / Mixamo bone alias & viseme morph auto-mapper
│   │       ├── SplineAndStrideSolver.ts              # Arc-length CatmullRomCurve3 LUT, tangent yaw & foot-lock phase
│   │       ├── DynamicSplineStitcher.ts              # Cross-chapter inheritStartPose Waypoint-0 stitcher
│   │       ├── IKSolvers.ts                          # Hierarchical Gaze IK + Law-of-Cosines 2-Bone Arm IK
│   │       ├── BoneSocketManager.ts                  # Locks 3D inventory props to ForearmR / ForearmL / Spine bones
│   │       ├── CameraDirectorAndPauseCam.ts          # OTS/TwoShot/SplineDolly rules + Quadratic Bezier snapback swerve
│   │       ├── PauseInspectorCam.ts                  # 6-DOF WASD/QE free-roam & raycast turntable orbit controller
│   │       └── index.ts                              # Package barrel export
│   │
│   ├── video-exporter/                               # @chronos3d/video-exporter — 2D+3D Compositor & Video Muxer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── Canvas2DCompositor.ts                 # Blits WebGL + 2.35:1 cinema letterbox + karaoke subtitles
│   │       ├── WebAudioSceneSynth.ts                 # Formant speech synthesizer & MediaStreamAudioDestinationNode
│   │       ├── MediaRecorderExporter.ts              # Hardware-probed H.264 MP4 / VP9 WebM real-time capture
│   │       ├── WebCodecsOfflineMuxer.ts              # Faster-than-real-time VideoEncoder + VideoFrame stepper
│   │       └── index.ts                              # Package barrel export
│   │
│   └── react-player/                                 # @chronos3d/react-player — Embeddable React Component SDK
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── hooks/
│           │   ├── useTimelineClock.ts               # Master rAF clock with seek() & slow-mo time-scale ramping
│           │   ├── useWorldStateDAG.ts               # Branching inventory, flags, sockets & O(1) checkpoint restore
│           │   └── usePauseInspector.ts              # DIRECTOR_PLAYING <-> PAUSED_INSPECTING <-> SNAPBACK_SWERVE
│           ├── overlays/
│           │   └── DecisionCardModal.tsx             # Mid-video branching UI with countdown & item lock badges
│           ├── ChronosPlayer.tsx                     # Drop-in interactive 3D video player component
│           └── index.ts                              # Package barrel export
│
├── apps/
│   └── studio-web/                                   # Visual 3D Spline, 5-Lane NLE & AI Authoring Studio (Vite + React)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx                              # React 18 root mount
│           ├── sampleManifest.ts                     # RAW_8B_SCENE_MANIFEST with intentional 8B errors for testing
│           └── App.tsx                               # Full 3D Stage, Waypoint Raycast Dragger, NLE & Sanitizer UI
│
└── services/
    ├── tts-aligner-service/                          # Python FastAPI Neural TTS & Forced Word-Alignment Service
    │   ├── requirements.txt
    │   └── app/
    │       ├── models.py                             # Pydantic schemas: SynthesizeAlignedRequest/Response
    │       ├── main.py                               # FastAPI POST /api/v1/synthesize-aligned endpoint
    │       └── providers/
    │           ├── __init__.py
    │           ├── kokoro_whisperx.py                # Local Kokoro-82M + WhisperX wav2vec2 forced aligner
    │           ├── elevenlabs_align.py               # ElevenLabs character-timestamp-to-word/viseme mapper
    │           └── azure_viseme.py                   # Azure Speech SDK VisemeReceived (0..21 -> 14 Oculus) mapper
    │
    └── llm-director-training/                        # 8B Synthetic Dataset & Unsloth QLoRA Fine-Tuning Pipeline
        ├── requirements.txt
        ├── system_prompt.md                          # Causal 8B system prompt with 9-zone landmarks & keep-out rules
        ├── generate_synthetic_scenes.py              # Procedural generator for collision-free JSONL training pairs
        ├── eval_sanitizer_pass_rate.py               # Audits raw vs. sanitized scene compilation pass rates
        └── train_lora_unsloth.py                     # Unsloth / HuggingFace TRL SFTTrainer QLoRA script

```

---

### 2. File-by-File Responsibilities & Key Exports

#### A. Root Workspace & Build Orchestration

* **`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`:** Configure the monorepo workspace topology (`packages/*`, `apps/*`), shared strict TypeScript compilation settings, and Turborepo task caching so `@chronos3d/schema` and `@chronos3d/compiler` always build and typecheck ahead of the 3D runtime and studio app.



#### B. `@chronos3d/schema` (`packages/schema/`)

* **`src/symbolic-ast.types.ts`:** Defines the human- and LLM-authored Abstract Syntax Tree (`SymbolicSceneManifest`), including `TimeExpression` (`number | string`), `ShotType` (`twoShot`, `overTheShoulder`, `splineDolly`, `closeUp`, `establishingOrbit`), `EmotionPreset`, the 14 Oculus/ARKit `VisemeName` constants (`ALL_VISEMES`), `SymbolicDialogueLine`, `SymbolicSplineSegment`, `SymbolicArmIKKeyframe`, `SymbolicTrack`, `SymbolicCameraShot`, and `SymbolicDecisionPrompt`.


* **`src/compiled-ir.types.ts`:** Defines the flat numeric Intermediate Representation (`CompiledSceneManifest`) evaluated at 60 FPS by the renderer, along with `TTSWordBoundary`, `VisemeCue`, `CompiledDialogueSegment`, `CompiledArmIKKeyframe`, and `CompiledAnchorResolutionLog`.


* **`src/world-state.types.ts`:** Defines cross-chapter stateful DAG persistence structures: `PersistentWorldState`, `InventoryItem`, `SocketAttachment` (locking props to `ForearmR`, `ForearmL`, or `Spine`), `CharacterTransformSnapshot`, and `WorldCheckpointSnapshot`.


* **`src/llm-json-schema.ts`:** Exports `STAGE_OBSTACLES` (the Central Containment Pedestal at `[-0.15, -0.45]` with radius `0.72m`), `STAGE_LANDMARKS` (6 calibrated 3D stage zones), and `LLM_SCENE_JSON_SCHEMA` (strict JSON Schema Draft 2020-12 enforcing causal top-to-bottom key generation for Ollama/vLLM constrained decoding).



#### C. `@chronos3d/compiler` (`packages/compiler/`)

* **`src/expression-parser.ts`:** Exports `evaluateTimeExpression(expr, symbolTable)` and `SymbolTableEntry`, parsing `@<id>.start`, `@<id>.end`, `@<id>.duration`, `@<id>.word("<token>")`, `@<id>.word(<index>)`, and `@<id>.progress(<0..1>)` with `+`/`-` floating-point offsets.


* **`src/viseme-compiler.ts`:** Exports `charToOculusViseme(ch)` and `synthesizeWordTimingsForLine(line, lineStartSec, wpmOverride)`, hydrating either real external `ttsWordOffsets` or a deterministic vowel-nucleus/punctuation prosody estimator into `TTSWordBoundary[]` and 14-viseme co-articulation envelopes (`VisemeCue[]`).


* **`src/llm-sanitizer.ts`:** Exports `sanitizeAndRepairLLMScene(rawManifest)` and `SanitizerRepairEntry`, executing four deterministic self-healing passes before compilation: `DIALOGUE_CHAIN_REPAIR` (fixes `start: 0` on `line_2+`), `WORD_STEM_FUZZY_MATCH` (stems `@line.word("surge")` to match spoken `"surging"`), `OBSTACLE_PUSH_OUT` (pushes spline waypoints outside obstacle radii), and `CAMERA_180_AXIS_LOCK` (normalizes `side` across OTS shots).


* **`src/compile-symbolic-manifest.ts`:** Exports `compileSymbolicManifest(symbolic, speakerWpmMap, interTurnGapDeltaSec)`, executing the 4-pass compilation pipeline (Pass 1: Dialogue & Word Boundaries $\to$ Pass 2: Catmull-Rom Splines $\to$ Pass 3: Clips, Gaze, Emotions & Arm IK $\to$ Pass 4: Camera Director Shots) and emitting a detailed `resolutionLog`.


* **`__tests__/compiler.test.ts` & `__tests__/sanitizer.test.ts`:** Vitest suites validating symbolic expression math, WPM time-warping elasticity, sub-1.5ms compilation performance, and all four 8B sanitizer repair rules.



#### D. `@chronos3d/engine-core` (`packages/engine-core/`)

* **`src/AssetRegistry.ts`:** Exports the `AssetRegistry` class, caching `CharacterRigInstance`, `THREE.Object3D` props, `THREE.BufferGeometry`, and `THREE.Material` instances by ID across multi-hour episodes to prevent GPU memory leaks.


* **`src/ProceduralRigBuilder.ts`:** Exports `createCharacterRig(...)`, `CharacterRigInstance`, and `EMOTION_PRESETS`, constructing a 15-bone articulated humanoid hierarchy (`Hips`, `Spine`, `Head`, `BrowL/R`, `ShoulderL/R`, `ForearmL/R`, `ThighL/R`, `ShinL/R`) with 14 procedural viseme morph targets and 5 scrub-safe `THREE.AnimationClip` actions (`Idle`, `Walk`, `Explain`, `PointRight`, `Wave`).


* **`src/GLTFCharacterLoader.ts`:** Exports `bindLoadedGLTFToCharacterRig(...)`, mapping ReadyPlayerMe and Mixamo bone naming conventions (`mixamorigHips`, `LeftForeArm`, etc.) and mesh `morphTargetDictionary` visemes onto `CharacterRigInstance`.


* **`src/SplineAndStrideSolver.ts`:** Exports `smoothstep`, `buildArcLengthCatmullRom(waypoints)`, and `evaluateSplineLocomotionAtTime(...)`, computing uniform arc-length position, curve tangent heading yaw, velocity-blended walk weights, and distance-locked stride phase ($\phi_{\text{stride}} = d(t) / L_{\text{stride}}$).


* **`src/DynamicSplineStitcher.ts`:** Exports `stitchBranchSplineWaypoints(...)`, which reads a character's live $[x, y, z]$ position during chapter transitions with `inheritStartPose: true` and prepends it as Waypoint 0.


* **`src/IKSolvers.ts`:** Exports `applyCharacterLookAtIK(...)` (clamped post-mixer head/neck gaze tracking) and `solveAnalyticalTwoBoneArmIK(...)` (closed-form Law-of-Cosines shoulder and elbow solver for reaching 3D prop coordinates).


* **`src/BoneSocketManager.ts`:** Exports `applyBoneSocketAttachments(...)`, locking held 3D props to animated `ForearmR`, `ForearmL`, or `Spine` world matrices.


* **`src/CameraDirectorAndPauseCam.ts`:** Exports `evaluateCameraDirectorAtTime(...)` (computing `splineDolly`, `twoShot`, and `overTheShoulder` framing along the 180-degree axis) and `evaluateQuadraticBezierSnapback(...)` (computing the 3-point Quadratic Bezier camera arc and Dutch-angle banking roll when resuming from pause).


* **`src/PauseInspectorCam.ts`:** Exports `createInitialPauseCameraState(...)` and `stepPauseInspectorCamera(...)`, driving 6-DOF `WASD`/`QE` free-roam flight and 360° asset orbit zoom while paused.



#### E. `@chronos3d/video-exporter` (`packages/video-exporter/`)

* **`src/Canvas2DCompositor.ts`:** Exports `compositeWebGLAndSubtitlesTo2DCanvas(...)`, blitting the Three.js WebGL canvas onto a 2D mastering canvas with 2.35:1 letterbox bars, timecode telemetry, and word-by-word karaoke subtitle highlighting.


* **`src/WebAudioSceneSynth.ts`:** Exports `createSceneAudioSynth()`, providing a triangle-wave formant synthesizer routed to both speakers and a `MediaStreamAudioDestinationNode` for video muxing.


* **`src/MediaRecorderExporter.ts`:** Exports `probeSupportedVideoMimeType()` and `startCanvasMediaRecorder(...)`, capturing synchronized canvas video + WebAudio tracks into downloadable `.mp4` or `.webm` blobs.


* **`src/WebCodecsOfflineMuxer.ts`:** Exports `renderOfflineWithWebCodecs(...)`, stepping the deterministic renderer frame-by-frame via the hardware `VideoEncoder` and `VideoFrame` APIs for faster-than-real-time offline rendering.



#### F. `@chronos3d/react-player` (`packages/react-player/`) & `apps/studio-web`

* **`packages/react-player/src/hooks/*` & `ChronosPlayer.tsx`:** Provide reusable React hooks (`useTimelineClock`, `useWorldStateDAG`, `usePauseInspector`), `DecisionCardModal`, and the `<ChronosPlayer/>` embeddable component.


* **`apps/studio-web/src/sampleManifest.ts` & `App.tsx`:** Deliver the full interactive authoring studio combining the 3D Stage Viewport, raycast floor-plane waypoint dragging, WPM prosody time-warping sliders, Pass 1–4 anchor resolution table, and live 8B Sanitizer diff inspector.



#### G. Python Backend & Training Services (`services/`)

* **`services/tts-aligner-service/`:** FastAPI service (`app/main.py`, `app/models.py`, and `app/providers/{kokoro_whisperx,elevenlabs_align,azure_viseme}.py`) exposing `POST /api/v1/synthesize-aligned` to return exact acoustic word offsets and 14 Oculus viseme cues.


* **`services/llm-director-training/`:** Complete 8B fine-tuning pipeline containing `system_prompt.md`, `generate_synthetic_scenes.py` (procedural collision-free JSONL generator), `eval_sanitizer_pass_rate.py`, and `train_lora_unsloth.py` (Unsloth/TRL QLoRA trainer for Qwen-2.5-7B and Llama-3.1-8B).



---

Would you like any adjustments or deeper inspection of specific files in this repomap, or are you ready to move to **Step 3: Least-to-Most Dependent File Categorization**?
