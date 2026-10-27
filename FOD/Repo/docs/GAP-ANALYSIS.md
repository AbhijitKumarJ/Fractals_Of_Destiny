# Gap Analysis & Status Assessment — Chronos3D

**Subject:** Evaluation of `PRD.md` against the implemented codebase (`../code/`) and against the target vision described in the 21-blog series (`blogs/`).

**Sources used:**
- `PRD.md` — product requirements (authoritative spec).
- `../code/` — 67-file implementation, verified by typecheck, unit tests, production build, and a live end-to-end run of the Python service.
- `blogs/01…27` — the design/engineering series that defines the *target* beyond the current PRD.

**Status legend:**

| Symbol | Meaning |
|---|---|
| ✅ | Implemented and verified |
| 🟡 | Partial — implemented with gaps, or implemented as a library but not wired into a user-facing surface |
| 🔴 | Not implemented (target only) |

---

## 1. Executive Summary

1. **The baseline core (Blogs 1–12 / PRD Phases 1–3) is real and working.** The schema, symbolic compiler, sanitizer, locomotion/gaze/arm IK solvers, camera director, branching DAG, pause-inspector math, and both export paths exist, typecheck cleanly, and pass their unit tests. The Python aligner service responds correctly end-to-end.
2. **The studio is the largest PRD-vs-code gap.** PRD §7 describes a split-pane NLE studio (5-lane timeline, branch graph editor, export deck, AI prompt bar, JSON drawer, dedicated panels). What exists is a single-file `App.tsx` (876 lines) that delivers a meaningful but smaller feature set: 3D viewport, waypoint dragging, sanitizer diff cards, resolution table, WPM sliders, scrubber, and Web Speech TTS preview.
3. **The entire advanced target (Blogs 13–21 / PRD Phases 4–5) is absent from code** except for a few incidental overlaps (pinch-knot guard, formant voice synth, mime probing). Spring-bone physics, prop handover, raise-hand interruption, Gaussian splats, cross-lingual retargeting, N-actor gazing/occlusion, capsule-BVH picking, zero-alloc/SoA performance work, and the self-evolving director loop have no implementation.
4. **The PRD itself is incomplete relative to the blog target.** Cross-lingual localisation, N-actor scenes, occlusion-aware framing, selection/picking, performance engineering constraints, and the meta/self-improvement loop are never specified. Deployment, packaging, security, browser-support, persistence, accessibility, and acceptance-test plans are also absent.
5. **Verification is green today:** `pnpm typecheck` 6/6 tasks, `vitest` 4/4 tests, `turbo build` succeeds, FastAPI service returns 200 with valid word/viseme payloads.

---

## 2. PRD Functional Requirements — Coverage Matrix

| ID | Requirement (abridged) | Status | Implementation / Gap |
|---|---|---|---|
| FR-01 | Asset Registry + GLTF strict bone/morph binding | 🟡 | `engine-core/AssetRegistry.ts` (caches) + `GLTFCharacterLoader.ts` (bone aliases incl. `mixamorig*`). No `GLTFLoader` wrapper call (consumer loads the file); registry has no primitives/lights factories; studio does not use the registry at all. Remaining files: `AssetRegistry.ts`, `GLTFCharacterLoader.ts`, `DynamicSplineStitcher.ts`, `BoneSocketManager.ts`. |
| FR-02 | Scrub-safe skeletal blender (0/1 eval, smoothstep crossfades) | ✅ | `evaluateSkeletalClipWeights` (engine-core) computes smoothstep crossfade weights as a pure function of `t`; `App.tsx` applies them via `mixer.update(0)` + manual `setEffectiveWeight`. Covered by `spline.test.ts`. |
| FR-03 | Arc-length CatmullRom locomotion, stride phase, turn banking | ✅ | `SplineAndStrideSolver.ts`: arc-length table (`arcLengthDivisions = 250`; PRD says 300), smoothstep normalization, tangent-derived heading, `stridePhase = distance / L_stride`, and centripetal banking roll (curvature × speed² / g, clamped ±12°, composed via `composeBankedHeading`). Covered by `spline.test.ts`. |
| FR-04 | Gaze IK — spine/head/eyes 3-tier, ±35° convergence, blinking | ✅ | `applyCharacterLookAtIK` now distributes Spine 20% (±22° yaw) / Head 75% (±62° yaw, ±32° pitch) / binocular `EyeL`+`EyeR` (per-eye yaw/pitch, ±35° convergence) with deterministic periodic blinks (`evaluateBlinkAmount`). Rig gained eye bones; `evaluateAutoGazeTarget` implements conversational "auto" gaze. Covered by `ik.test.ts`. |
| FR-05 | 2-bone arm IK — Law of Cosines, pole vector, spine reach lean | ✅ | `solveAnalyticalTwoBoneArmIK` recomputed: exact Law-of-Cosines with Gram-Schmidt pole-plane construction (uses compiled `poleOffset`), quaternion-based aim, and automatic upper-spine reach lean past 90% of max reach (≤9°). `solveDualHandArmIK` solves both hands simultaneously. Covered by `ik.test.ts`. |
| FR-06 | Viseme coarticulation + 6-preset emotion mixer | 🟡 | `schema` defines 15 visemes incl. `sil`; mouth morph mesh now includes a `smile` target driven by `EMOTION_PRESETS`; viseme falloff upgraded to parabolic corner weighting in `App.tsx`. Remaining: eyelid/cheek deformation channels (blink is eye-scale based; emotion presets drive brows + smile only). |
| FR-07 | 4-pass symbolic compiler + time DSL | ✅ | `compiler/compile-symbolic-manifest.ts` + `expression-parser.ts` support `@id.start/end/duration`, `word("x")`, `word(N)`, `progress(p)`, ± offsets. Passes are consolidated into a single module (noted as acceptable in PRD §7). Unit-tested. SLA boundary is asserted at `< 5 ms` (comment says 1.5 ms). |
| FR-08 | Constrained LLM JSON schema, Ollama/local generation | 🟡 | `schema/llm-json-schema.ts` exists but is shallow: no regex/format constraint on time-expression strings, track keyframes/segments largely unconstrained. No runtime validator (ajv), and no Ollama/vLLM connector anywhere in the studio. |
| FR-09 | Sanitizer — 4 rules (stem, chain, 180°, obstacle) | ✅ | `compiler/llm-sanitizer.ts` implements all four; `sanitizer.test.ts` green. |
| FR-10 | Camera director — splineDolly/twoShot/OTS/closeUp/establishingOrbit, cranes, PiP | ✅ | All five shot types implemented: twoShot (adaptive distance), OTS (side-aware), splineDolly with `lead`/`follow`/`parallel`, `closeUp` (85mm-style fov 28), `establishingOrbit` (scene-center orbit). `transitionDuration` performs scrub-safe smoothstep blends between shots; every pose carries an `overhead` crane monitor pose rendered as a studio PiP inset. Covered by `camera.test.ts`. |
| FR-11 | Branching DAG + inventory/flags + spline stitching + decision cards | 🟡 | Library-complete: `useWorldStateDAG.ts` (inventory, flags, checkpoints, `applyChoiceAndBranch`), `DecisionCardModal.tsx`, `BoneSocketManager.ts`, `DynamicSplineStitcher.ts` (with `> 0.15 m` pinch guard at line 21). **Wired (v1):** the studio **Play Mode** overlay (`PlayModeOverlay.tsx`) renders the compiled manifest in a dedicated viewport (shared `stageEngine` evaluator), seeds `PersistentWorldState`, pauses at a resolved `decision.triggerTime` (`@line_X.end/start/word("…")` resolved against the compiled dialogue), opens `DecisionCardModal` with a real countdown (timeout auto-applies `defaultChoiceId`), applies choices via `applyChoiceAndBranch` (grant item / set flag / socket attach) and tracks checkpoint count + world-state chips live. Still missing: branch-graph node editor UI, checkpoint restore UI, spline stitching integration, numeric chapter-plan playback differences. |
| FR-12 | Pause inspector — free-roam/orbit, Bezier snapback, 0.06× ramp | ✅ | Engine: `PauseInspectorCam.ts` (FREE_ROAM WASD/QE + ORBIT_ASSET), `CameraDirectorAndPauseCam.ts:74` quadratic Bezier snapback, `usePauseInspector.ts` state machine (DIRECTOR_PLAYING → PAUSED_INSPECTING → SNAPBACK_SWERVE) with the PRD's **0.06×** slow-mo constant (`0.06 + 0.94u` over 1.45 s). UI wired (v1, `pauseInspectorRuntime.ts` consumed by `ViewportStage` in both the workspace and Play Mode): `P` enters/exits (button when paused), WASD/QE free-roam + drag-look, click-to-orbit raycast over actors/holo-core (ancestor `stageActorId` walk), **Ghost Director Frustum** gizmo (`CameraHelper` on the frozen director pose, HUD-labelled), diamond-free quadratic snapback with dolly roll, and a snapback HUD (progress bar, 0.06×→1× ramp note). Pending: dedicated `PauseInspectHUD` component (HUD is inline), pause-path engine unit tests. |
| FR-13 | Studio NLE feature set | 🟡 | Present: **generalized waypoint drag** (`ViewportStage.tsx`: every `splinePath` track/actor, per-track colored handles + tubes, clamps ±4.5/±3.5 m; **obstacle-aware push-out** — amber tint + white preview sphere inside `STAGE_OBSTACLES` keep-out zones, commit snaps outside on release; sample ships Aria *and* Zephyr splines), sanitizer repair cards, resolution log table (click-to-seek), WPM sliders (90–220), inter-turn pause delta, scrubber/transport, Web Speech preview, symbolic JSON copy + download + upload (validated), camera-mode toggle, tab shell, **NLE** (`MultiTrackTimeline.tsx`: dialogue/gait/arm-IK/gaze/camera lanes, drag-trim, keyframe time-drag, word/line-anchor chips with 1-click symbolic re-anchoring, 0.09 s snap threshold, click-to-seek playhead), the **Export & Mastering deck** (realtime compositor + MediaRecorder master with auto-finalize; offline WebCodecs path driving the engine frame-exactly → H.264 elementary stream; fps/res/bitrate presets), **Play Mode** (`PlayModeOverlay.tsx` reusing `ViewportStage`: full-screen dedicated player viewport over the shared stage engine, decision card + world-state DAG wiring per FR-11), the **Pause Inspector** (P/Esc + button, WASD/QE + drag-look free-roam, click-to-orbit, Ghost Director Frustum gizmo, bullet-time snapback HUD — FR-12), and the **Arm IK &amp; Emotion keyframe panel** (`ArmIKEmotionPanel.tsx`: edit symbolic times/targets/weights + emotion presets with resolved-time readouts, add/delete rows, writes recompile live; dedicated `PauseInspectHud.tsx` + `KaraokeSubtitleBar.tsx` components extracted) plus a **sample scene library** (`sampleScenes.ts` `SCENE_LIBRARY` + header picker: reactor 8B demo, "Nebula Standoff" OTS confrontation, "Mars Dispatch" follow-dolly/orbit sci-doc); camera director framing widened (longer dolly stands, higher eye-line, wider default/closeUp fov) after visual review. Missing: waypoint drag scope limited to segment 0 of each spline, export container muxer (MP4/WebM file), audio scratch track. |

### 2.1 Non-Functional Requirements

| NFR | Status | Notes |
|---|---|---|
| 60 FPS during live playback | 🟡 | No instrumentation/benchmark. Per-frame allocations (`new Vector3/Quaternion`) exist in the studio render loop and IK path. |
| Timeline scrub latency < 2 ms | 🟡 | Never benchmarked; keyframe evaluation uses linear scans. |
| Compile SLA < 1.5 ms | 🟡 | Unit test asserts a looser `< 5 ms` bound. |
| VRAM < 350 MB | 🟡 | Unmeasured; procedural rigs are light, but no GLTF/splat stress exists. |
| > 99.5% first-pass LLM validation | 🔴 | `eval_sanitizer_pass_rate.py` audits a single hand-written clean sample; no 8B-model integration, no dataset benchmark, no pass-rate number. |

---

## 3. Blog-Series Target Coverage (Blogs 1–21)

| Blog(s) | Theme | Target status |
|---|---|---|
| 1–4 | Symbolic scene graphs, elastic compiler, viseme coarticulation, causal schemas/sanitizer | ✅ Core implemented (minor gaps: FR-02, FR-06). |
| 5–8 | Zero-drift locomotion, arm IK + gaze, affective face, mathematical camera director | 🟡 Implemented with the gaps listed in FR-03…FR-10. |
| 9–10 | Branching DAG + spline stitching, bullet-time pause inspector | 🟡 Pause inspector fully wired (FR-12 ✅); branching DAG wired in Play Mode (FR-11 still missing the graph editor + checkpoint restore UI). |
| 11–12 | Dual-canvas WebGL→MP4 export, human-AI authoring loop | 🟡 `video-exporter` package complete at library level (Canvas2D compositor 2.35:1 + karaoke + telemetry, MediaRecorder probe/start, WebCodecs offline encode, formant synth). No export UI; offline path emits chunks without a container muxer; no authoring loop in the studio. |
| 13 | Spring-bone physics + dual-hand prop handover | 🔴 `ScrubSafeSpringBoneSolver.ts`, `CollaborativePropHandover.ts` absent. |
| 14 | Raise-hand live interruption + Gaussian splat stages | 🔴 `LiveInterruptionEngine.ts`, `GaussianSplatStageLoader.ts` absent. |
| 15 | Cross-lingual time-warping & localisation | 🔴 `CrossLingualRetargeter.ts`, `OfflineAudioVideoMaster.ts`, gait-clamped spline window absent. |
| 16 | Multi-actor turn-taking, gaze topology, occlusion-safe framing | 🔴 `MultiPartyGazeTopology.ts`, `OcclusionSafeCameraSolver.ts`, `SkeletalCapsuleBVH.ts` absent. |
| 17 | Quaternion bit-packing + zero-alloc LUTs + hash saccades | 🔴 No `.splat` quaternion unpack; no typed-array LUT binary search (uses three's `getPointAt`); no stateless hash micro-saccades. |
| 18 | Pinch-knot guard, stem matching, obstacle push-out, formant synth, mime probing | 🟡 Partly shipped early: pinch guard (`DynamicSplineStitcher.ts:21`), `WORD_STEM_FUZZY_MATCH`, `OBSTACLE_PUSH_OUT`, formant triangle synth (`WebAudioSceneSynth.ts`), mime probing (`probeSupportedVideoMimeType`). Parabolic emotion/viseme corner weighting absent. |
| 19 | Orchestrator self-reflection (logit guard, chord-cylinder rule, DPO loop) | 🔴 `generateSceneWith8B.ts`, vLLM logit processor, DPO loop absent. |
| 20 | Orchestrator evolution audit (zero-alloc IK, SoA timeline worker, in-place morphs) | 🔴 Absent. |
| 21 | Multi-agent research simulation + kinematic verifier | 🔴 `self_evolving_grpo_loop.py`, `spatiotemporal-verifier.ts` absent. |

### 3.1 PRD §7 module names vs. actual code

PRD §7 lists per-purpose files that were consolidated during generation. This was acknowledged in the PRD itself (§7 note). For the record:

| PRD/label name | Reality |
|---|---|
| `HierarchicalLookAtIK.ts`, `TwoBoneArmIKSolver.ts` | Consolidated into `IKSolvers.ts`. |
| `FacialEmotionMixer.ts` | Emotion presets live in `ProceduralRigBuilder.ts` (+ app-side blending). |
| `BezierSnapbackSwerve.ts` | `evaluateQuadraticBezierSnapback` in `CameraDirectorAndPauseCam.ts`. |
| `OverheadCranePiP.ts` | Absent. |
| `gizmos/*` (waypoint, IK triangle, ghost frustum) | Absent as modules; waypoint dragging is inline in `App.tsx`; no ghost frustum / IK triangle gizmo. |
| `MimeProber.ts` | Folded into `MediaRecorderExporter.probeSupportedVideoMimeType`. |
| `KaraokeSubtitleBar.tsx`, `PauseInspectHUD.tsx` | Not in `react-player`; karaoke exists in studio (`App.tsx`) and `Canvas2DCompositor.ts`. |
| Studio pages/components (`StudioWorkspace`, `BranchGraphEditor`, `ExportMasteringDeck`, `AIPromptGeneratorBar`, `SanitizerDiffPanel`, `MultiTrackTimeline`, `ArmIKEmotionPanel`, `SymbolicJsonDrawer`) | Only `App.tsx` exists; it covers a subset (sanitizer cards, resolution table, WPM sliders, viewport, copy JSON). |

---

## 4. What Is Left (Implementation Backlog)

### P0 — Finish what the PRD already promises (Phase 1–3 closure)

1. **Studio integration of existing libraries** — wire `video-exporter` (compositor + recorder) and `react-player` (3D scene + DAG) into the studio; add the export deck, branch graph editor, JSON drawer, word-anchor snapping UI, Arm-IK/emotion panel, 5-lane NLE.
2. **Pause-inspector UI** — Ghost Director Frustum gizmo, raycast click-to-orbit selection, PRD's 0.06× slow-mo constant, HUD overlays.
3. ✅ **Camera director completion** — `closeUp`, `establishingOrbit`, `dollyMode` follow/parallel, blended transitions, overhead-crane PiP (done in Phase 2; `camera.test.ts`).
4. ✅ **Gaze & arm fidelity** — spine/head/eye tiering, blinking, arm pole vector + spine lean, dual-hand support (done in Phase 2; rig now 15 bones incl. `EyeL`/`EyeR`; `ik.test.ts`).
5. **Neural TTS + alignment** — the service endpoint computes prosody inline; the provider modules (`kokoro_whisperx`, `elevenlabs_align`, `azure_viseme`) are pure-Python fallbacks with no real model/SDK calls. Real Kokoro/WhisperX inference (or hosted ElevenLabs/Azure), plus a studio→service client, are outstanding.
6. **LLM loop** — Ollama/vLLM connector, real JSON-schema runtime validation (deep constraints + ajv or equivalent), prompt bar.

### P1 — Complete the "v1 product" story

7. **Offline 4K mastery** — realtime deck path live; `renderOfflineWithWebCodecs` runs end-to-end in the deck and produces H.264- element chunks; remaining: container muxing (`mp4-muxer`), `OfflineAudioContext` audio render + mux, guaranteed faster-than-real-time loop (currently paced per browser rAF).
8. **Training pipeline run** — `generate_synthetic_scenes.py`/`train_lora_unsloth.py` exist as scripts but have never produced a dataset/model; no LoRA weights; `requirements.txt` lacks `unsloth` despite the filename; eval harness targets one sample, not ~10k scenes.
9. **Packaging** — `@chronos3d/*` packages export TS source (`main: src/index.ts`) and cannot be published/consumed as built artifacts; "published independently" (PRD) requires a build step (e.g., tsup) + `exports` maps.
10. **Test depth** — 22 unit tests exist (compiler 4; engine-core 18 covering camera, gaze/arm IK, spline banking, crossfade weights — added in Phase 2); still no DAG tests, no component tests, no NFR benchmarks.

### P2 — The blog target (PRD Phase 4–5 vision)

11. **Blogs 13–14:** scrub-safe spring-bone solver, collaborative prop handover, live-interruption ephemeral overlay engine, Gaussian-splat stage loading.
12. **Blog 15:** cross-lingual retargeting (time-warping, gait-clamped windows, audio/video mastering).
13. **Blog 16:** N-actor gaze topology, multi-party turn-taking, occlusion-aware camera deflection, bone-capsule BVH picking.
14. **Blogs 17, 20:** quaternion bit-packing, typed-array LUT binary search, stateless hash saccades, zero-alloc IK, SoA timeline worker (SharedArrayBuffer/OffscreenCanvas), in-place morph updates.
15. **Blogs 19, 21:** vLLM logit-processor guard, chord-vs-cylinder sanitizer upgrade, DPO loop, multi-agent self-evolution research loop with kinematic verifier and counterfactual repair.

---

## 5. What Is Missing *From the PRD*

These are target capabilities visible in the blogs/code but **never specified** in `PRD.md`. Recommended amendments:

| # | Missing from PRD | Why it matters | Suggested PRD change |
|---|---|---|---|
| 1 | Cross-lingual localisation & retargeting (Blog 15) | Explicit product target; touches compiler, audio, and lip-sync | Add FR: `retargetManifestToLanguage`, gait-clamped windows, mastered audio track export |
| 2 | N-actor / multi-party scenes (Blog 16) | Schema hardcodes two actors (`actor_aria`, `actor_zephyr`); studio assumes two tracks | Add FR: N-actor casting, turn-taking scheduler, per-actor WPM; generalize schema enums |
| 3 | Occlusion-aware camera + bone-capsule BVH picking (Blog 16) | Needed for any scene with props/terrain | Add FR for raycast selection layers and occlusion deflection |
| 4 | Performance engineering constraints (Blogs 17, 20) | "60 FPS" alone doesn't capture zero-alloc / worker offload goals | NFR: no per-frame heap allocs on hot paths; SoA timeline worker; OffscreenCanvas; explicit benchmarks with thresholds |
| 5 | Meta / self-improvement loop (Blogs 19, 21) | The "Coder Flex" and evolution arc define long-term differentiation | New section: logit guard, chord-cylinder sanitizer rule, DPO pipeline, multi-agent simulation with kinematic verifier and reward gates |
| 6 | `.splat` binary format spec (quaternion packing) | Required for splat stages; no data contract exists | Add data-format spec (32-byte layout) to Phase 5 |
| 7 | Studio TTS preview mechanism | Code ships Web Speech preview; PRD never mentions it (and doesn't warn about its quality limits) | Add to FR-13 scope or explicitly classify as preview-only |
| 8 | Packaging / release strategy | Packages are unbuildable/unpublishable as-is (source `main`) | Add §: build outputs, semver, publish flow |
| 9 | Security & privacy | TTS service has open CORS and no auth; manifests may embed text | Add: auth/rate-limit for services, data handling, asset licensing (Mixamo/ReadyPlayerMe, provider ToS) |
| 10 | Deployment & hosting | Not a single word about where studio/service run | Add: static hosting for studio, container story for service, offline/PWA stance |
| 11 | Browser support matrix | WebCodecs / Web Speech / MediaRecorder vary wildly | Add: supported browsers + fallback policy (compositor/MediaRecorder path already implies one) |
| 12 | Accessibility & UI i18n | Ironic gap given cross-lingual target | Add NFR: keyboard paths, captions, UI localisation strategy |
| 13 | Persistence & schema versioning | Manifests/branches only live in memory; no save/load story | Add: manifest versioning, migrations, project files |
| 14 | Observability | Blog 19's telemetry roadmap has no PRD counterpart | Add: structured logs, error budget, metrics for compile/sanitize/export |
| 15 | Acceptance test plan / DoD per FR | 22 unit tests, but no per-FR acceptance criteria and no NFR benchmarks | Add per-FR acceptance criteria and test strategy; NFR measurement method |
| 16 | Formal DSL grammar & stage constants | DSL semantics and stage landmarks exist only in code/blogs | Add grammar table + stage coordinate/landmark spec (move from implicit to explicit) |
| 17 | Glossary | Readers must reverse-engineer terms | Add glossary (symbolic manifest, sanitizer, stride phase, OTS, viseme, snapback…) |
| 18 | Concrete SLA numbers per NFR | "Fast", "fluid" aren't testable | Restate: compile < 1.5 ms (or revise), scrub < 2 ms, export × realtime factor, VRAM budget measurement method |

---

## 6. Verification Evidence (as run)

| Check | Result |
|---|---|
| Verbatim extraction | 67/67 files exact contiguous substrings of `Ideation/Gemini Branch Chronos3D.md` |
| JSON validity | 15/15 parse |
| Python syntax | 9/9 `py_compile` |
| Import graph | All workspace imports resolve |
| Typecheck | `pnpm typecheck` → 6/6 tasks successful |
| Unit tests | `vitest` → 5 files, 22/22 passed (compiler 4, engine-core 18: camera, gaze/arm IK, spline banking, crossfade weights) |
| Production build | `pnpm build` → Vite bundle built (≈714 kB / ≈194 kB gzip, 1578 modules) |
| Build pollution | Fixed via `noEmit` in `apps/studio-web/tsconfig.json`; no emitted files in `src/` |
| Python service e2e | `GET /health` 200; `POST /api/v1/synthesize-aligned` 200 — 4 words, 23 visemes, silence cue, duration ≈ 2.336 s |
| Hygiene | No TODO/FIXME/HACK/debugger/`console.log` |

*Environment: Node v24.14.1, pnpm 8.12.0 (declared 9.7.0), Python 3 with FastAPI 0.115 / Pydantic 2.9.*

---

## 7. Bottom Line

- **Covered:** the entire "compiler + math engine + export math" foundation (Blogs 1–12, PRD Phases 1–3 *library layer*), verified working.
- **Left:** studio/service/product integration of that foundation (P0/P1), then the Phase 4–5 vision.
- **Missing from the PRD:** twelve-plus product-level concerns (N-actor, cross-lingual, occlusion, perf engineering, meta-loop, packaging, security, deployment, testability, glossary…) enumerated in §5.

See `TECH-STACK.md` for the concrete stack inventory, `USER-MANUAL.md` for operating the current build, and `DEVELOPMENT.md` for the codebase guide.
