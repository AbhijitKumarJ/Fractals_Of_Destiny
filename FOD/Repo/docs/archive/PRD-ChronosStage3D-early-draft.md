# Product Requirements Document (PRD): ChronosStage 3D

Declarative 3D Video Engine, Symbolic TTS Compiler & Small-LLM Authoring Studio

> **Archived — early draft.** This PRD predates the rename to **Chronos3D** and describes the earlier `chronos-stage-3d/` monorepo layout (`@chronos/*` packages). It is superseded by [`../PRD.md`](../PRD.md) and kept for historical reference. Formatting was restored from the source conversation; section 6 was truncated mid-table in the source.

## 1. Executive Summary & Product Vision

### 1.1 Problem Statement

Current generative video paradigms (pixel-diffusion models) suffer from four structural bottlenecks that prevent them from scaling to long-form, interactive, or educational media:

- **Compute & Parameter Bloat:** Hallucinating 24 to 60 frames of pixels per second requires massive multi-billion or trillion-parameter diffusion transformers and expensive GPU clusters.
- **Temporal & Spatial Drift:** Over multi-minute or multi-hour timelines, characters, props, and room layouts mutate or vanish whenever the camera cuts away.
- **Opaque, Non-Interactive Pixels:** Diffusion outputs flat raster pixels—viewers cannot pause to inspect 3D objects, branch the story without jump cuts, or dynamically edit a single word or gesture without re-rendering the entire video.
- **Audio-Visual Desynchronization:** Authoring frame-accurate animations synced to Text-to-Speech (TTS) breaks whenever the voice model, speaking rate (WPM), or language changes.

### 1.2 Solution Overview

ChronosStage 3D replaces pixel diffusion with a deterministic 3D scene graph driven by a symbolic timeline manifest. Compact 7B–8B parameter LLMs (or human authors) emit lightweight JSON scripts containing symbolic acoustic anchors (`@line_2.word("surge")`), Catmull-Rom spline waypoints, post-mixer inverse kinematics (IK), and declarative camera rules. A 4-pass compiler resolves these symbolic anchors against TTS word boundaries in under 5 milliseconds, driving a 60 FPS React + Three.js engine that can run coherently for hours in the browser or export directly to standalone MP4/WebM video files.

## 2. Target Personas & Core Use Cases

| Persona | Primary Use Case | Key Value Proposition |
| --- | --- | --- |
| EdTech & Technical Course Creators | Multi-hour interactive 3D explainers, software/hardware walkthroughs, and virtual labs. | Viewers can pause at any second, free-roam the 3D stage, orbit-zoom into components, and resume with a slow-motion camera swerve. |
| Interactive Story & Game Designers | Branching narrative episodes with persistent inventory, 3D bone-socket props, and world flags. | Dynamic spline stitching (inheritStartPose) eliminates jump cuts across story branches regardless of where characters stood previously. |
| Automated AI Media Pipelines | Local 8B LLM batch generation of localized training videos in 20+ languages. | Symbolic word anchors (`@line_1.word("reactor")`) automatically stretch or compress spline walks, gestures, and camera cuts to match each language's TTS cadence. |
| Indie Directors & Pre-Vis Teams | Rapid 3D storyboarding and camera blocking with instant MP4/WebM export. | Drag 3D spline waypoints on the floor grid while the Declarative Camera Director enforces the 180-degree rule automatically. |

## 3. Functional Requirements (FR)

### FR-01: Symbolic TTS-to-Timeline Compiler (@line.word())

- **FR-01.1 (Symbolic DSL):** Support symbolic time expressions across all timeline fields: `@<id>.start`, `@<id>.end`, `@<id>.duration`, `@<id>.word("<token>")`, `@<id>.word(<index>)`, `@<id>.progress(<0..1>)`, and arithmetic offsets (`+ 0.35`, `- 0.15`).
- **FR-01.2 (Acoustic Word Alignment):** Ingest exact word/phoneme boundary arrays from neural TTS APIs (ElevenLabs, Azure Speech, Kokoro/WhisperX) or fall back to a deterministic syllable/punctuation prosody estimator for instant offline previewing.
- **FR-01.3 (4-Pass Elastic Compilation):** Resolve (1) sequential dialogue chains, (2) spline locomotion windows, (3) skeletal/IK/emotion keyframes, and (4) camera director cuts into a flat, chronologically sorted CompiledSceneManifest.

### FR-02: Persistent Asset Registry & Multi-Hour World State

- **FR-02.1 (Singleton 3D Asset Pool):** Instantiate GLTF/procedural character rigs, lights, and props once by persistent id in assetMapRef, preventing memory leaks across multi-hour playback.
- **FR-02.2 (3D Bone-Socket Prop Attachments):** Allow world-state effects to lock any 3D prop mesh (e.g., holo_core) onto a character's animated bone socket (ForearmR, ForearmL, Spine) with local offset and scale.
- **FR-02.3 (O(1) Checkpoint Time-Travel):** Capture lightweight JSON snapshots (less than 2 KB) of { inventory, flags, socketAttachments, characterTransforms } at chapter boundaries for instant timeline rewinding.

### FR-03: Catmull-Rom Spline Locomotion & Stride Engine

- **FR-03.1 (Arc-Length Reparameterization):** Evaluate THREE.CatmullRomCurve3 with high-density arc-length look-up tables (arcLengthDivisions = 250+) so characters move at uniform physical speeds regardless of waypoint spacing.
- **FR-03.2 (Distance-Locked Stride Phase):** Drive the Walk skeletal clip's local clock via physical ground distance traveled (`φ_stride = (d(t) / L_stride) mod 1.0`), eliminating foot-sliding at any speed.
- **FR-03.3 (Tangent Heading & Centripetal Banking):** Align character root yaw to the horizontal spline tangent `atan2(T_x, T_z)` and apply subtle inward torso roll proportional to turn curvature and velocity.
- **FR-03.4 (Cross-Chapter Spline Stitching):** When `inheritStartPose: true` is set on a branched chapter's spline segment, automatically inject the character's live [x, y, z] world coordinate as Waypoint 0.

### FR-04: Post-Mixer Inverse Kinematics (Gaze IK & 2-Bone Arm IK)

- **FR-04.1 (3-Tier Gaze IK):** Execute after mixer.update(0) to distribute look-at rotations across Spine (20% share, clamped to ±22° yaw), Head (75% share, clamped to ±62° yaw / ±32° pitch), and binocular EyeL/EyeR bones (±35° yaw with true 3D vergence and micro-saccades).
- **FR-04.2 (Auto-Speaker Turn-Taking):** When lookAtTarget is "auto", listeners automatically track the active speaker's headBone, while the active speaker alternates gaze between listeners and the "camera".
- **FR-04.3 (Analytical Law-of-Cosines 2-Bone Arm IK):** Solve Shoulder → Forearm → Hand rotations in O(1) closed form with a Gram-Schmidt Pole Vector for elbow orientation and automatic upper-spine forward lean compensation when reaching near full arm extension.

### FR-05: Layered Facial Emotion & TTS Viseme Rig

- **FR-05.1 (14 Oculus/ARKit Visemes):** Drive speech blendshapes (viseme_aa, viseme_O, viseme_E, viseme_U, viseme_PP, viseme_FF, etc.) and jawBone rotation using smooth cosine-bell co-articulation envelopes.
- **FR-05.2 (Orthogonal Emotion Channels):** Layer browLBone/browRBone lift and symmetrical tilt, upper/lower eyelid aperture (wide vs. squint), cheekbone lift, and outer-mouth corner morphs (emotion_smile, emotion_frown) on top of active visemes for 6 core presets (neutral, happy, concerned, surprised, focused, determined).

### FR-06: Declarative Cinematography Director

- **FR-06.1 (Semantic Shot Archetypes):** Support twoShot (auto-scaling distance with actor separation), overTheShoulder (biasing framing 78% toward target speaker and 22% toward foreground shoulder), splineDolly (lead, follow, parallel), closeUp (85mm portrait lens), and establishingOrbit.
- **FR-06.2 (180-Degree Line of Action Lock):** Maintain consistent screen-left / screen-right actor placement across shot-reverse-shot cuts via a canonical `side: "right" | "left"` normal vector.
- **FR-06.3 (Scrub-Safe Crane Blending):** Evaluate both outgoing and incoming shot rules at timestamp `t` during non-zero transitionDuration windows so scrubbing backward or forward is 100% deterministic.

### FR-07: Interactive Branching & "Bullet-Time" Pause Inspector

- **FR-07.1 (Mid-Video Decision Cards):** Pause timeline progression at decision.triggerTime while keeping 3D character breathing, eye saccades, and subtle camera drift alive at 60 FPS; gate choices dynamically via requiredItemId and requiredFlag.
- **FR-07.2 (6-DOF Pause Free-Roam & Click-to-Orbit Zoom):** Allow viewers to pause at any frame, fly/walk around the stage using WASD/Arrows and Q/E (height from ground slider), or click any 3D asset/floor coordinate to enter a 360-degree turntable orbit while displaying a glowing Ghost Director Camera Frustum.
- **FR-07.3 (Cinematic Slow-Mo Bezier Snap-Back):** On resume, execute a 3D Quadratic Bezier camera swerve with a ±13° Dutch-angle banking roll and FOV warp back into the moving Director Camera while ramping timeline speed from 0.06× slow-motion to 1.0× real time.

### FR-08: Visual Authoring Studio & Self-Healing 8B LLM Pipeline

- **FR-08.1 (3D Floor-Plane Waypoint Dragging):** Raycast pointer drags against 3D waypoint gizmo cylinders onto the Y=0 ground plane, updating SymbolicSceneManifest waypoints and rebuilding CatmullRomCurve3 arc-lengths in real time.
- **FR-08.2 (Multi-Track Symbolic NLE):** Provide synchronized horizontal lanes for Dialogue Words, Splines, Skeletal Clips, Arm IK, Gaze IK, Emotions, and Camera Shots with 1-click binding to spoken word pills.
- **FR-08.3 (Self-Healing 8B Sanitizer):** Automatically repair raw 8B LLM outputs before compilation: (1) radial obstacle push-out from the central pedestal keep-out zone, (2) stem/prefix fuzzy matching for `@line.word()` anchors, (3) sequential chaining of `start: "0"` lines, and (4) 180-degree camera side normalization.

### FR-09: Deterministic Video & WebAudio Exporter

- **FR-09.1 (Unified 2D+3D Canvas Compositor):** Composite the Three.js WebGL buffer, 2.35:1 anamorphic letterbox bars, timecode HUD, and karaoke word-highlighted subtitles onto a single master `<canvas>`.
- **FR-09.2 (Sample-Locked WebAudio Graph & Muxer):** Route TTS audio buffers, formant viseme synthesis, and procedural SFX through a MediaStreamAudioDestinationNode multiplexed with the canvas video stream into downloadable H.264/AAC .mp4 or VP9/Opus .webm files.

## 4. Non-Functional Requirements (NFR) & Performance SLAs

| Metric | Target SLA | Verification Method |
| --- | --- | --- |
| Frame Pacing & Scrub Determinism | ≥60 FPS on integrated desktop GPUs; 0.0mm pose variance when scrubbing to timestamp `t` from any direction. | Automated unit test comparing bone world matrices at t=12.40s after forward playback vs. backward seek. |
| Symbolic Compilation Latency | Less than 5ms for a 15-minute chapter manifest (Pass 1–4). | Benchmark timer in compileSymbolicManifest(). |
| Multi-Hour VRAM Footprint | Flat memory growth (less than 15MB delta over 3 hours of chapter transitions). | Chrome DevTools WebGL memory profiler across 20 sequential chapter transitions. |
| 8B LLM Compilation Success Rate | Greater than 99.5% crash-free compilation when combining Constrained JSON Decoding + sanitizeAndRepairLLMScene. | 500-prompt automated fuzzing suite with Llama-3.1-8B-Instruct and Qwen-2.5-7B-Instruct. |

## 5. Complete Repository Map (Repomap)

The project is structured as a modular TypeScript + Python Monorepo (pnpm workspaces + Turborepo) separating the zero-dependency symbolic compiler and schema from the Three.js runtime, React studio UI, and 8B LLM training scripts.

```text
chronos-stage-3d/
├── package.json                           # Root workspace config (pnpm + Turborepo)
├── pnpm-workspace.yaml                    # Workspace package declarations
├── tsconfig.base.json                     # Strict shared TypeScript configuration
│
├── packages/
│   ├── schema/                            # @chronos/schema — Isomorphic Types & JSON Schemas
│   │   ├── src/
│   │   │   ├── symbolicManifest.ts        # SymbolicSceneManifest, TimeExpression, Track & Shot types
│   │   │   ├── compiledManifest.ts        # CompiledSceneManifest, TTSWordBoundary, VisemeCue types
│   │   │   ├── worldState.ts              # PersistentWorldState, InventoryItem, SocketAttachment, Snapshot
│   │   │   ├── stageLandmarks.ts          # Calibrated 9-Zone Stage Landmark constants & Keep-Out radii
│   │   │   └── llmJsonSchema.json         # Strict Draft 2020-12 JSON Schema for vLLM/Ollama constrained decoding
│   │   └── package.json
│   │
│   ├── compiler/                          # @chronos/compiler — Symbolic Compiler & 8B Self-Healing Sanitizer
│   │   ├── src/
│   │   │   ├── evaluateTimeExpression.ts  # Regex parser for @line.start, @line.word(), @seg.end +/- offset
│   │   │   ├── prosodyEstimator.ts        # Syllable, vowel-nucleus & punctuation WPM word-boundary estimator
│   │   │   ├── visemeCompiler.ts          # Grapheme & TTS phoneme-to-14-Oculus-viseme co-articulation compiler
│   │   │   ├── compileSymbolicManifest.ts # 4-Pass AST compiler producing CompiledSceneManifest + ResolutionLog
│   │   │   └── sanitizeLLMScene.ts        # 4-Rule self-healing sanitizer (obstacle push-out, stem match, 180° lock)
│   │   └── __tests__/
│   │       ├── compiler.spec.ts           # Deterministic anchor resolution & WPM elasticity unit tests
│   │       └── sanitizer.spec.ts          # Fuzz tests for broken 8B LLM word anchors & pedestal collisions
│   │
│   ├── engine-three/                      # @chronos/engine-three — Deterministic 3D Runtime & Kinematics
│   │   ├── src/
│   │   │   ├── registry/
│   │   │   │   ├── AssetRegistry.ts       # Persistent Three.js Object3D pool & GLTF clone cache
│   │   │   │   ├── HumanoidRigBuilder.ts  # 15-Bone procedural SkinnedMesh rig + eyebrows, eyelids & viseme morphs
│   │   │   │   └── GLTFCharacterLoader.ts # ReadyPlayerMe / Mixamo bone & morphTargetDictionary auto-mapper
│   │   │   ├── locomotion/
│   │   │   │   ├── SplineCompiler.ts      # CatmullRomCurve3 builder, 3D tube/waypoint gizmos & dynamic stitching
│   │   │   │   └── StrideSolver.ts        # Arc-length velocity differentiation, tangent banking & foot-lock phase
│   │   │   ├── kinematics/
│   │   │   │   ├── SkeletalMixerEval.ts   # Scrub-safe delta=0 AnimationMixer crossfade evaluator
│   │   │   │   ├── GazeIKSolver.ts        # 3-Tier Spine, Head & Binocular Eye vergence lookAt post-pass
│   │   │   │   ├── TwoBoneArmIKSolver.ts  # Law-of-Cosines analytical 2-bone limb solver + Gram-Schmidt Pole Vector
│   │   │   │   └── SocketAttachmentPass.ts # Locks held 3D props to animated ForearmR / ForearmL / Spine matrices
│   │   │   ├── facial/
│   │   │   │   └── EmotionVisemeMixer.ts  # Orthogonal eyebrow/eyelid/smile emotion channels + 14 speech visemes
│   │   │   └── camera/
│   │   │       ├── CameraDirector.ts      # twoShot, overTheShoulder, splineDolly, closeUp & 180-degree line solver
│   │   │       ├── PauseInspectorCam.ts   # 6-DOF WASD/QE free-roam + raycast click-to-orbit turntable controller
│   │   │       └── BezierSwerveSnapback.ts # Slow-mo Quadratic Bezier camera arc + Dutch roll + time-scale ramp
│   │   └── package.json
│   │
│   ├── audio-tts/                         # @chronos/audio-tts — Neural TTS Providers & WebAudio Graph
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── elevenLabsProvider.ts  # ElevenLabs with-timestamps API adapter -> TTSWordBoundary[]
│   │   │   │   ├── azureSpeechProvider.ts # Azure Cognitive Services WordBoundary & VisemeReceived adapter
│   │   │   │   ├── kokoroLocalProvider.ts # Local Kokoro-82M + WhisperX word-alignment adapter
│   │   │   │   └── webSpeechFallback.ts   # Browser SpeechSynthesisUtterance rate-matched live previewer
│   │   │   └── webaudio/
│   │   │       └── SceneAudioGraph.ts     # Schedules TTS AudioBuffers, Formant Viseme Synth & SFX to MediaStream
│   │   └── package.json
│   │
│   ├── exporter/                          # @chronos/exporter — Deterministic 2D+3D Video & Audio Mastering
│   │   ├── src/
│   │   │   ├── Canvas2DCompositor.ts      # Blits WebGL buffer + 2.35:1 letterbox + karaoke subtitles + HUD
│   │   │   ├── MimeTypeProber.ts          # Hardware H.264/AAC MP4 vs. VP9/Opus WebM capability detector
│   │   │   ├── MediaRecorderExporter.ts   # Real-time audio-clock-locked & frame-stepped MediaRecorder pipeline
│   │   │   └── WebCodecsOfflineMuxer.ts   # Faster-than-real-time VideoEncoder + OfflineAudioContext MP4 muxer
│   │   └── package.json
│   │
│   └── react-sdk/                         # @chronos/react-sdk — Embeddable Player Hooks & Components
│       ├── src/
│       │   ├── hooks/
│       │   │   ├── useTimelineClock.ts    # Master rAF / WebAudio clock with variable time-scale & scrubbing
│       │   │   ├── useWorldStateStore.ts  # Persistent inventory, flags, sockets & checkpoint time-travel hook
│       │   │   ├── useSceneInteraction.ts # 3D raycast hover/click & Pause-Inspect state machine hook
│       │   │   └── useAISceneGenerator.ts # Ollama/vLLM client + sanitizer + live compiler hook
│       │   └── components/
│       │       ├── ChronosVideoPlayer.tsx # Standalone interactive 3D player component for web embeds
│       │       └── DecisionOverlayCard.tsx # Mid-video branching UI with countdown timer & inventory lock badges
│       └── package.json
│
├── apps/
│   └── studio-web/                        # Full Visual 3D Spline, NLE Timeline & AI Authoring Studio (Vite + React)
│       ├── src/
│       │   ├── components/
│       │   │   ├── Viewport3DStage.tsx    # Dual-canvas (Cinema + PiP Crane) & 3D floor-plane waypoint dragger
│       │   │   ├── MultiTrackTimeline.tsx # 7-Lane NLE editor (Dialogue, Splines, Clips, Arm IK, Gaze, Camera)
│       │   │   ├── SymbolicInspector.tsx  # 1-Click spoken word anchor binder, Arm IK XYZ & Emotion sliders
│       │   │   ├── AIPromptGenerator.tsx  # Natural language prompt bar + Sanitizer Before/After diff audit log
│       │   │   ├── StoryGraphNavigator.tsx # DAG chapter branching tree & checkpoint snapshot time-traveler
│       │   │   └── VideoExportModal.tsx   # MP4/WebM mastering deck with live frame counter & download preview
│       │   ├── presets/
│       │   │   └── sampleEpisodes.ts      # Pre-built multi-chapter sample manifests
│       │   └── App.tsx
│       └── package.json
│
└── training/
    └── lora-8b-director/                  # Python Toolchain for Fine-Tuning 8B Models on Symbolic 3D Scenes
        ├── prompts/
        │   └── system_prompt_v2.md        # Production causal system prompt with 9-zone stage landmarks
        ├── generate_synthetic_dataset.py  # Procedural generator creating 5,000 collision-free JSONL scene pairs
        ├── validate_dataset.py            # Runs @chronos/compiler & sanitizer over JSONL training split
        └── train_qlora_unsloth.py         # Unsloth / HuggingFace TRL QLoRA script for Llama-3.1-8B & Qwen-2.5-7B
```

## 6. Module Dependency & Frame Execution Pipeline

Every rendered frame at timestamp `t` flows strictly downward through six deterministic stages so that lower layers never corrupt higher layers:

| Execution Order | Package / Module | Input State | Output Mutation on Three.js Scene Graph |
| :--- | :--- | :--- | :--- |

> **Note:** The table body was never present in the source export (truncated mid-document).
