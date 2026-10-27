# Next Steps: Transitioning Chronos3D to a Production Monorepo

> **Archived — branch planning notes.** Early planning conversation from the branch that produced the monorepo. Largely superseded by the phased roadmap in [`../PRD.md`](../PRD.md) §9 and by the implemented code in [`../../code/`](../../code/). Kept for historical reference.

Transitioning Chronos3D from single-file React prototypes and the Product Requirements Document (PRD) into a production monorepo can be broken down into five immediate engineering tracks.

## 1. Immediate Implementation Tracks (Phase 1–3 Execution)

### 1. Monorepo Scaffolding & AST Extraction

- **Target Packages:** @chronos3d/schema & @chronos3d/compiler
- **Concrete Deliverable:** Extract the TypeScript interfaces, constrained decoding JSON schema (LLM_SCENE_JSON_SCHEMA), 4-pass symbolic compiler (compileSymbolicManifest), and self-healing sanitizer (sanitizeAndRepairLLMScene) into standalone zero-dependency packages.
- **Primary Technical Goal:** Hit the < 1.5ms compilation SLA and verify > 99.5% compilation pass rates with automated unit tests (compiler.test.ts, sanitizer.test.ts).

### 2. Real Neural TTS & Forced Alignment Service

- **Target Service:** services/tts-aligner-service
- **Concrete Deliverable:** Build the Python FastAPI backend (POST /api/v1/synthesize-aligned) integrating local Kokoro-82M + WhisperX forced alignment alongside ElevenLabs and Azure Speech viseme/word-boundary adapters.
- **Primary Technical Goal:** Replace the fallback syllable prosody estimator with sub-20ms acoustic word and phoneme timestamps.

### 3. Production GLTF/GLB Character Loader

- **Target Package:** @chronos3d/engine-core (GLTFCharacterLoader.ts)
- **Concrete Deliverable:** Upgrade the 15-bone procedural humanoid rig to load rigged .glb/.gltf characters (ReadyPlayerMe / Mixamo compatible) with automatic bone-socket mapping (ForearmR, Spine, Head, EyeL/R) and 14 Oculus/ARKit viseme blendshape binding.
- **Primary Technical Goal:** Enable production-ready character meshes while keeping < 350 MB VRAM usage across multi-hour episodes via AssetRegistry instancing.

### 4. 8B Synthetic Dataset & QLoRA Pipeline

- **Target Service:** services/llm-director-training
- **Concrete Deliverable:** Implement generate_synthetic_scenes.py to procedurally generate 1,000 to 5,000 collision-free symbolic JSONL examples and validate them against @chronos3d/compiler before running train_lora_unsloth.py on Qwen-2.5-7B or Llama-3.1-8B.
- **Primary Technical Goal:** Eliminate spatial collisions and malformed symbolic anchors at the model weights level.

## 2. High-Impact Feature Prototypes (Phase 4–5 Roadmap)

If you prefer to continue building interactive prototypes before splitting the code into a monorepo, the PRD outlines four high-value features that have not yet been written in code:

- **Faster-Than-Real-Time 4K Offline Video Exporter (WebCodecsOfflineMuxer.ts):** Upgrade the real-time MediaRecorder pipeline to use the browser's native VideoEncoder (WebCodecs API) and OfflineAudioContext. Stepping the deterministic renderer frame-by-frame (`new VideoFrame(canvas, { timestamp })`) allows rendering 60 FPS MP4 files faster than real-time playback without dropped frames.
- **"Raise Hand" Live Viewer Voice Interruption:** Extend the Bullet-Time Pause Inspector so viewers can speak or type a question directly to ARIA or ZEPHYR while paused. A local 8B model + streaming TTS generates an impromptu response (`@live_reply_1`) while the character turns their gaze IK toward "camera" and gestures, then triggers the Slow-Mo Quadratic Bezier Swerve to seamlessly rejoin the main timeline.
- **Dual-Hand Collaborative IK & Actor-to-Actor Prop Handover:** Extend TwoBoneArmIKSolver and BoneSocketManager so a character can carry large props with both hands locked to a bounding box, or smoothly transfer a 3D prop from actor_aria.ForearmR to actor_zephyr.ForearmL on an exact spoken word cue.
- **Deterministic Spring-Bone Secondary Motion & Gaussian Splat Stages:** Add a closed-form damped harmonic oscillator pass (`x(t) = A·e^(−ζω₀t)·cos(ω_d·t + φ)`) for scrub-safe hair/cloth physics, or integrate a WebGPU 3D Gaussian Splatting (.splat / .ply) background loader so characters walk inside photorealistic captured environments.

## 3. Recommended Immediate Action Plan

- **Lock the Core Compiler & Sanitizer Package:** Generate the complete, standalone source files for @chronos3d/schema and @chronos3d/compiler (including the regex expression parser, 4-pass hydrator, obstacle push-out sanitizer, and Vitest test suite) so your data contract is frozen.
- **Stand Up the Local TTS + WhisperX Alignment Server:** Build the services/tts-aligner-service FastAPI microservice so the studio can ingest real synthesized audio buffers and exact word boundaries.
- **Prototype the "Raise Hand" Live Interruption or GLTF Loader:** Build the next interactive React + Three.js artifact demonstrating either real .glb character loading or live mid-pause conversational interruption with characters.

Which of these next steps would you like to build first—the standalone @chronos3d/compiler + @chronos3d/schema codebase, the Python FastAPI TTS word-alignment service, or an interactive prototype for "Raise Hand" live viewer interruption / GLTF character loading?
