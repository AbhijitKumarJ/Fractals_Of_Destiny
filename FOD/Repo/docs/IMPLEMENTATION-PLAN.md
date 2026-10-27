# Implementation Plan — Phases 2–8

Plan for everything after the Phase 1 foundation. Traceability: **GA** = `GAP-ANALYSIS.md` sections, **FR-xx/NFR** = `PRD.md` requirements, **B1–B21** = blog numbers. Effort sizes are relative for one full-time engineer: S ≈ 1–2 pw, M ≈ 3–5 pw, L ≈ 6–12 pw (pw = person-weeks).

---

## Phase 1 (Complete) — Foundation

**Shipped:** schema + compiler + sanitizer + viseme pipeline (FR-07/08/09), engine-core math (splines, IK, camera director, pause math, rigs, sockets, stitcher), export library (compositor, recorder, WebCodecs chunks, audio synth), minimal studio, minimal player SDK, service skeletons.

**Verified:** typecheck 6/6, vitest 4/4, production build, FastAPI e2e (4 words / 23 visemes), Python compile, no build pollution.

**Not yet true:** the library layer is mostly **not wired into user surfaces** and the fidelity gaps in FR-03…FR-06/FR-10/FR-12 remain. Everything below closes that distance.

---

## Phase Overview & Sequencing

| Phase | Name | Focus | Depends on | Size |
|---|---|---|---|---|
| 2 | Studio Integration & Engine Fidelity | Wire libraries, close FR gaps (GA §4 P0) | Phase 1 | L (8–12 pw) |
| 3 | Neural Voice & LLM Pipelines | Real TTS/alignment + prompt→scene loop (GA §4 P0) | can start in parallel with 2 | M–L (6–10 pw) |
| 4 | Export, Packaging & Hardening | MP4 mastery, publishable packages, quality gates (GA §4 P1) | 2, 3 | M (4–6 pw) |
| 5 | Advanced Animation & Interactive Stage | B13–B14: spring bones, handover, interruption, splats | 2 (rig), 3 (voice) | L (8–12 pw) |
| 6 | Multi-Actor, Localization & Occlusion | B15–B16: cross-lingual, N-actor, occlusion, BVH | 2, 5 | L (6–10 pw) |
| 7 | Performance Engineering | B17, B20: zero-alloc, LUTs, workers, NFR closure | 5, 6 | M–L (5–8 pw) |
| 8 | Self-Evolving Director | B19, B21: logit guard, DPO, multi-agent research loop | 3, 7 | L (8–12 pw) |

```text
Phase 1 ──► Phase 2 ──► Phase 4 ──► ship v1.0
       └──► Phase 3 ──────┘   │
                              ▼
                    Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8
```

**Milestones:** M1 Studio Parity (end P2) · M2 Prompt-to-Scene (end P3) · M3 Shippable v1.0 (end P4) · M4 Cinematic v2.0 (P5+P6) · M5 Performance Release (P7) · M6 Research Preview (P8).

**Cross-cutting (every phase):** PRD amendments per GA §5 (assign owners; do amendments for a feature **in the same phase it is built**), docs upkeep (`USER-MANUAL.md`/`DEVELOPMENT.md`/`GAP-ANALYSIS.md` updated with each merge), keep `pnpm typecheck` + tests + build green as the merge gate.

---

## Phase 2 — Studio Integration & Engine Fidelity

**Goal:** the PRD §7 studio exists, and FR-03…FR-13 are honestly ✅.

**Progress (Oct 2026):** P2-T1 **done (mechanical)** — `App.tsx` is a 66-line tab shell (`studio`/`export`/`branch`), pipeline + effects now live in `pages/StudioWorkspace.tsx`, viewport/evaluator in `components/ViewportStage.tsx`, and header/table/sliders/repair-cards are standalone components; JSON drawer gained download + validated upload; placeholder Export Deck and Branch Graph pages exist. P2-T2 **done (v1)** — `components/MultiTrackTimeline.tsx`: 5 lanes (dialogue / gait-spline / arm-IK / gaze / camera) over the compiled manifest, span drag + edge trim, keyframe time-drag, word/line anchor chips with 1-click symbolic re-anchoring (`@line_X.word("…")`), 0.09 s magnetic snap against all track boundaries, click-to-seek playhead; edits write back into the symbolic manifest (dialogue `.start`, spline `.startTime/.endTime`, camera `.startTime/.endTime`, keyframe `.time`). P2-T3 **done (v1)** — deck overlay in the workspace; ViewportStage exposes `evaluateFrame(t, manifest, frameCount)` + canvas; realtime MediaRecorder master (compositor letterbox + HUD + karaoke, auto-finalize at timeline end) and offline `renderOfflineWithWebCodecs` path driving the engine frame-exactly → H.264 elementary stream download (container muxer still open, GA §4 P0-7). P2-T6/T7/T8/T9/T10 engine work **done** — camera shot math, rig eyes + 3-tier gaze + blink, Gram-Schmidt arm IK + spine lean + dual-hand, smoothstep crossfades + banking, smile morph + parabolic weighting; 18 new engine-core tests; typecheck/tests/build green. P2-T4 **done (v1)** — shared `stageEngine.ts` (scene factory + `evaluateStageAtTime`) consumed by both `ViewportStage` and the new full-screen **Play Mode** overlay (`PlayModeOverlay.tsx` now reusing `ViewportStage`): dedicated player viewport, own rAF clock, director-only camera + overhead PiP, karaoke captions, `useWorldStateDAG`/`DecisionCardModal` wiring with trigger resolution (`@line_X.end/start/word("…")` vs compiled dialogue, timeout auto-applies `defaultChoiceId`), checkpoint + inventory/flag chips; sample manifest now carries `decision_reactor_override`; Branch Graph page upgraded to a decision-runtime briefing. P2-T5 **done (v1)** — `pauseInspectorRuntime.ts` + `usePauseInspector` (0.06× PRD constant) drive the inspector in both the workspace and Play Mode: `P`/Esc enter/exit, WASD/QE free-roam + drag-look, click-to-orbit (raycast over actors/holo-core), `CameraHelper` Ghost Director Frustum gizmo, Bezier snapback with dolly roll + bullet-time ramp HUD; `PlayModeOverlay` was refactored to reuse `ViewportStage` (no duplicated renderer). P2-T11 **done (v1)** — waypoint editing generalized to every `splinePath` track (per-track palette colors, generic locomotion/tangents) with `STAGE_OBSTACLES` keep-out push-out preview + commit snap; Zephyr's spline is now draggable in the sample. Phase 2 tasks T1–T11 are all shipped in v1; deferred extras also shipped: **`ArmIKEmotionPanel.tsx`** (live arm-IK target/weight + emotion preset keyframe authoring with resolved-time readouts) and `PauseInspectHud`/`KaraokeSubtitleBar` component extractions (HUD JSX no longer inline in `ViewportStage`). P2-X1 **done (v1)** — a `SCENE_LIBRARY` picker in `StudioHeader` ships three elaborate scenes (reactor 8B demo, "Nebula Standoff" OTS action grammar, "Mars Dispatch" sci-doc with orbit finale), and the camera director was widened across all shot families (longer dolly distances, higher eye-line, tighter lookAt, wider default/closeUp fov) to fix the face-crop framing of narrow shots.

### Workstreams & tasks

| ID | Task | References | Size |
|---|---|---|---|
| P2-T1 | Split `App.tsx` into `pages/` (StudioWorkspace, ExportMasteringDeck, BranchGraphEditor) and `components/` (MultiTrackTimeline ×5 lanes, SymbolicJsonDrawer w/ upload+download, SanitizerDiffPanel, ArmIKEmotionPanel, AIPromptGeneratorBar, KaraokeSubtitleBar, PauseInspectHUD) | FR-13, GA §4 P0-1 | L |
| P2-T2 | 5-lane NLE: dialogue / gait / arm-IK / gaze / camera lanes with 1-click word-anchor snapping and drag-trim | FR-13, B12 | M |
| P2-T3 | Export deck: wire `compositeWebGLAndSubtitlesTo2DCanvas` → `startCanvasMediaRecorder` (realtime) and progress UI; offline path behind feature detection | FR-13, B11, GA §4 P0-1 | M |
| P2-T4 | Embed player: make `ChronosPlayer` render the 3D scene from a compiled manifest; add a "Play Mode" toggle in studio — **done (v1)**: scene+evaluator extracted to shared `stageEngine.ts` (viewport + player both consume it); `PlayModeOverlay.tsx` full-screen player (own clock, director-only camera, overhead PiP, karaoke captions) with `useWorldStateDAG` + `DecisionCardModal` wiring; trigger resolver for `@line_X…` + numeric decisions; sample manifest gained `decision_reactor_override`. Caveat: `react-player`'s `ChronosPlayer` component itself keeps its headless API (clock/scrub) — the *visual* realization lives in studio-web (documented). | FR-11, B9 | M |
| P2-T5 | Pause inspector UI: enter/exit controls, free-roam (WASD/QE) + click-to-orbit raycast selection, **Ghost Director Frustum gizmo**, `0.06×` constant, snapback HUD — **done (v1)**: `usePauseInspector` now uses the PRD `0.06×` constant (`0.06 + 0.94u`); new `pauseInspectorRuntime.ts` (keyboard/pointer/raycast/pick + snapback capture) consumed by `ViewportStage`, which is reused inside Play Mode; `P`/Esc enter/exit, drag-look, click-to-orbit actors/holo-core, `CameraHelper` Ghost Frustum, snapback HUD with progress; studio clock + player clock both ramp via the hook's time-scale callbacks. Remaining: dedicated `PauseInspectHUD` component, pause-path tests. | FR-12, B10, GA §4 P0-2 | M |
| P2-T6 | Camera director completion: distinct `closeUp` (85 mm framing) and `establishingOrbit`, `dollyMode` `follow`/`parallel`, `transitionDuration` crane blends, overhead-crane PiP (second pass + CameraHelper) | FR-10, B8, B18, GA §4 P0-3 | M |
| P2-T7 | Rig & gaze fidelity: add `EyeL`/`EyeR` bones to the procedural rig, periodic blink, 3-tier spine(±22°)/head(±62°/±32°)/eyes(±35° convergence) look-at | FR-04, GA §4 P0-4 | M |
| P2-T8 | Arm IK fidelity: Gram-Schmidt pole vectors, upper-spine reach lean, dual-hand simultaneous targets | FR-05, B6 | M |
| P2-T9 | Motion polish: smoothstep crossfade weights between skeletal keyframes; centripetal turn banking roll on locomotion | FR-02/03, GA §2 | S |
| P2-T10 | Emotion completion: apply `smileMorph` (add smile morph target), parabolic emotion×viseme corner weighting | FR-06, B7, B18 | S |
| P2-T11 | Waypoint editing generalization: every actor/track, obstacle-aware snapping (preview push-out before commit) — **done (v1)**: `stageEngine` builds per-`splinePath`-track tubes/handles (palette-colored, generic locomotion + camera tangent contexts); drag reads `{trackId, waypointIndex}` from handle userData and writes back into the matching symbolic track; `STAGE_OBSTACLES`-driven keep-out rings; inside a zone the handle tints amber + a white sphere previews the push-out target, commit snaps outside on release; sample manifest gained `track_zephyr_spline` (second editable path). Drag scope remains segment 0. | FR-13, B5 | S |
| P2-X1 | **Sample scene library + camera framing pass** — **done (v1)**: `sampleScenes.ts` exports `SCENE_LIBRARY` (3 entries: the classic reactor 8B demo, new **"Nebula Standoff"** OTS-action scene — lead dolly → OTS pair → closeUp bluff → two-shot decision with dual splines/arm-IK/emotion arcs — and new **"Mars Dispatch"** sci-doc scene — follow-dolly walkout → squall warning OTS → parallel ride → deploy closeUp → establishing-orbit send-off, with core scale/color deploy flare and launch/wait decision); picker `<select>` in `StudioHeader` (sceneLibrary/activeSceneId/onSelectScene props threaded App → workspace → header) swaps the symbolic scene live. Camera director widened: lead dolly 2.2→3.2 m (right 0.5, y 1.76, lookAt −0.04), follow −2.6→−3.4 m (y 1.72), parallel 2.4→3.0 m, twoShot `max(3.2, sep·1.15)` y 1.66, closeUp 1.15→1.55 m + fov 28→34, OTS −1.15→−1.5 m (side 0.62), default shot fov 40→46; `camera.test.ts` closeUp assertions updated (18/18 green). | FR-13, B9 | S |

### Exit criteria
- Studio feature checklist in PRD §7 satisfied (each missing module above has a corresponding UI surface).
- Every FR-01…FR-13 in `GAP-ANALYSIS.md` updated to ✅ or explicitly re-scoped (e.g., dual-hand deferred to Phase 5 if P2-T8 splits).
- New unit tests: camera shot math, IK clamps, blend weights. `pnpm typecheck`/tests/build green.

**Risks:** scope creep in P2-T1 (mitigate: keep first split mechanical, no redesign); PiP requires a second render pass — profile early.

---

## Phase 3 — Neural Voice & LLM Pipelines

**Goal:** replace deterministic estimators with real models and close the prompt→scene→repair loop.

| ID | Task | References | Size |
|---|---|---|---|
| P3-T1 | Wire providers into `app/main.py` behind a provider switch: real Kokoro TTS + WhisperX forced alignment (local), ElevenLabs alignment adapter, Azure viseme adapter; update `requirements.txt` | FR-08 service, GA §4 P0-5 | M |
| P3-T2 | Alignment quality bar: word boundaries within tolerance of ground truth; latency budget for a 15-word line; graceful fallback to the WPM estimator when models unavailable | NFR, GA §4 P0-5 | M |
| P3-T3 | Studio → service client: fetch word boundaries on demand, cache, and feed the compiler (replace WPM-only timing when available) | FR-08, B2 | S |
| P3-T4 | LLM connector: Ollama/vLLM HTTP client for the prompt bar; structured generation using `LLM_SCENE_JSON_SCHEMA` | FR-08, B12 | M |
| P3-T5 | Deep schema validation: constrain `TimeExpression` strings (regex in schema), tracks/keyframes required fields; add runtime validator (ajv-class or hand-rolled, zero-dep style) | FR-08, GA §2 | S |
| P3-T6 | Training run: execute dataset generation (~10k scenes) + LoRA fine-tune | PRD Phase 5, GA §4 P1-8 | M |
| P3-T7 | Evaluation harness: run `eval_sanitizer_pass_rate.py` against the full model output set; publish first-pass validity number vs the 99.5% NFR | NFR, GA §2.1 | S |
| P3-T8 | PRD amendment: document real-service contracts, API keys handling, fallback policy (GA §5 items 7, 9) | GA §5 | S |

### Exit criteria
- `/api/v1/synthesize-aligned` runs a neural path with documented latency; `GET /health` reports active provider.
- A prompt typed in the studio produces a sanitized, compiled, playing scene end-to-end.
- Pass-rate report committed; `unsloth`/`bitsandbytes` inconsistencies in training requirements resolved.

**Risks:** GPU availability for training; model download size; browser→localhost service CORS/a11y (fix security in Phase 4, but keep dev-mode only until then).

---

## Phase 4 — Export, Packaging & Hardening

**Goal:** a shippable v1.0: real MP4 files, publishable packages, guarded quality.

| ID | Task | References | Size |
|---|---|---|---|
| P4-T1 | Container muxing: integrate `mp4-muxer` for `renderOfflineWithWebCodecs` chunks; `OfflineAudioContext` audio render/mix + AAC/Opus mux | FR-13, B11, GA §4 P1-7 | M |
| P4-T2 | 4K export benchmark: verify faster-than-realtime factor; document hardware floor | NFR, GA §2.1 | S |
| P4-T3 | Publishable packages: tsup (or equivalent) build for `@chronos3d/*`, proper `exports` maps, `npm pack` dry runs | GA §4 P1-9, GA §5 item 8 | M |
| P4-T4 | Test depth: engine math (splines/IK/camera), DAG transitions, pause ramps, compositor layout; component smoke tests for studio | GA §4 P1-10 | M |
| P4-T5 | NFR benchmark harness: FPS meter, scrub latency, compile SLA (tighten test to 1.5 ms), VRAM estimate; wire into CI | NFR, GA §5 item 4 | M |
| P4-T6 | Security: TTS service auth/rate-limit, CORS allowlist, API-key handling (env only, never in bundle), dependency audit | GA §5 item 9 | S |
| P4-T7 | Deployment: static hosting config for studio, container image + healthcheck for services; document offline/air-gapped mode | GA §5 item 10 | S |
| P4-T8 | Browser support matrix + fallback policy (MediaRecorder path for WebCodecs-less browsers; TTS preview constraints) | GA §5 item 11 | S |
| P4-T9 | Project persistence: save/load manifests + branches (file + IndexedDB), schema version field and migrations | GA §5 item 13 | M |
| P4-T10 | Observability: structured logs, compile/sanitize/export metrics, error budgets | GA §5 item 14 | S |
| P4-T11 | Accessibility & UI i18n groundwork: keyboard paths, captions toggles, string extraction | GA §5 items 12 | S |
| P4-T12 | PRD v1.1 consolidation: fold GA §5 list (glossary, DSL grammar, stage constants, acceptance criteria per FR) into `PRD.md` | GA §5 items 15–18 | M |

### Exit criteria
- `Export` produces a playable MP4 (video + audio) from the studio; 4K run timed.
- `npm pack` artifacts install and render outside the monorepo.
- CI runs typecheck + tests + benchmarks; security checklist signed off.

---

## Phase 5 — Advanced Animation & Interactive Stage (B13–B14)

**Goal:** the cinematic v2 feature set: physical secondary motion and live viewer agency.

| ID | Task | References | Size |
|---|---|---|---|
| P5-T1 | `ScrubSafeSpringBoneSolver` — closed-form spring integration, authored per-track spring params, deterministic under scrubbing | B13, PRD Phase 4 | M |
| P5-T2 | Collaborative dual-hand prop handover — `CompiledPropHandoverEvent` evaluator, two-attachment blend across handover window | B13, PRD Phase 4, P2-T8 | M |
| P5-T3 | Live interruption engine — `SymbolicInterruptionManifest` ephemeral sub-timeline, raise-hand session state machine, overlay evaluation independent of base timeline | B14, PRD Phase 5 | L |
| P5-T4 | Gaussian splat stages — `.splat` loader, quaternion bit-packing parse, WebGPURenderer backend upgrade with WebGL2 fallback | B14, B17, PRD Phase 5, GA §5 item 6 | L |
| P5-T5 | Studio surface: spring-bone parameter panel, handover authoring, interruption test mode (simulate viewer), splat stage import | FR-13 extension | M |
| P5-T6 | PRD amendments: ephemeral interruption semantics, splat format spec | GA §5 items 5–6 | S |

### Exit criteria
- Spring motion is frame-exact for the same `t` regardless of scrub direction; handover has no pop (velocity continuity test).
- Interruption session survives pause/scrub/export; splat stage loads without WebGL errors on the fallback path.

**Risks:** WebGPU maturity in three 0.167-era versions (may need version bump); splat memory budgets vs NFR.

---

## Phase 6 — Multi-Actor, Localization & Occlusion (B15–B16)

**Goal:** scenes with N speakers, multiple languages, and robust framing.

| ID | Task | References | Size |
|---|---|---|---|
| P6-T1 | Schema generalization: remove two-actor enums, add casting list, per-actor voice/WPM, turn-taking schedule | GA §5 item 2, B16 | M |
| P6-T2 | Cross-lingual retargeting: `retargetManifestToLanguage` against target-language word timings; gait-clamped spline windows; audio/video mastering export | GA §5 item 1, B15 | L |
| P6-T3 | Multi-party gaze topology: N-actor gaze target selection, speaker/listener gaze states, turn-taking look-ats | B16 | M |
| P6-T4 | Occlusion-aware camera: `OcclusionSafeCameraSolver` deflection using `SkeletalCapsuleBVH` raycasts | B16, GA §5 item 3 | L |
| P6-T5 | Selection/picking: bone-capsule BVH replaces point raycasts for viewport picking (props + actors) | B16, P2-T11 | M |
| P6-T6 | Studio: casting manager, language selector with word-timing preview, occlusion debug view | FR-13 extension | M |

### Exit criteria
- A three-actor scene with two languages exports correctly with per-language timing.
- No shot has a bone-capsule occluding the primary subject in the test matrix; picking accuracy test passes.

---

## Phase 7 — Performance Engineering (B17, B20)

**Goal:** hit the NFRs on real hardware and keep them hit.

| ID | Task | References | Size |
|---|---|---|---|
| P7-T1 | Typed-array LUT binary search for spline sampling (zero-alloc), replace three.js `getPointAt` on hot paths | B17, B20, GA §4 P2-14 | M |
| P7-T2 | Zero-alloc IK refactor (scratch vectors/quaternions, no per-frame `new`) | B20, NFR | M |
| P7-T3 | SoA packed timeline + SharedArrayBuffer worker with OffscreenCanvas evaluation | B20, GA §5 item 4 | L |
| P7-T4 | In-place BufferGeometry morph updates (no per-frame re-uploads) | B20 | M |
| P7-T5 | Stateless hash micro-saccades for eyes | B17, P2-T7 | S |
| P7-T6 | Benchmark closure: prove 60 FPS mid-tier, scrub < 2 ms, compile < 1.5 ms, VRAM < 350 MB; publish the report; add regression gates to CI | NFR, P4-T5 | M |

### Exit criteria
- Heap allocation on the render loop ≈ 0 after warm-up (measured).
- All NFR numbers published with hardware spec and enforced in CI thresholds.

---

## Phase 8 — Self-Evolving Director (B19, B21)

**Goal:** the research-preview loop: a director that improves from its own failures.

| ID | Task | References | Size |
|---|---|---|---|
| P8-T1 | vLLM logit-processor scene guard (grammar-constrained generation at decode time) | B19 | M |
| P8-T2 | Chord-vs-cylinder intersection sanitizer rule upgrade | B19, FR-09 | M |
| P8-T3 | DPO loop from sanitizer repair pairs (before = rejected, after = chosen) | B19, P3-T6 | L |
| P8-T4 | Multi-agent research simulation: director variants, kinematic verifier (`spatiotemporal-verifier.ts`), counterfactual repair, reward/choreography gates, self-evolving GRPO loop | B21, GA §5 item 5 | L |
| P8-T5 | Telemetry-in-the-loop: capture viewer interaction traces and feed the evolution loop | B19, P4-T10 | M |
| P8-T6 | PRD amendment: research-preview objectives, evaluation protocol, safety rails | GA §5 item 5 | S |

### Exit criteria
- Verifier catches seeded choreography errors at ≥ target rate; evolution loop shows measurable pass-rate improvement across generations; all runs reproducible from seeds.

---

## Effort Summary

| Phase | Size | Rough pw |
|---|---|---|
| 2 | L | 8–12 |
| 3 | M–L | 6–10 |
| 4 | M | 4–6 |
| 5 | L | 8–12 |
| 6 | L | 6–10 |
| 7 | M–L | 5–8 |
| 8 | L | 8–12 |
| **Total** | | **45–70 pw** |

Parallelization: Phase 3 service work can proceed alongside Phase 2; P2-T6/T7/T8/T9/T10 are independent of the studio split (P2-T1) and can be done by a second engineer; Phase 4 packaging/test/security tracks are independent of each other.

---

## Global Definition of Done

Every merge: `pnpm typecheck` green · tests green (with new coverage for changed behavior) · `pnpm build` green with no emitted artifacts in `src/` · docs updated · PRD amendment for any new capability · `GAP-ANALYSIS.md` status table updated. Phase completion additionally requires its exit-criteria checklist and an end-to-end demo of the new capability.
