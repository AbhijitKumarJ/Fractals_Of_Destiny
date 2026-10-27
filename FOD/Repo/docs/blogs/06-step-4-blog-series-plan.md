# Turn 06 — Step 4: 12-Part Blog Series Plan

*Source: `Latest From branched onward.md` — turn 6 of 18*

**User:**

yes

---

**AI:**

## Step 4: Deep-Dive Blog Series Plan (12-Part Architectural Series)

Below is the proposed **12-part technical blog series** unpacking the architecture, mathematical solvers, compiler design, and small-LLM engineering behind **Chronos3D (`chronos-3d-studio` / `ChronosStage 3D`)**.

---

### Proposed 12-Blog Series Lineup

1. **Blog 1: Beyond Pixel Diffusion — Why Symbolic 3D Scene Graphs Are the Future of Long-Form Generative Video**
* **Target Focus:** The architectural paradigm shift from multi-billion-parameter pixel diffusion transformers to declarative 3D timelines driven by compact 7B–8B LLMs.


* **What It Uncovers:** Why pixel diffusion fails on multi-hour spatial persistence, character identity, interactivity, and TTS audio changes; how a ~5 KB/minute JSON manifest paired with a persistent `AssetRegistry` and $O(1)$ checkpoint snapshots scales to 3-hour episodes with flat VRAM usage.




2. **Blog 2: Designing an Acoustically Elastic Timeline — Inside the 4-Pass `@line.word()` Symbolic Compiler**
* **Target Focus:** The `@chronos3d/compiler` package (`expression-parser.ts`, `compile-symbolic-manifest.ts`) and the `TimeExpression` DSL.


* **What It Uncovers:** How `@line_1.start`, `@line_2.word("surge") - 0.1`, `@line_3.progress(0.5)`, and `@walk_1.end` decouple narrative choreography from raw floating-point seconds; how the 4-pass compiler resolves dialogue chains, spline windows, skeletal/IK tracks, and camera cuts in under 1.5ms while automatically time-warping scenes when speaker WPM changes.




3. **Blog 3: Sub-20ms Lip-Sync Without Manual Keyframes — Neural Forced Alignment, Prosody Estimation & 14-Viseme Co-Articulation**
* **Target Focus:** Acoustic word/phoneme alignment (`services/tts-aligner-service`) and procedural mouth blendshape synthesis (`viseme-compiler.ts`).


* **What It Uncovers:** Integrating local **Kokoro-82M + WhisperX**, **ElevenLabs** character timestamps, and **Azure Speech** `VisemeReceived` events alongside a zero-latency vowel-nucleus/punctuation prosody fallback; mapping graphemes and phonemes onto the 14 standard Oculus/ARKit visemes (`viseme_aa`, `viseme_O`, `viseme_PP`, etc.) with cosine bell-curve co-articulation.




4. **Blog 4: Taming 7B–8B LLMs for 3D Choreography — Causal JSON Schemas & The 4-Rule Self-Healing Sanitizer**
* **Target Focus:** Constrained token decoding (`LLM_SCENE_JSON_SCHEMA`), prompt engineering (`system_prompt.md`), and `sanitizeAndRepairLLMScene` (`llm-sanitizer.ts`).


* **What It Uncovers:** Why ordering JSON keys causally (`chapterPlan` $\to$ `dialogue` $\to$ `tracks` $\to$ `cameraShots`) eliminates forward-reference hallucinations in autoregressive 8B models; how the 4-rule sanitizer repairs unchained `start: 0` lines, stems morphological mismatches (`"surge"` $\to$ `"surging"`), pushes waypoints outside the `0.72m` central pedestal keep-out zone, and locks the 180-degree camera axis to achieve $>99.5\%$ compilation pass rates.




5. **Blog 5: Zero-Drift 60 FPS Biomechanics — Scrub-Safe Skeletal Blending & Arc-Length Catmull-Rom Locomotion**
* **Target Focus:** Deterministic skeletal evaluation (`ProceduralRigBuilder.ts`, `GLTFCharacterLoader.ts`) and spline locomotion (`SplineAndStrideSolver.ts`).


* **What It Uncovers:** Why stateful game-engine `mixer.update(dt)` clocks break when scrubbing video timelines and how pure functional evaluation ($S(t)$ with `mixer.update(0)`) guarantees $0.0\text{mm}$ pose variance; eliminating foot-sliding via arc-length reparameterization (`arcLengthDivisions = 250`) and distance-locked stride phase ($\phi_{\text{stride}} = d(t) / L_{\text{stride}}$) while decoupling upper-body gestures from lower-body walking.




6. **Blog 6: Reaching Into the 3D World — Closed-Form 2-Bone Arm IK, Gram-Schmidt Pole Vectors & Hierarchical Gaze Tracking**
* **Target Focus:** Post-mixer analytical Inverse Kinematics (`IKSolvers.ts`, `TwoBoneArmIKSolver.ts`, `HierarchicalLookAtIK.ts`).


* **What It Uncovers:** Why analytical Law-of-Cosines 2-bone IK outperforms iterative CCD/FABRIK solvers for scrub-safe video timelines; deriving shoulder elevation ($\alpha$), elbow flexion ($\beta$), Gram-Schmidt orthogonalized elbow pole planes ($\hat{w}, \hat{v}$), upper-spine lean compensation, and 3-tier Spine/Head/Eye gaze tracking.




7. **Blog 7: Orthogonal Affective Facial Animation — Blending Eyebrow Bones, Eyelids & Emotions Over Live Speech Visemes**
* **Target Focus:** Separating phonetic speech channels from affective emotional expressions (`ProceduralRigBuilder.ts`, `EmotionVisemeMixer.ts`).


* **What It Uncovers:** How to let a character furrow their brow in concern or smile warmly *while simultaneously pronouncing complex syllables* without morph target collisions; driving `BrowL`/`BrowR` bone lift and tilt angles alongside corner-displaced `emotion_smile`/`emotion_frown` blendshapes orthogonal to central lip aperture visemes.




8. **Blog 8: The Mathematical Camera Director — Automating Over-The-Shoulder Cuts, Dynamic Two-Shots & 180-Degree Continuity**
* **Target Focus:** Declarative cinematography (`CameraDirectorAndPauseCam.ts`) and the Picture-in-Picture (PiP) Overhead Crane Monitor.


* **What It Uncovers:** Translating semantic shot archetypes (`twoShot`, `overTheShoulder`, `splineDolly`, `closeUp`, `establishingOrbit`) into live post-IK camera matrices; computing the horizontal Line of Action $\vec{L} = \vec{P}_B - \vec{P}_A$ and perpendicular 180° Side Normal $\hat{N}_{\text{side}}$ so reverse OTS cuts never disorient the viewer or sweep through an actor's head.




9. **Blog 9: Branching Without Jump Cuts — Stateful DAG Narratives, Dynamic Spline Stitching & 3D Bone-Socket Inventories**
* **Target Focus:** Multi-chapter interactive storytelling (`DynamicSplineStitcher.ts`, `BoneSocketManager.ts`, `useWorldStateDAG.ts`, `DecisionCardModal.tsx`).


* **What It Uncovers:** How `inheritStartPose: true` reads a character's live $[x, y, z]$ coordinates at a branch point and injects it as Waypoint 0 to prevent spatial teleportation; locking acquired 3D inventory items (like the Quantum Core) to animated `ForearmR` bone matrices across chapters and enabling $O(1)$ checkpoint time-travel.




10. **Blog 10: Inside the "Bullet-Time" Pause Inspector — 6-DOF Free-Roam, Turntable Orbit & The Quadratic Bezier Camera Swerve**
* **Target Focus:** Interactive spatial exploration during paused playback (`PauseInspectorCam.ts`, `usePauseInspector.ts`, `CameraDirectorAndPauseCam.ts`).


* **What It Uncovers:** Designing the 4-state camera machine (`DIRECTOR_PLAYING`, `PAUSED_FREE_ROAM`, `PAUSED_ORBIT_ASSET`, `SNAPBACK_SWERVE`); preserving timeline determinism when users rotate or elevate paused assets, and formulating the 3D Quadratic Bezier arc $\vec{B}(u)$ with centripetal Dutch-angle roll ($\pm 14^\circ \sin(\pi u)$) and $0.06\times \to 1.0\times$ slow-mo time-dilation ramp on resume.




11. **Blog 11: From Live WebGL to Mastered MP4 — Dual-Canvas 2D+3D Compositing, Formant WebAudio & Faster-Than-Real-Time WebCodecs**
* **Target Focus:** The `@chronos3d/video-exporter` pipeline (`Canvas2DCompositor.ts`, `WebAudioSceneSynth.ts`, `MediaRecorderExporter.ts`, `WebCodecsOfflineMuxer.ts`).


* **What It Uncovers:** Blitting Three.js WebGL buffers onto a 2D mastering canvas with 2.35:1 letterbox bars and burned-in karaoke subtitles; synthesizing triangle-wave vocal formants and sub-bass SFX into a `MediaStreamAudioDestinationNode`; and stepping `VideoEncoder` (`WebCodecs`) frame-by-frame for zero-drop 4K MP4 rendering.




12. **Blog 12: Closing the Human-AI Loop — Raycast Floor-Plane Waypoint Dragging, Multi-Track Symbolic NLE & QLoRA Fine-Tuning**
* **Target Focus:** The visual authoring studio (`apps/studio-web/src/App.tsx`) and the 8B synthetic QLoRA training pipeline (`services/llm-director-training/`).


* **What It Uncovers:** Bi-directional editing where raycast floor-plane mouse drags mutate `SymbolicSceneManifest` waypoints without baking raw frame numbers; procedurally generating thousands of collision-free JSONL training scenes (`generate_synthetic_scenes.py`) to fine-tune `Chronos-Director-8B` via Unsloth and HuggingFace `SFTTrainer`.





---

Would you like to adjust any topics in this 12-blog lineup, or shall we begin **Step 5: Sequential Blog Generation** starting with **Blog 1**?
