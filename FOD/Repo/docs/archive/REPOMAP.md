# Repository Map (Repomap)

> **Archived — generation-time snapshot.** These trees show the `chronos-3d-studio` layout as it was defined when the source code was generated. The live structure is [`../../code/`](../../code/); the forward-looking layout is in [`../PRD.md`](../PRD.md) §7.

## 1. Repository Map (Repomap)

```text
chronos-3d-studio/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── packages/
│   ├── schema/                                   # @chronos3d/schema — Zero-dependency AST, IR & LLM JSON Schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── symbolic-ast.types.ts             # SymbolicSceneManifest, TimeExpression, tracks, shots & decisions
│   │       ├── compiled-ir.types.ts              # CompiledSceneManifest, TTSWordBoundary, VisemeCue & logs
│   │       ├── world-state.types.ts              # PersistentWorldState, InventoryItem, SocketAttachment & snapshots
│   │       ├── llm-json-schema.ts                # Constrained decoding JSON Schema & 9-zone stage landmarks
│   │       └── index.ts
│   │
│   ├── compiler/                                 # @chronos3d/compiler — 4-Pass Symbolic Compiler & 8B Sanitizer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── expression-parser.ts              # Regex evaluator for @line.start, @line.word("token") +/- offset
│   │       ├── viseme-compiler.ts                # Syllable prosody estimator & 14-Oculus-viseme envelope generator
│   │       ├── llm-sanitizer.ts                  # sanitizeAndRepairLLMScene (radial obstacle push-out & stem match)
│   │       ├── compile-symbolic-manifest.ts      # 4-Pass compiler (Dialogue -> Splines -> Tracks -> Camera Shots)
│   │       └── index.ts
│   │
│   ├── engine-core/                              # @chronos3d/engine-core — Deterministic 60FPS Three.js Runtime
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── ProceduralRigBuilder.ts           # 15-bone humanoid rig + brow/eyelid bones + 14 viseme morphs
│   │       ├── SplineAndStrideSolver.ts          # Arc-length CatmullRomCurve3 LUT, tangent yaw & foot-lock stride
│   │       ├── IKSolvers.ts                      # 3-Tier Spine/Head/Eye Gaze IK + Analytical 2-Bone Arm IK
│   │       ├── CameraDirectorAndPauseCam.ts      # Declarative OTS/TwoShot/SplineDolly + Bezier snapback swerve
│   │       └── index.ts
│   │
│   └── video-exporter/                           # @chronos3d/video-exporter — 2D+3D Canvas Compositor & A/V Muxer
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── Canvas2DCompositor.ts             # Blits WebGL buffer + 2.35:1 letterbox + burned-in karaoke text
│           ├── WebAudioSceneSynth.ts             # Formant viseme synthesizer & Quantum Core surge SFX graph
│           ├── MediaRecorderExporter.ts          # Hardware-probed MP4/WebM recorder (audio-locked & frame-stepped)
│           └── index.ts
│
├── apps/
│   └── studio-web/                               # Visual 3D Spline, Multi-Track NLE & Symbolic Studio (Vite + React)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── sampleManifest.ts                 # Intentional raw 8B vs. clean symbolic reactor briefing scene
│           └── App.tsx                           # Full 3D Viewport, Waypoint Dragger, 5-Lane NLE & Sanitizer Studio
│
└── services/
    └── tts-aligner-service/                      # Python FastAPI Neural TTS & Forced Word-Alignment Service
        ├── requirements.txt
        └── app/
            ├── models.py                         # Pydantic request/response schemas matching TTSWordBoundary
            └── main.py                           # POST /api/v1/synthesize-aligned (Kokoro/WhisperX + fallback)
```

## 2. Repository Map of Remaining Files

```text
chronos-3d-studio/
├── packages/
│   ├── compiler/
│   │   ├── package.json                              # Updated with Vitest test runner scripts
│   │   ├── vitest.config.ts                          # Vitest configuration for @chronos3d/compiler
│   │   └── __tests__/
│   │       ├── compiler.test.ts                      # Unit tests for 4-pass compiler, WPM elasticity & <1.5ms SLA
│   │       └── sanitizer.test.ts                     # Unit tests for 4-rule 8B self-healing sanitizer
│   │
│   ├── engine-core/
│   │   └── src/
│   │       ├── AssetRegistry.ts                      # Singleton Three.js Object3D & geometry/material pool
│   │       ├── GLTFCharacterLoader.ts                # ReadyPlayerMe / Mixamo bone & 14-viseme auto-mapper
│   │       ├── DynamicSplineStitcher.ts              # Cross-chapter inheritStartPose Waypoint-0 stitcher
│   │       ├── BoneSocketManager.ts                  # Locks 3D inventory props to ForearmR / ForearmL / Spine
│   │       ├── PauseInspectorCam.ts                  # 6-DOF WASD/QE free-roam & raycast turntable orbit zoom
│   │       └── index.ts                              # Updated barrel export including all engine-core modules
│   │
│   ├── video-exporter/
│   │   └── src/
│   │       ├── WebCodecsOfflineMuxer.ts              # Faster-than-real-time VideoEncoder + OfflineAudioContext
│   │       └── index.ts                              # Updated barrel export
│   │
│   └── react-player/                                 # @chronos3d/react-player — Embeddable React Component SDK
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── hooks/
│           │   ├── useTimelineClock.ts               # Master rAF / WebAudio clock with slow-mo ramp support
│           │   ├── useWorldStateDAG.ts               # Stateful branching DAG, inventory & checkpoint time-travel
│           │   └── usePauseInspector.ts              # DIRECTOR_PLAYING <-> PAUSED <-> SNAPBACK_SWERVE state machine
│           ├── overlays/
│           │   └── DecisionCardModal.tsx             # Mid-video branching UI with countdown & item lock badges
│           ├── ChronosPlayer.tsx                     # Drop-in interactive 3D video player component
│           └── index.ts
│
└── services/
    ├── tts-aligner-service/
    │   └── app/
    │       └── providers/
    │           ├── __init__.py
    │           ├── kokoro_whisperx.py                # Local Kokoro-82M + WhisperX forced phoneme/word aligner
    │           ├── elevenlabs_align.py               # ElevenLabs character-timestamp-to-word/viseme adapter
    │           └── azure_viseme.py                   # Azure Speech SDK WordBoundary & VisemeReceived adapter
    │
    └── llm-director-training/                        # 8B Synthetic Dataset & Unsloth QLoRA Fine-Tuning Pipeline
        ├── requirements.txt
        ├── system_prompt.md                          # Production 8B causal system prompt with 9-zone landmarks
        ├── generate_synthetic_scenes.py              # Generates 1,000+ collision-free symbolic JSONL examples
        ├── eval_sanitizer_pass_rate.py               # Benchmarks raw vs. sanitized compilation pass rates
        └── train_lora_unsloth.py                     # Unsloth QLoRA script for Qwen-2.5-7B & Llama-3.1-8B
```
