# User Manual — Chronos3D

How to install, run, and operate the current build. Written for creators (authors of scenes) and operators (people running the studio/service). Every control and API named here exists in the code today.

---

## 1. What You Are Running

Chronos3D is a declarative 3D video engine. You author (or generate) a **Symbolic Scene Manifest** — a JSON document where timing is expressed symbolically (`@line_1.word("reactor")`) instead of seconds. The engine sanitizes it, compiles it to a resolved IR, and evaluates it deterministically at any time `t` for preview, scrubbing, branching, and export.

The repository contains:

| Piece | What it does | How you touch it |
|---|---|---|
| `apps/studio-web` | Browser studio (preview + editing UI) | `pnpm dev` → http://127.0.0.1:5173 |
| `packages/*` | Engine libraries | Imported by the studio; usable in your own app |
| `services/tts-aligner-service` | Neural TTS/alignment HTTP service (currently a deterministic estimator) | `uvicorn` on port 8000 |
| `services/llm-director-training` | Dataset generation + LoRA fine-tuning scripts | Python CLI scripts |

---

## 2. Requirements & Quick Start

**Requirements:** Node.js ≥ 20, pnpm (9.x declared; 8.x works), a Chromium-based browser for the best export support. Python 3.10+ only for the services.

```bash
pnpm install --ignore-scripts
pnpm dev            # turbo → vite dev server
# open http://127.0.0.1:5173
```

Useful checks:

```bash
pnpm typecheck                                  # all packages
pnpm --filter @chronos3d/compiler test          # compiler unit tests
pnpm --filter @chronos3d/engine-core test       # engine math tests (camera/IK/spline)
pnpm build                                      # production bundle
```

---

## 3. Studio Tour

The studio opens with a preloaded sample scene (`symbolic_reactor_briefing`): Aria walks to a holo-pedestal, speaks with Zephyr, the camera cuts through a spline dolly and two over-the-shoulder shots.

A sticky top bar switches pages: **Studio Workspace** (authoring + playback + timeline), **Export Deck** (a mastering overlay that opens on top of the workspace), and **Branch Graph** (decision-runtime briefing; FR-11).

### 3.9 Play Mode (full-screen player)

Press **Play Mode** in the workspace header (green button). The studio stays mounted underneath; a full-screen dedicated player viewport runs the same compiled manifest through the shared stage engine — director camera, overhead crane PiP, karaoke word highlight, transport bar (play/pause, restart, scrub).

- **Decision moments:** when the clock crosses `decision.triggerTime` (e.g. `@line_2.end + 0.4`), playback pauses and the **Interactive Branch Decision** card opens with a live countdown.
- Choose any unlocked choice (locked ones show *Requires Item:*); selecting it resumes playback, grants items/flags per `useWorldStateDAG`, and pushes a world-state checkpoint (`cp_N`).
- If you let the timer expire, the `defaultChoiceId` choice is applied automatically.
- A top bar reports time, inventory item count, current chapter id, and checkpoint count.
- **Restart** resets the clock and clears the decision latch; **Exit Play Mode** returns to the workspace.
- The sample scene ships with `decision_reactor_override` at `@line_2.end + 0.4` (12 s countdown) so you can try the branch immediately.
- Play Mode supports the full **Pause Inspector** (§3.10) — press `P` anywhere in playback.

### 3.10 Pause Inspector (bullet-time)

Available in the Studio Workspace **and** Play Mode. Enter via the purple **Pause Inspector** button (paused → inspector) or press `P` while playing (pauses straight into the inspector). A purple banner lists live hints; the timeline is frozen (`0×`).

| Control | Behavior |
|---|---|
| WASD / arrows | Move the inspector camera through the frozen stage |
| Q / E | Descend / rise |
| Drag mouse | Look around (yaw + pitch; in orbit mode: azimuth + elevation) |
| Click an actor or the holo core | Switch to **orbit mode** around it (`A`/`D` orbit, `W`/`S` zoom; label shows the orbit target) |
| `P` or Esc | **Bezier Snapback**: quadratic camera swerve back to the director lens while the clock ramps 0.06× → 1× over 1.45 s |

While frozen, the **Ghost Director Frustum** — a camera-style wireframe gizmo (`CameraHelper`) — marks exactly where the parked director lens sits, so you know where the snapback will land. During the snapback a HUD progress bar shows the bullet-time ascent (`0.06× → 1×`); playback resumes automatically when it completes.

### 3.11 Export & Mastering Deck

Open it from the **Export Deck** navbar tab (or keep authoring — the deck overlays the workspace, so the camera keeps rendering). Two paths:

| Path | Behavior |
|---|---|
| **Start Realtime Recording** | seeks to 0, plays the scene, and records the composited output — letterboxed 2.35:1 cinema frame, top telemetry HUD, karaoke word-highlighted subtitle banner — with MediaRecorder in the best supported browser codec (MP4/H.264 fallback WebM/VP9). Auto-finalizes at the end of the timeline; mid-recording you can press **Stop & Finalize** for a partial master. |
| **Render H.264 (Offline WebCodecs)** | Seeks nothing live; instead drives the engine deterministically frame-by-frame through `renderOfflineWithWebCodecs` — the viewport's `evaluateFrame` runs at each exact timestamp, composites it, and VideoEncoder produces an H.264 elementary stream, downloadable as `chronos_master.h264`. Faster/robust when `VideoEncoder` exists (shown in capability row). |

Configuration: fps (24/30/60), resolution (720p/1080p), bitrate (offline only, 4–24 Mbps). Known limits: no audio scratch track yet, and offline output is an elementary stream — container muxing (MP4/WebM file) is still open (GA §4 P0-7).

### 3.1 Header controls

| Control | Label | Behavior |
|---|---|---|
| Scene library | Book icon + `<select>` | Switch between the three sample scenes (**Reactor Briefing** — the classic 8B demo, **Nebula Standoff** — OTS action grammar with a two-shot decision, **Mars Dispatch** — follow dolly + parallel ride + orbit send-off); selecting recompiles the scene live |
| Camera mode | **Camera: Director Lens** / **Camera: 3D Stage Editor** | Toggles between the live directed shot and a free stage-editing view |
| Sanitizer | **Raw 8B (Unfixed)** / **Sanitized (N Fixes)** | Recompiles from raw vs. sanitized manifest; repair cards update |
| Clipboard | **Copy Symbolic JSON** | Copies the active (raw or sanitized) manifest to the clipboard |
| File transfer | **Download** / **Load JSON** | Exports the active manifest as `<id>.json`; loads a manifest file (must contain `dialogue` and `tracks` arrays) and recompiles the scene |
| Play | **Play Mode** | Opens the full-screen player overlay (§3.9): dedicated viewport + decision branching |

### 3.2 Viewport

- Top-left HUD: play indicator, `T+current / total s`, and the active shot label.
- Bottom karaoke caption: current speaker (`name (line_id)`), with the active word highlighted live.
- Bottom-right **overhead crane PiP**: a picture-in-picture monitor showing the director's overhead stage view; it never occludes the cinema framing.
- Click-drag the **track-colored cylinders** on the floor grid to reshape any actor's `splinePath` — the sample ships two: Aria's cyan walk path and Zephyr's emerald side-step.
- **Obstacle-aware push-out:** while a handle is dragged inside a keep-out ring (red, e.g. the reactor pedestal), it tints amber and a translucent white preview sphere shows where it will snap — on release the waypoint is committed *outside* the obstacle instead of inside it.
- The scene is runtime-built from the manifest: two procedural actors, a glowing reactor core, a holo-pedestal obstacle, floor grid, camera rig.

### 3.3 Transport

| Control | Behavior |
|---|---|
| Scrubber | Seek anywhere in the timeline (step 0.02 s) |
| **Play / Pause** | Toggle playback |
| Reset (↺) | Return to `t = 0` |
| **Live TTS On / TTS Muted** | Browser speech preview; speaks each line when its start time is crossed (mute/pause/reset handled) |

### 3.4 5-Lane NLE Timeline

Sits under the viewport. Five lanes mirror the manifest: **Dialogue** (move-only — line length comes from text + WPM), **Gait · Spline**, **Arm IK**, **Gaze** (draggable keyframe dots with faint span bands), and **Camera**. Above the lanes, colored chips mark every **word anchor** and line boundary.

| Interaction | Behavior |
|---|---|
| Drag block body | Moves the whole span (dialogue start, walk window, camera shot) |
| Drag block edges (spline/camera) | Trim start or end with a 0.15 s minimum gap |
| Drag keyframe dot (Arm IK / Gaze) | Retimes the keyframe |
| Click a word/line chip *with a block or dot selected* | Snaps that boundary to the anchor and rewrites the symbolic expression (`@line_X.word("…")`, `@line_X.start`, `@line_X.end`) |
| Click a chip with nothing selected | Seeks to that anchor |
| Click empty timeline | Seek playhead anywhere |

Edits write back into the symbolic manifest and recompiles: the sanitizer may show new repair cards (e.g. camera 180° axis lock after you flip a shot side — numeric times also re-chained). Snap targets include all word starts, line boundaries, span edges, previous keyframes, 0 s and full duration.

### 3.5 Compiled Symbolic Anchor Table

Shows every resolved anchor from all four compiler passes: category, target property, the symbolic expression you wrote, resolved seconds, and binding detail (e.g. matched word token). **Click any row to seek** to that anchor.

### 3.6 Prosody panel (right column)

| Slider | Range | Meaning |
|---|---|---|
| Aria WPM | 90–220 (step 5) | Speaking rate used to time Aria's line; recompiles downstream timings |
| Zephyr WPM | 90–220 (step 5) | Same for Zephyr |
| Inter-Turn Pause Delta | −0.2 … +1.0 s (step 0.05) | Extra silence inserted between dialogue turns (`0` = none) |

Changing any slider re-runs sanitize → compile and the whole timeline (captions, spline, camera, export anchors) updates because everything is symbolically anchored.

### 3.7 Arm IK & Emotion keyframes (Aria)

A second right-column panel for live authoring of Aria's reach and affect tracks:

| Row control | Behavior |
|---|---|
| Symbolic time input (`@line_2.word("surge") - 0.05`) | Retimes the keyframe; the mono label on the right shows the compiler's resolved seconds after recompile |
| Target select (arm IK rows) | `none` releases the hand, `holo core` / `Aria` / `Zephyr` set the IK goal — picking *holo core* auto-fills the default surface offset |
| Weight slider (arm IK rows) | 0–1.00 reach blend |
| Feeling select (emotion rows) | `neutral` / `happy` / `concerned` / `surprised` / `focused` / `determined` |
| **+ Add** / trash | Append a keyframe at `@line_1.start` (edit its expression after) or delete the row |

Every edit lands in the symbolic manifest and recompiles through the sanitizer + 4-pass compiler — the Sanitizer log and the resolution table update immediately (e.g. re-timed anchor chains). Gaze and clip keyframes remain file-authored by design.

### 3.8 Sanitizer log (right column)

Every repair card shows `ruleId`, the JSON path touched, a before → after diff, and a human explanation. When the header switch is on *Raw 8B*, you see the raw compile; toggle to *Sanitized* to see repairs applied.

---

## 4. Authoring Scenes

Edit `apps/studio-web/src/sampleManifest.ts` (or import your own manifest in your app). The manifest shape:

```ts
{
  id: 'my_scene',
  stage: { obstacle?: { id, position: [x, y, z], radius } },
  dialogue: [
    { id: 'line_1', speaker: 'actor_aria', text: 'Hello world.',
      startExpr: '@scene.start', endExpr: '...' }
  ],
  tracks: [
    { id: 'track_aria_spline', actorId: 'actor_aria', type: 'spline',
      segments: [{ waypoints: [[x,y,z], ...], startExpr, endExpr }] },
    { id: 'track_aria_clips', actorId: 'actor_aria', type: 'skeletal',
      keyframes: [{ clip: 'Talk', startExpr, endExpr }] },
    { id: 'track_aria_arm_ik', actorId: 'actor_aria', type: 'arm_ik',
      keyframes: [{ targetPosition, hand: 'right', startExpr, endExpr }] },
    { id: 'track_aria_emotion', actorId: 'actor_aria', type: 'emotion',
      keyframes: [{ preset: 'focused', intensity: 0.8, startExpr, endExpr }] },
    { id: 'track_aria_gaze', actorId: 'actor_aria', type: 'gaze',
      keyframes: [{ targetPosition | targetActorId, startExpr, endExpr }] },
    { id: 'track_core_scale', targetId: 'reactor_core', type: 'property',
      keyframes: [{ property: 'scale', value: 1.2, startExpr, endExpr }] }
  ],
  cameraShots: [
    { id: 'shot_1', shotType: 'splineDolly', dollyMode: 'lead', targetActorId: 'actor_aria',
      startExpr: '@line_1.start', endExpr: '@line_1.end' },
    { id: 'shot_2', shotType: 'overTheShoulder', foregroundActorId: 'actor_aria',
      targetActorId: 'actor_zephyr', startExpr, endExpr, transitionDuration: 1.0 },
    { id: 'shot_3', shotType: 'closeUp', targetActorId: 'actor_aria', startExpr, endExpr },
    { id: 'shot_4', shotType: 'establishingOrbit', startExpr, endExpr, transitionDuration: 1.4 }
  ]
}
```

### 4.1 Symbolic time expressions (the DSL)

| Form | Resolves to |
|---|---|
| `@line_1.start` / `@line_1.end` / `@line_1.duration` | Dialogue line boundaries |
| `@line_1.word("reactor")` | Start time of a word in that line |
| `@line_1.word(3)` | Start time of the 3rd word |
| `@scene.start` | Time 0 |
| `@id.progress(0.5)` | Halfway through anchor `id` |
| `+ 0.4` / `- 0.25` | Offset in seconds, appended to any expression |

Word timings come from WPM-based prosody synthesis (or supplied TTS word boundaries), so changing the WPM sliders moves every dependent anchor — camera cuts included — with zero drift.

### 4.2 Stage constraints

- Ground plane is XZ; the stage is roughly ±4 m deep and ±4.5 m wide for the sample.
- The holo-pedestal is a declared circular obstacle (center `[−0.15, −0.45]`, radius `0.72`); locomotion segments may not pass through it. The sanitizer will push a violating waypoint out to the obstacle boundary and log a repair.
- Camera 180° axis: if you cut to the reverse side without a declared crossing shot, the sanitizer inserts a 180°-axis lock repair.

### 4.3 Minimal workflow

1. Write dialogue lines with IDs.
2. Write tracks referencing those IDs via `@…start/end/word()` expressions.
3. Keep one camera shot live at a time (`startExpr`/`endExpr`).
4. Load it in the studio; fix any sanitizer repairs you disagree with by editing the manifest (or leave them to the sanitizer).
5. Tune WPM/pauses and watch the anchor table — times recompute automatically.

---

## 5. Sanitizer Rules

The sanitizer runs four deterministic rules (all visible as repair cards):

| Rule ID | Trigger | Fix |
|---|---|---|
| `WORD_STEM_FUZZY_MATCH` | `word("elec")` doesn't exactly match a token | Fuzzy-matches the closest dialogue word |
| `DIALOGUE_CHAIN_REPAIR` | Turn `endExpr`s overlap / run out of order | Rewrites the chain with proper gaps |
| `CAMERA_180_AXIS_LOCK` | A cut reverses the camera axis illegally | Inserts/extends a crossing shot |
| `OBSTACLE_PUSH_OUT` | Waypoint lands inside a stage obstacle | Pushes the waypoint to the obstacle surface |

Every repair is logged with a before/after diff and an explanation; repro toggle in the header for comparison.

---

## 6. Working with the TTS Aligner Service

```bash
cd services/tts-aligner-service
python -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check and a synthesis request:

```bash
curl http://127.0.0.1:8000/health

curl -X POST http://127.0.0.1:8000/api/v1/synthesize-aligned \
  -H 'Content-Type: application/json' \
  -d '{"text": "Hello world reactor online", "speaker": "actor_aria", "wpm": 145}'
```

Response (shape): synthesized duration, per-word `{word, startSec, endSec}`, and per-frame viseme track entries (15-viseme Oculus set, `sil` for silence). Feed the word boundaries into the compiler to replace the WPM estimator with exact word anchors.

> Current status: the endpoint computes a deterministic prosody/viseme estimate inline. The provider adapter modules (`kokoro_whisperx`, `elevenlabs_align`, `azure_viseme`) are present but not plugged into the endpoint; no neural model runs yet.

---

## 7. Branching Scenes (player SDK)

Branching is wired into the studio's **Play Mode** (§3.9 — pause at trigger, countdown card, choice effects, checkpoints) and exposed at library level for custom apps:

- `useWorldStateDAG(initialState)` — persistent world state: inventory, flags, visited checkpoints.
- `decision.unlockCondition` — a decision unlocks only when its `requiredItemId` / `requiredFlag` conditions are met.
- `applyChoiceAndBranch(choice)` — applies the choice's effects and jumps the timeline to its branch.
- `DecisionCardModal` — ready-made overlay for presenting choices.
- `BoneSocketManager` — parent props to hand sockets (`ForearmR` / `ForearmL`) and to `Spine`.
- `DynamicSplineStitcher.stitchBranchSplineWaypoints` — splices branch paths into the main spline; refuses knots sharper than 0.15 m (pinch-knot guard).

Sketch:

```tsx
const dag = useWorldStateDAG({ inventory: [], flags: {} });
// dag: { worldState, checkpoints, isChoiceUnlocked, applyChoiceAndBranch, restoreCheckpoint }

<DecisionCardModal
  decision={decision}                    // SymbolicDecisionPrompt from your manifest
  countdownSec={3}
  isChoiceUnlocked={dag.isChoiceUnlocked}
  onSelectChoice={(choice) => dag.applyChoiceAndBranch(choice)}
/>
```

`ChronosPlayer` (props: `manifest`, `autoSanitize?`, `autoPlay?`) is a minimal embeddable player shell today.

---

## 8. Exporting Video (programmatic)

There is no export UI yet. The exporter library supports two paths:

### 8.1 Real-time recording (MediaRecorder)

```ts
import {
  compositeWebGLAndSubtitlesTo2DCanvas,
  probeSupportedVideoMimeType,
  startCanvasMediaRecorder,
} from '@chronos3d/video-exporter';

const { mimeType, extension } = probeSupportedVideoMimeType();
// draw WebGL frame + letterbox bars + karaoke captions + telemetry into a 2D canvas
compositeWebGLAndSubtitlesTo2DCanvas(/* glCanvas, subs, telemetry, t */);
const recorder = startCanvasMediaRecorder(canvas, { fps: 30 });
// ... record while the timeline plays ...
```

### 8.2 Offline encoding (WebCodecs, faster than real time)

```ts
import { renderOfflineWithWebCodecs } from '@chronos3d/video-exporter';

const { encodedChunks, totalFrames, codec, fps } =
  await renderOfflineWithWebCodecs(compositeCanvas, { width: 1920, height: 1080, fps: 30 });
```

> Caveats: WebCodecs path requires Chromium; it emits H.264 (`avc1.42001f`) **EncodedVideoChunk**s but performs no container muxing yet — put them into an MP4 via a muxer (e.g. `mp4-muxer`) before writing a file. Audio synthesis (`createSceneAudioSynth`) provides formant tones; mastering/muxing is future work.

---

## 9. Pause Inspector (engine-level)

Engine + UI are both wired now (studio controls: §3.10). Engine pieces:

- `enterPauseInspect()` — freezes the clock (`timeScale 0`) and switches camera lifecycle to `PAUSED_INSPECTING`.
- Free-roam (`W/A/S/D` move, `Q/E` height, drag-look) and orbit-asset modes while frozen.
- `triggerBezierSnapbackResume()` — quadratic-Bezier camera swerve back to the director lens while the clock ramps `0.06× → 1.0×` over 1.45 s (`SNAPBACK_SWERVE`, PRD slow-mo constant).

---

## 10. Training Scripts (optional)

```bash
cd services/llm-director-training

# 1. Generate a synthetic corpus (LoRA repair records)
python generate_synthetic_scenes.py --count 250 --out dataset/scenes.jsonl

# 2. Audit / pass-rate
python eval_sanitizer_pass_rate.py --input dataset/scenes.jsonl

# 3. Fine-tune (requires GPU + torch ecosystem)
python train_lora_unsloth.py --base-model Qwen/Qwen2.5-7B-Instruct --data dataset/scenes.jsonl
```

Scripts exist but have not been run to produce a dataset or weights; `unsloth` is not installed despite the filename (plain `trl` SFTTrainer is used).

---

## 11. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `pnpm dev` fails on engine version | Use Node ≥ 20; pnpm 8/9 both work |
| Port 5173 busy | Kill the previous vite (`pkill -f "vite"`) or change the port in `apps/studio-web/vite.config.ts` |
| Blank viewport | Check the browser console; the scene requires WebGL2 |
| No TTS audio | Browsers block `speechSynthesis` until user interaction; click Play first; check the voice is enabled |
| Export produces no file | MediaRecorder/WebCodecs path is library-only today; see §8 and wire a muxer for MP4 |
| `VideoEncoder is not supported` | Use Chromium ≥ 94; Firefox/Safari lack WebCodecs today |
| Sanitizer cards empty in *Raw 8B* mode | Correct — raw manifest has (or would have) no repairs applied; switch to *Sanitized* |

---

## 12. Glossary

| Term | Meaning |
|---|---|
| Symbolic manifest | JSON scene definition with named anchors and time expressions |
| Time expression | `@line_1.word("reactor") + 0.4`-style symbolic timestamp |
| Sanitizer | Deterministic 4-rule repair pass over LLM output |
| Compiled IR | Fully resolved timeline (seconds + track segments) the engine evaluates |
| Viseme | Mouth shape for phonemes (15-set incl. `sil`) |
| Stride phase | Distance-based walk cycle position (zero foot-slide) |
| OTS | Over-the-shoulder shot |
| Pinch knot | Self-intersecting spline kink; stitcher rejects sharp knots |
| Snapback swerve | Camera swerve returning from pause inspection at ramped speed |
