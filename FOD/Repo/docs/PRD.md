# Product Requirements Document (PRD): Chronos3D — Declarative 3D Video Engine & Symbolic AI Studio

**Document Version:** 1.0.0
**Architecture Paradigm:** Deterministic 3D Scene Graph + Symbolic TTS Timeline Compiler + Compact 8B LLM Director
**Target Runtime:** WebGL2 / WebGPU (React + Three.js) with Native MP4/WebM Offline & Real-Time Export

## 1. Executive Summary & Product Vision

Chronos3D replaces compute-heavy, hallucination-prone pixel diffusion video generation with a deterministic 3D scene graph driven by a symbolic, word-locked timeline manifest. Instead of requiring a multi-trillion-parameter video diffusion model to synthesize 60 frames of pixels per second—which suffers from character identity drift after a few seconds and cannot support real-time user interaction—Chronos3D allows a compact 7B–8B parameter LLM (or human author) to emit sparse, declarative JSON manifests (~5 KB per minute of video).

By binding 3D Catmull-Rom spline locomotion, skeletal animation crossfades, hierarchical gaze/arm Inverse Kinematics (IK), facial emotion blendshapes, and declarative cinematography rules directly to symbolic TTS word anchors (`@line_2.word("surge")`), Chronos3D delivers multi-hour world consistency, mid-video branching choices, 6-DOF pause-and-inspect exploration, and one-click MP4/WebM video export.

## 2. Problem Statement & Strategic Value Proposition

| Dimension | Pixel Diffusion Video Models | Traditional Game Engines (Unity/Unreal) | Chronos3D Declarative 3D Video Engine |
| --- | --- | --- | --- |
| Multi-Hour Consistency | Degrades after 10–30 seconds; characters, props, and room layouts morph unpredictably. | High consistency, but stateful physics/delta clocks break when scrubbing backward/forward like a video. | 100% Invariant: Persistent Asset Registry guarantees an object at 00:01:00 is identical at 04:30:00, with O(1) deterministic scrubbing at any timestamp `t`. |
| Compute & LLM Footprint | Requires massive GPU clusters per second of generated video. | Requires manual keyframe authoring in complex desktop editors. | Runs on 8B Local LLMs + Browser WebGL: Generates scenes in milliseconds via constrained JSON decoding and renders at 60–120 FPS on consumer devices. |
| Audio / Visual Sync | Post-hoc lip-sync dubbing often drifts from body language and camera cuts. | Requires manual timeline re-keying whenever voiceover audio or language changes. | Acoustically Elastic: Symbolic anchors (`@line_1.word("core")`) automatically stretch or compress spline walks, gestures, and camera cuts to match any TTS voice or language. |
| Interactivity | Passive flat pixels; zero object inspection or state memory. | Full interactivity, but lacks video transport ergonomics and instant MP4 export. | Hybrid Video + 3D Sandbox: Supports branching decision cards, persistent inventory, 6-DOF pause inspection with slow-mo Bezier snap-back, and burned-in MP4 export. |

## 3. Target Personas & Core Use Cases

- **AI-Native EdTech & Interactive Course Creators:** Build multi-hour interactive technical simulations (e.g., engineering labs, medical procedures, software architecture walk-throughs) where learners can pause at any second, orbit-zoom into 3D components, and make branching diagnostic decisions.
- **Automated Episodic Media & Pre-Visualization Studios:** Use local 8B models to generate multi-episode animated series with consistent characters, automated 180-degree-safe camera direction, and instant human fine-tuning via 3D floor waypoint dragging.
- **Documentation-to-Video Pipelines:** Convert technical Markdown blogs or SOPs into narrated, word-synchronized 3D explainer videos with downloadable MP4/WebM outputs for distribution on YouTube, LMS platforms, or social media.

## 4. Functional Requirements Matrix

### 4.1 Core Engine & Deterministic Biomechanics (P0)

- **FR-01: Persistent Asset & GLTF Registry (`useAssetRegistry`):** Instantiate Three.js primitives, lights, and external .glb/.gltf rigged characters (ReadyPlayerMe / Mixamo compatible) once per session by unique assetId.
- **FR-02: Scrub-Safe Skeletal Animation Blender (`evaluateSkeletalTrackAtTime`):** Evaluate THREE.AnimationMixer poses purely as a function of timestamp `t` using normalized smoothstep crossfade weights and `mixer.update(0)`, eliminating delta-clock state drift during arbitrary timeline scrubbing.
- **FR-03: Arc-Length Catmull-Rom Spline Locomotion (`evaluateSplineLocomotionAtTime`):** Route characters along 3D CatmullRomCurve3 paths with arc-length reparameterization (`arcLengthDivisions = 300`), tangent body alignment, centripetal turn banking roll, and distance-locked stride phase (`φ_stride = d(t) / L_stride`) for zero foot-sliding.
- **FR-04: Post-Mixer Hierarchical Gaze IK (`applyCharacterLookAtIK`):** Distribute look-at rotations across Spine (20% share, clamped to ±22° yaw), Head (75% share, clamped to ±62° yaw / ±32° pitch), and binocular EyeL/EyeR bones (±35° yaw with true convergence and periodic blinking). Support automatic conversational turn-taking ("auto").
- **FR-05: Analytical 2-Bone Arm IK (`solveAnalyticalTwoBoneArmIK`):** Compute exact closed-form shoulder and elbow angles via the Law of Cosines and Gram-Schmidt pole vectors so characters physically touch moving 3D props at exact [x, y, z] surface offsets, accompanied by automatic upper-spine reach lean compensation.
- **FR-06: Orthogonal Viseme Lip-Sync & Facial Emotion Mixer:** Drive 14 standard Oculus/ARKit mouth visemes (viseme_aa, viseme_O, viseme_PP, etc.) from TTS phoneme/word boundaries while simultaneously layering 6 affective emotion presets (neutral, happy, concerned, surprised, focused, determined) across eyebrow bones, eyelids, cheeks, and outer mouth corners.

### 4.2 Symbolic Compiler & 8B LLM Generation Pipeline (P0)

- **FR-07: 4-Pass Symbolic Anchor Compiler (`compileSymbolicManifest`):** Resolve symbolic time expressions (`@line_1.start`, `@line_1.end + 0.35`, `@line_2.word("surge") - 0.1`, `@line_2.progress(0.5)`, `@seg_walk.end`) into strict numeric timestamps in less than 2ms.
- **FR-08: Constrained 8B JSON Schema & Causal Field Ordering:** Enforce top-to-bottom causal token generation (chapterPlan → dialogue → tracks → cameraShots → decision) via regex-constrained JSON schema so 7B–8B models never reference undeclared dialogue IDs or words.
- **FR-09: Self-Healing Spatial & Anchor Sanitizer (`sanitizeAndRepairLLMScene`):** Automatically detect and repair raw 8B model errors prior to compilation, including:
  - Radial push-out of spline waypoints that clip inside prop collision zones.
  - Stem/prefix fuzzy matching when a `@line.word("token")` anchor uses a morphological variant of a spoken word.
  - Auto-chaining of unchained `start: "0"` dialogue lines.
  - Normalization of `side: "right"` across consecutive Over-The-Shoulder camera cuts to enforce the 180-degree rule.

### 4.3 Declarative Cinematography, Interactivity & Studio (P1)

- **FR-10: Declarative Camera Director (`evaluateCameraDirectorAtTime`):** Support twoShot (with adaptive actor-separation zoom), overTheShoulder (180° axis-locked), splineDolly (lead, follow, parallel), closeUp (85mm portrait), and establishingOrbit, with both instant hard cuts and scrub-safe multi-second crane blends.
- **FR-11: Stateful Branching DAG & Dynamic Spline Stitching:** Support mid-video interactive DecisionPrompt cards with countdown timers, persistent InventoryItem gating, 3D bone-socket prop attachments (ForearmR), checkpoint time-travel snapshots, and `inheritStartPose: true` spline stitching across chapter boundaries.
- **FR-12: Bullet-Time Pause Inspector & Slow-Mo Bezier Swerve:** Allow pausing at any frame to explore the stage via 6-DOF WASD/QE Free-Roam (with ground-height control) or Click-to-Orbit Asset Turntable Zoom, displaying a Ghost Director Frustum in 3D space. On resume, execute a banked Quadratic Bezier camera swerve while ramping timeline speed from 0.06× to 1.0×.
- **FR-13: Visual 3D Waypoint Dragger & Multi-Track NLE Studio:** Provide raycast-to-ground-plane 3D waypoint dragging, a 5-lane symbolic timeline editor with 1-click word-anchor snapping, a live Sanitizer Repair Diff viewer, and 2D+3D composited MP4/WebM video export.

## 5. Non-Functional Requirements & Performance SLAs

| Metric | Target SLA | Architectural Enforcement |
| --- | --- | --- |
| Viewport Frame Rate | 60 FPS minimum (16.6ms frame budget) on integrated GPUs; 120 FPS on discrete GPUs | Zero React state allocations inside requestAnimationFrame; only UI telemetry updates are throttled to 15–20 Hz. |
| Timeline Scrub Latency | Less than 2.0ms for arbitrary seek across a 3-hour manifest | Pure functional evaluation S(t) of tracks, splines, and mixer.update(0) + chapter boundary checkpoint snapshots. |
| Symbolic Compilation Time | Less than 1.5ms per chapter manifest | Single-pass symbol table hash map + pre-computed CatmullRomCurve3 arc-length lookup tables (arcLengthDivisions = 250). |
| VRAM Memory Ceiling | Less than 350 MB across multi-hour playback | Persistent assetMapRef singleton cache + shared BufferGeometry/Material instancing across chapters. |
| 8B LLM Valid Scene Rate | Greater than 99.5% crash-free compilation rate | Constrained JSON Schema logit masking + sanitizeAndRepairLLMScene post-processor. |

## 6. End-to-End System Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       1. AUTHORING & AI GENERATION LAYER                         │
│  ┌─────────────────────────┐  ┌────────────────────────┐  ┌───────────────────┐  │
│  │ 8B Local LLM Director   │  │ Self-Healing Sanitizer │  │ Visual NLE Studio │  │
│  │ (Ollama / vLLM + Schema)├─►│ (Collision & Stem Fix) ├─►│ (3D WP Dragging)  │  │
│  └─────────────────────────┘  └────────────────────────┘  └─────────┬─────────┘  │
└─────────────────────────────────────────────────────────────────────┼────────────┘
                                                                      │
                                                    SymbolicSceneManifest (.json)
                                                                      │
                                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     2. SYMBOLIC COMPILER & TTS ALIGNMENT LAYER                   │
│  ┌─────────────────────────────┐              ┌───────────────────────────────┐  │
│  │ Pass 1: Acoustic Aligner    │              │ Pass 2–4: Anchor Resolver     │  │
│  │ • ElevenLabs / Kokoro TTS   ├─────────────►│ • @line.word("token") ± dt    │  │
│  │ • Word & Viseme Timestamps  │ Symbol Table │ • Spline LUT & Shot Hydration │  │
│  └─────────────────────────────┘              └──────────────┬────────────────┘  │
└──────────────────────────────────────────────────────────────┼───────────────────┘
                                                               │
                                             CompiledSceneManifest (Numeric)
                                                               │
                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   3. DETERMINISTIC 60FPS 3D RUNTIME ENGINE (t)                   │
│                                                                                  │
│  [Stage A: Locomotion] ──► [Stage B: Base FK Mixer] ──► [Stage C: Post-Pass IK]  │
│  • Catmull-Rom Spline      • Action Crossfade Weights   • Spine/Head/Eye LookAt  │
│  • Arc-Length Stride Lock  • mixer.update(0)            • 2-Bone Arm Law-of-Cos  │
│  • Dynamic Branch Stitch   • Bone Socket Props          • Eyebrow Emotion + Lips │
│                                                                 │                │
│                                                                 ▼                │
│  [Stage E: Video Exporter] ◄── [Stage D: Camera Controller State Machine]        │
│  • 2D+3D Canvas Compositor     • DIRECTOR_PLAYING (OTS, TwoShot, SplineDolly)    │
│  • WebAudio Formant & SFX      • PAUSED_FREE_ROAM (WASD/QE + Height Slider)      │
│  • MP4 / WebM Muxer            • PAUSED_ORBIT_ASSET (Turntable Raycast Zoom)     │
│                                • SNAPBACK_SWERVE (Slow-Mo Bezier + Dutch Roll)   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## 7. Complete Monorepo Repository Map (Repomap)

The project is structured as a modular TypeScript + Python Turborepo (pnpm workspace) so the core 3D engine (@chronos3d/engine-core), the symbolic compiler (@chronos3d/compiler), the embeddable React player (@chronos3d/react-player), and the full authoring studio (apps/studio-web) can be versioned, tested, and published independently.

```text
chronos-3d-studio/
├── package.json                          # Root pnpm workspace & Turborepo scripts
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── packages/
│   ├── schema/                           # @chronos3d/schema — Zero-dependency AST & JSON Schemas
│   │   ├── src/
│   │   │   ├── symbolic-ast.types.ts     # SymbolicSceneManifest, TimeExpression, DecisionPrompt
│   │   │   ├── compiled-ir.types.ts      # CompiledSceneManifest, TTSWordBoundary, VisemeCue
│   │   │   ├── world-state.types.ts      # PersistentWorldState, InventoryItem, SocketAttachment
│   │   │   ├── llm-json-schema.ts        # Constrained decoding JSON Schema for 8B models
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── compiler/                         # @chronos3d/compiler — Symbolic Compiler & 8B Sanitizer
│   │   ├── src/
│   │   │   ├── pass1-acoustic-aligner.ts # Hydrates TTS word boundaries or syllable prosody estimator
│   │   │   ├── pass2-spline-anchors.ts   # Resolves spline segments & registers @seg.end symbols
│   │   │   ├── pass3-track-hydrator.ts   # Evaluates @line.word() ± offset on all keyframes
│   │   │   ├── pass4-camera-validator.ts # Resolves camera shots & repairs 180-degree axis rules
│   │   │   ├── expression-parser.ts      # Regex AST evaluator for TimeExpression grammar
│   │   │   ├── viseme-compiler.ts        # Grapheme/Phoneme-to-14-Oculus-Viseme envelope generator
│   │   │   ├── llm-sanitizer.ts          # sanitizeAndRepairLLMScene (obstacle push & stem match)
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   ├── compiler.test.ts
│   │   │   └── sanitizer.test.ts
│   │   └── package.json
│   │
│   ├── engine-core/                      # @chronos3d/engine-core — Pure Three.js 60FPS Runtime
│   │   ├── src/
│   │   │   ├── registry/
│   │   │   │   ├── AssetRegistry.ts      # Persistent Object3D singleton cache across chapters
│   │   │   │   ├── GLTFCharacterLoader.ts # GLTFLoader wrapper + ReadyPlayerMe/Mixamo bone mapper
│   │   │   │   └── ProceduralRigBuilder.ts # 15-bone fallback humanoid rig + brow/viseme morphs
│   │   │   ├── locomotion/
│   │   │   │   ├── SplinePathSolver.ts   # CatmullRomCurve3 LUT, tangent yaw & turn banking roll
│   │   │   │   ├── StridePhaseLocker.ts  # Arc-length distance d(t)/L_stride foot-lock calculator
│   │   │   │   └── DynamicSplineStitcher.ts # Pre-pends live character [x,y,z] on chapter branch
│   │   │   ├── animation/
│   │   │   │   ├── ScrubSafeMixer.ts     # Deterministic mixer.update(0) action crossfader
│   │   │   │   ├── BoneSocketManager.ts  # Locks 3D inventory props to ForearmR/L world matrices
│   │   │   │   └── FacialEmotionMixer.ts # Orthogonal eyebrow bone + eyelid + smile/frown blender
│   │   │   ├── ik/
│   │   │   │   ├── HierarchicalLookAtIK.ts # 3-tier Spine/Head/Binocular-Eye gaze + blink solver
│   │   │   │   └── TwoBoneArmIKSolver.ts # Law of Cosines + Gram-Schmidt pole vector + spine lean
│   │   │   ├── camera/
│   │   │   │   ├── CameraDirector.ts     # twoShot, overTheShoulder, splineDolly, closeUp rules
│   │   │   │   ├── PauseInspectorCam.ts  # 6-DOF WASD/QE free-roam + raycast turntable orbit zoom
│   │   │   │   ├── BezierSnapbackSwerve.ts # Slow-mo quadratic Bezier swerve + Dutch roll on resume
│   │   │   │   └── OverheadCranePiP.ts   # Secondary WebGL pass with CameraHelper & 180° laser
│   │   │   ├── gizmos/
│   │   │   │   ├── SplineWaypointGizmos.ts # Draggable 3D floor cylinders & Catmull-Rom ribbons
│   │   │   │   ├── IKTriangleGizmo.ts    # Shoulder-Elbow-Wrist lines, Pole beacon & contact ring
│   │   │   │   └── GhostFrustumGizmo.ts  # Amber wireframe marker showing paused director pose
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── video-exporter/                   # @chronos3d/video-exporter — 2D+3D Compositor & Muxer
│   │   ├── src/
│   │   │   ├── Canvas2DCompositor.ts     # Blits WebGL + 2.35:1 letterbox + karaoke subtitles
│   │   │   ├── WebAudioSceneSynth.ts     # Schedules TTS AudioBuffers + formant voice + SFX
│   │   │   ├── MediaRecorderExporter.ts  # Real-time audio-locked & frame-stepped MP4/WebM capture
│   │   │   ├── WebCodecsOfflineMuxer.ts  # Faster-than-real-time VideoEncoder + OfflineAudioContext
│   │   │   └── MimeProber.ts             # Probes H.264/AAC MP4 vs. VP9/Opus WebM support
│   │   └── package.json
│   │
│   └── react-player/                     # @chronos3d/react-player — Embeddable React Component SDK
│       ├── src/
│       │   ├── ChronosPlayer.tsx         # Drop-in interactive 3D video player component
│       │   ├── hooks/
│       │   │   ├── useTimelineClock.ts   # rAF + HTML5 Audio / WebAudio master clock hook
│       │   │   ├── useWorldStateDAG.ts   # Branching chapter graph, inventory & checkpoint history
│       │   │   └── usePauseInspector.ts  # Manages DIRECTOR_PLAYING <-> PAUSED <-> SNAPBACK_SWERVE
│       │   ├── overlays/
│       │   │   ├── DecisionCardModal.tsx # Mid-video branching UI with inventory lock badges
│       │   │   ├── KaraokeSubtitleBar.tsx # Word-highlighted transcript overlay
│       │   │   └── PauseInspectHUD.tsx   # Ground-height slider & click-to-orbit asset selector
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   └── studio-web/                       # Full Visual Authoring Studio, NLE & AI Generator App
│       ├── src/
│       │   ├── pages/
│       │   │   ├── StudioWorkspace.tsx   # Main split-pane 3D Stage + Inspector + 5-Lane NLE
│       │   │   ├── BranchGraphEditor.tsx # Node-graph editor for multi-chapter story DAGs
│       │   │   └── ExportMasteringDeck.tsx # Video rendering & MP4/WebM preview deck
│       │   ├── components/
│       │   │   ├── AIPromptGeneratorBar.tsx # 8B prompt input, preset chips & Ollama connector
│       │   │   ├── SanitizerDiffPanel.tsx   # Before -> After repair cards & Raw/Sanitized toggle
│       │   │   ├── MultiTrackTimeline.tsx   # 5-lane NLE with diamond keyframes & word snapping
│       │   │   ├── ArmIKEmotionPanel.tsx    # Interactive XYZ hand target & eyebrow emotion mixer
│       │   │   └── SymbolicJsonDrawer.tsx   # Live AST viewer, copy & .json download
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
└── services/
    ├── tts-aligner-service/              # Python FastAPI service for Neural TTS + Word Timestamps
    │   ├── app/
    │   │   ├── main.py                   # POST /api/v1/synthesize-aligned
    │   │   ├── providers/
    │   │   │   ├── kokoro_whisperx.py    # Local Kokoro-82M TTS + WhisperX forced phoneme aligner
    │   │   │   ├── elevenlabs_align.py   # ElevenLabs character-timestamp-to-word/viseme mapper
    │   │   │   └── azure_viseme.py       # Azure Speech SDK native VisemeReceived event handler
    │   │   └── models.py
    │   └── requirements.txt
    │
    └── llm-director-training/            # 8B LoRA Fine-Tuning & Synthetic Dataset Pipeline
        ├── generate_synthetic_scenes.py  # Generates 1,000+ collision-free symbolic JSONL examples
        ├── system_prompt.md              # Production 8B causal system prompt
        ├── train_lora_unsloth.py         # Unsloth / QLoRA fine-tuning script for Qwen-2.5-7B / Llama-3.1-8B
        └── eval_sanitizer_pass_rate.py   # Benchmarks raw vs. sanitized compilation pass rates
```

> **Note:** The implemented repository in [`../code/`](../code/) follows this layout with consolidated modules (e.g. `packages/schema/src/symbolic-ast.types.ts`, `packages/compiler/src/compile-symbolic-manifest.ts`, `packages/engine-core/src/SplineAndStrideSolver.ts`, `packages/compiler/__tests__/compiler.test.ts`).

## 8. Core Package Interface Contracts

| Package Name | Primary Exported API | Input Contract | Output Contract |
| --- | --- | --- | --- |
| @chronos3d/schema | `LLM_SCENE_JSON_SCHEMA` | Passed to Ollama / vLLM response_format | Enforces valid SymbolicSceneManifest tokens |
| @chronos3d/compiler | `sanitizeAndRepairLLMScene(raw)` | Unvalidated SymbolicSceneManifest from 8B LLM | `{ repairedManifest, repairs: SanitizerRepairEntry[] }` |
| @chronos3d/compiler | `compileSymbolicManifest(sym, wpm)` | Repaired SymbolicSceneManifest + TTS word offsets | CompiledSceneManifest (deterministic seconds + visemes) |
| @chronos3d/engine-core | `ChronosStageRuntime.evaluateAt(t)` | Timestamp t, CompiledSceneManifest, WorldState | Mutates Three.js bones, morphs, splines, and camera in O(1) |
| @chronos3d/video-exporter | `exportSceneToVideo(stage, cfg)` | ChronosStageRuntime + ExportConfig (fps, bitrate) | `Promise<RecordedVideoArtifact>` (.mp4 or .webm Blob URL) |
| @chronos3d/react-player | `<ChronosPlayer manifest="{...}"/>` | SymbolicSceneManifest or multi-chapter DAG | Interactive WebGL player with branching & pause-inspect |

## 9. Phased Engineering Implementation & Future Roadmap

### Phase 1: Foundation — Core Deterministic Engine & Symbolic Compiler (Months 1–2)

**Deliverables:**

- Publish @chronos3d/schema and @chronos3d/compiler with full unit test coverage for the `@line.word("token")` ± offset DSL and sanitizeAndRepairLLMScene.
- Finalize @chronos3d/engine-core with the Persistent Asset Registry, scrub-safe THREE.AnimationMixer evaluator, and 14-viseme morph target driver.
- Stand up services/tts-aligner-service integrating local Kokoro-82M TTS + WhisperX forced alignment alongside ElevenLabs API fallback.

**Exit Gate:** 100% deterministic scrubbing across a 30-minute multi-chapter manifest at 60 FPS with sub-20ms audio/lip-sync accuracy.

### Phase 2: Biomechanics & Automated Cinematography (Months 3–4)

**Deliverables:**

- Ship the Arc-Length Catmull-Rom Spline Locomotion solver with distance-locked stride phase (`φ_stride`) and centripetal turn banking.
- Ship the 3-tier HierarchicalLookAtIK solver (Spine, Head, Binocular Eyes) and the TwoBoneArmIKSolver (Law of Cosines + Pole Vector + Spine Reach Lean) with orthogonal Eyebrow/Emotion blendshapes.
- Ship the Declarative Camera Director (twoShot, overTheShoulder, splineDolly, closeUp) with automatic 180-degree line enforcement and the PiP Overhead Crane Monitor.

**Exit Gate:** Characters can walk curved paths, gesture, maintain eye contact, reach out to touch props at exact coordinates, and be filmed by automated multi-camera cuts with zero manual keyframing.

### Phase 3: Interactive Branching, Pause Sandbox & Visual NLE Studio (Months 5–6)

**Deliverables:**

- Ship useWorldStateDAG supporting mid-video decision cards, inventory-gated branches, 3D hand-socket attachments, and `inheritStartPose: true` dynamic spline stitching.
- Ship the Bullet-Time Pause Inspector (6-DOF WASD/QE Free-Roam + Click-to-Orbit Asset Zoom) and the Slow-Mo Quadratic Bezier Camera Swerve on resume.
- Launch apps/studio-web with 3D floor waypoint dragging, the 5-lane symbolic NLE timeline, the AI Prompt-to-Scene Generator bar, and the Live Sanitizer Diff Inspector.

**Exit Gate:** End-to-end human-in-the-loop authoring: generate a branching scene from a text prompt via an 8B model, inspect/repair it in the studio, drag 3D waypoints, and play through all branches.

### Future Roadmap (Months 7–12+)

#### Phase 4: Faster-Than-Real-Time 4K WebCodecs Export & Dual-Hand Physics (Months 7–9)

- **Offline WebCodecs + OfflineAudioContext 4K Renderer:** Upgrade @chronos3d/video-exporter to render 60 FPS 4K MP4 (avc1 / hevc) faster than real time using a tight synchronous frame-stepping loop (`new VideoFrame(canvas, { timestamp })`) and mp4-muxer.
- **Dual-Hand Collaborative IK & Prop Handover:** Extend TwoBoneArmIKSolver to support two-handed object carrying (clavicle + both wrists locked to a bounding box) and actor-to-actor prop transfer (smoothly interpolating socket ownership of an asset from actor_aria.ForearmR to actor_zephyr.ForearmL on a spoken word cue).
- **Deterministic Spring-Bone Secondary Motion:** Add a closed-form damped harmonic oscillator pass (`x(t) = A·e^(−ζω₀t)·cos(ω_d·t + φ)`) for hair, cables, and clothing attachments so secondary physics remain 100% scrub-safe at any timestamp `t`.

#### Phase 5: Live Voice Interruption, WebGPU & 8B LoRA Specialization (Months 10–12)

- **"Raise Hand" Live Viewer Voice Interruption:** Allow a viewer watching a paused scene to speak or type a question directly to a character in the 3D scene. The local 8B model + streaming TTS generates an impromptu response line (`@live_reply_1`) while the character turns their head/eyes toward "camera", gestures, and answers—then uses the Slow-Mo Bezier Swerve to resume the main pre-scripted timeline seamlessly.
- **Fine-Tuned Chronos-Director-8B LoRA Weights:** Use services/llm-director-training/generate_synthetic_scenes.py to generate 10,000 verified multi-chapter symbolic manifests and fine-tune a specialized Qwen-2.5-7B / Llama-3.1-8B LoRA adapter that achieves near-zero spatial or anchor errors out of the box.
- **WebGPU Compute Skinning & Gaussian Splatting Backgrounds:** Upgrade the Three.js renderer backend to WebGPURenderer, allowing static photorealistic 3D Gaussian Splat (.splat / .ply) environments to serve as the stage backdrop while rigged GLTF characters walk, interact with props, and cast shadows inside them.
