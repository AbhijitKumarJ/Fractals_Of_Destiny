# Turn 24 — Blog 18: Coder Flex — Pinch-Knot Guard & Stem Matching

*Source: `Latest From branched onward1.md` — turn 6 of 9*

**User:**

Another "Coder Flex" Blog (Blog 18)

---

**AI:**

### Blog 18 (Coder Flex Edition): The $15\text{cm}$ Catmull-Rom Pinch-Knot Guard, Zero-Dependency Morphological Stem-Matching & Parabolic Vertex Orthogonality

Every 3D engine looks clean on a whiteboard until edge-case geometry and browser API quirks collide at 60 FPS. When you dig beneath the public APIs of `@chronos3d/compiler`, `@chronos3d/engine-core`, and `@chronos3d/video-exporter`, you find a collection of defensive mathematical guards and low-level surgical hacks that separate a fragile tech demo from a deterministic production engine.

In this second **Coder Flex** deep dive, we dissect four non-obvious engineering gems hidden inside the Chronos3D source code:

1. **The $15\text{cm}$ Degenerate Pinch-Knot Guard in `DynamicSplineStitcher.ts`:** Why prepending a character's live `[x, y, z]` position on a chapter branch can trigger a catastrophic $180^\circ$ instant yaw spin if two waypoints land too close together—and the two-line distance check that prevents it.


2. **Sub-Millisecond Prefix-Stemming & Radial Keep-Out Vector Projection in `llm-sanitizer.ts`:** How the 8B Self-Healing Sanitizer repairs morphological inflection hallucinations (`"surge"` $\to$ `"surging"`, `"destabilize"` $\to$ `"destabilizing"`) and cylinder collisions (`[-0.15, 0, -0.45]`, $r = 0.72\text{m}$) without importing heavy NLP or physics libraries that would violate our $< 1.5\text{ms}$ compilation SLA.


3. **Parabolic Vertex Orthogonality ($\Delta y \propto x^2$) & Raised-Cosine Tail Overlap (`halfW = duration * 0.8`):** How `ProceduralRigBuilder.ts` prevents additive morph-target vertex explosions when a character smiles (`emotion_smile`) while pronouncing a bilabial plosive (`viseme_PP`).


4. **Bypassing the Unrecordable `window.speechSynthesis` Trap with Bandpass Formant Synthesis (`WebAudioSceneSynth.ts`):** Why native browser TTS produces silent MP4 exports, and how a scheduled triangle-wave + biquad bandpass filter bank synthesizes sample-locked vocal formants directly into a `MediaStreamAudioDestinationNode`.



---

#### 1. The $15\text{cm}$ Catmull-Rom Pinch-Knot Guard (`DynamicSplineStitcher.ts`)

In `DynamicSplineStitcher.ts`, whenever a branched chapter sets `"inheritStartPose": true`, the engine reads the character's live world coordinate $\vec{P}_{\text{live}} = [p_x, p_y, p_z]$ at the end of the previous chapter and stitches it into the new chapter's Catmull-Rom spline (`rawWaypoints`).

A naive engineer simply writes `waypoints.unshift([px, py, pz])` and moves on. **Here is the obscure bug that awaits them:**
In `SplineAndStrideSolver.ts`, the character's root yaw orientation (`headingYaw`) is computed on every frame from the normalized spline derivative via `Math.atan2(tangent.x, tangent.z)`:

```typescript
const position = curve.getPointAt(u);
const tangent = curve.getTangentAt(u).normalize();
const headingYaw = Math.atan2(tangent.x, tangent.z);

```

What happens if ARIA finishes Chapter 1 standing at `[-0.82, 0, 0.52]` and Chapter 2's authored first waypoint `waypoints[0]` is `[-0.85, 0, 0.55]`—only **$4.2\text{cm}$ away**?
If you `unshift` `[-0.82, 0, 0.52]` ahead of `[-0.85, 0, 0.55]`, while `waypoints[1]` is over at `[1.10, 0, 0.70]`, you create a **microscopic $4.2\text{cm}$ reverse chord** followed immediately by a $1.95\text{m}$ forward chord!

```text
The Degenerate Catmull-Rom Pinch-Knot Bug (Top-Down XZ Plane)
═══════════════════════════════════════════════════════════════════════════
Naive unshift() when ||P_live - W_0|| = 0.042m (< 15cm):
   W_0 [-0.85, 0.55] ● ◄─── ● P_live [-0.82, 0.52] (Tiny 4.2cm backward vector!)
                      ╰──────────────────────────────────► ● W_1 [1.10, 0.70]
   Result: At u ∈ [0, 0.02], getTangentAt(u) points BACKWARD (-X, +Z), causing
   ARIA's entire 3D mesh to snap 180° backward for 3 frames before whipping around!

The 15cm Pinch-Knot Guard in DynamicSplineStitcher.ts:
   • If horizontalDist > 0.15m: waypoints.unshift([px, py, pz]) (True stitch segment)
   • If horizontalDist ≤ 0.15m: waypoints[0] = [px, py, pz]    (In-place knot merge!)

```

Look at how `stitchBranchSplineWaypoints()` in `packages/engine-core/src/DynamicSplineStitcher.ts` neutralizes this spline singularity in four lines of code:

```typescript
if (inheritStartPose && liveOrPersistedPosition && waypoints.length > 0) {
  const [px, py, pz] = liveOrPersistedPosition;
  const [fx, , fz] = waypoints[0];
  const horizontalDist = Math.hypot(px - fx, pz - fz);

  if (horizontalDist > 0.15) {
    waypoints.unshift([px, py, pz]);
  } else {
    waypoints[0] = [px, py, pz];
  }
}

```

**Why this is a Coder Flex:**

* When `horizontalDist <= 0.15` ($15\text{cm}$, roughly half a human foot length), overwriting `waypoints[0] = [px, py, pz]` in place preserves exact $C^0$ positional continuity (`curve.getPointAt(0)` still equals `[px, py, pz]`) while computing the initial spline tangent `curve.getTangentAt(0)` cleanly toward `waypoints[1]`—completely eliminating degenerate knot loops and $180^\circ$ yaw whip.



---

#### 2. Zero-Dependency Prefix-Stemming & Radial Keep-Out Projection (`llm-sanitizer.ts`)

Our compiler SLA requires `sanitizeAndRepairLLMScene()` + `compileSymbolicManifest()` to execute in **under $1.5\text{ms}$** inside the browser's React `useMemo` loop whenever a user drags a waypoint or edits text. That means we cannot import a $2\text{MB}$ Porter/Snowball NLP stemmer or a 3D rigid-body physics engine into `@chronos3d/compiler`.

Instead, `llm-sanitizer.ts` implements two ultra-fast heuristics that repair the two most common 7B–8B LLM failure modes in microseconds:

##### A. Bi-Directional Prefix-Stem Fuzzy Matching (`WORD_STEM_FUZZY_MATCH`)

When a 7B–8B LLM writes `"Watch closely: the exact moment I say surging..."` or `"...the core is destabilizing!"` in `dialogue[1].text`, it frequently writes `@line_2.word("surge")` or `@line_2.word("destabilize")` in the animation track because the root lemma appeared in its `chapterPlan` scratchpad.

Furthermore, English gerunds and participles drop silent trailing `-e` characters (`"surge"` $\to$ `"surging"`, `"stabilize"` $\to$ `"stabilized"`), so a naive `spokenWord.startsWith(targetWord)` check fails (`"surging".startsWith("surge")` is `false`!).

Look at how `WORD_STEM_FUZZY_MATCH` solves silent-`e` elision and inflection matching in $O(W)$ time with zero external dependencies:

```typescript
// Obscure stem normalizer inside packages/compiler/src/llm-sanitizer.ts
function extractMorphologicalStem(rawToken: string): string {
  const clean = rawToken.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length <= 3) return clean;
  // Strip common English verbal/nominal suffixes (-ing, -ed, -es, -s, -ly)
  // and trailing silent 'e' so "surge" -> "surg" and "surging" -> "surg"!
  return clean
    .replace(/(ing|ed|es|ly|s)$/, '')
    .replace(/e$/, '');
}

```

By stripping `(ing|ed|es|ly|s)$` followed by trailing `e$`, both `"surge"` and `"surging"` collapse to the canonical 4-byte stem `"surg"`, and both `"destabilize"` and `"destabilizing"` collapse to `"destabiliz"`. If exact token matching fails in `dialogue[lineIdx].text`, the sanitizer scans the line's tokens for a matching stem (or shared $\ge 4$-character prefix) and rewrites `@line_2.word("surge")` $\to$ `@line_2.word("surging")` before Pass 1 of the compiler ever sees it.

##### B. Analytical 2D Radial Obstacle Push-Out (`OBSTACLE_PUSH_OUT`)

In `RAW_8B_SCENE_MANIFEST`, an uncalibrated 8B model often plots a waypoint like `[-0.25, 0, -0.35]` that lands inside the $0.72\text{m}$ keep-out radius of the **Central Containment Pedestal** centered at $\vec{C}_{\text{ped}} = [-0.15, 0, -0.45]$.

Instead of running iterative collision resolution, Rule 1 (`OBSTACLE_PUSH_OUT`) projects the offending waypoint radially outward onto the obstacle's safety perimeter $R_{\text{safe}} = R_{\text{obs}} + \epsilon_{\text{margin}}$ along the unit vector $\hat{u}_{XZ} = \frac{\vec{W}_{XZ} - \vec{C}_{XZ}}{\Vert{}\vec{W}_{XZ} - \vec{C}_{XZ}\Vert{}}$:

$$\vec{W}_{XZ}^{\text{repaired}} = \vec{C}_{XZ} + R_{\text{safe}} \cdot \frac{\vec{W}_{XZ} - \vec{C}_{XZ}}{\max\left(10^{-4}, \; \Vert{}\vec{W}_{XZ} - \vec{C}_{XZ}\Vert{}\right)}$$

For `[-0.25, 0, -0.35]` against center `[-0.15, 0, -0.45]` ($\Delta x = -0.10, \Delta z = +0.10, d = 0.1414\text{m} < 0.72\text{m}$), the radial projection pushes the waypoint along $(-0.7071, +0.7071)$ directly to `[-0.66, 0, -0.04]`—just outside the red collision ring!

---

#### 3. Parabolic Vertex Orthogonality ($\Delta y \propto x^2$) & Raised-Cosine Tail Overlap

In Blog 7, we noted that blending full-face emotional morph targets (`emotion_smile`, `emotion_frown`) with phonetic speech visemes (`viseme_PP`, `viseme_aa`, `viseme_O`) normally causes additive vertex clipping.

Look at the exact mathematical trick used inside `ProceduralRigBuilder.ts` and `EmotionVisemeMixer.ts` to make those two morph channels **geometrically orthogonal** across the mouth mesh's local vertex coordinates $(x, y, z)$:

```text
Spatial Partitioning of Mouth Mesh Vertices Across Local X-Axis
═══════════════════════════════════════════════════════════════════════════
   Left Corner (-X_max)         Center (x = 0)         Right Corner (+X_max)
          ●───────────────────────────┼───────────────────────────●
          │                           │                           │
   1. PHONETIC VISEME KERNEL (Cosine Aperture Weight W_vis(x)):
      • W_vis(x) = cos((x / X_max) · (π / 2))
      • Peaks at 1.0 at center of lips (x = 0); decays to 0.0 at corners!
      • Controls central vertical jaw/lip separation for viseme_PP / viseme_aa.

   2. AFFECTIVE EMOTION KERNEL (Parabolic Corner Weight W_emo(x)):
      • W_emo(x) = (x / X_max)²
      • Strictly 0.0 at center of lips (x = 0); peaks at 1.0 at outer corners!
      • Lifts/lowers commissures (Δy ∝ x², x → 1.22x) without parting center lips!

```

1. **Zero Central Interference at $x = 0$:**
Because the emotional smile/frown displacement scales parabolically with horizontal distance from the philtrum ($\Delta y_{\text{emo}}(x) = k_{\text{emo}} \cdot x^2$ and $x' = 1.22x$), at the center of the mouth ($x = 0$), $\Delta y_{\text{emo}}(0) = 0$! When ARIA pronounces `'P'`, `'B'`, or `'M'` (`viseme_PP`), the central lips press completely shut even while the outer corners of her mouth (`|x| -> X_max`) are turned upward in a warm Duchenne smile (`happy`).


2. **The $1.6\times$ Span Raised-Cosine Co-Articulation Overlap:**
In the 60 FPS viseme evaluator (`apps/studio-web/src/App.tsx`), look closely at the line that computes `halfW` for each phoneme cue:


```typescript
const center = cue.time + cue.duration * 0.5;
const halfW = Math.max(0.035, cue.duration * 0.8);
const dist = Math.abs(t - center);
if (dist < halfW) {
  const inf = Math.cos((dist / halfW) * (Math.PI / 2)) * cue.weight;
  weights[cue.viseme] = Math.max(weights[cue.viseme] || 0, inf);
}

```


A standard non-overlapping window around `center` would have half-width `0.5 * cue.duration` (spanning `[cue.time, cue.time + cue.duration]`). By deliberately inflating `halfW` to **`0.8 * cue.duration`** (a total window width of $1.6\times$ the phoneme duration) and aggregating identical visemes via `Math.max(...)` rather than `+=`, each phoneme's raised-cosine bell curve extends $30\%$ into its predecessor and $30\%$ into its successor—synthesizing smooth biomechanical co-articulation in $O(1)$ closed form without any frame-to-frame state!



---

#### 4. Why `window.speechSynthesis` Breaks Video Exports & The Formant Synth Workaround (`WebAudioSceneSynth.ts`)

Here is a browser media engineering gotcha that trips up almost every WebGL developer who tries to build a client-side MP4/WebM exporter:

* If you use the browser's built-in `window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))` for zero-latency voice previews, the OS speech synthesizer routes its PCM audio **directly to the operating system's hardware audio output**, bypassing the browser's `AudioContext` graph completely.


* There is **no W3C API** to connect `window.speechSynthesis` into a `MediaStreamAudioDestinationNode`. Consequently, if a user clicks **Export MP4/WebM** while using browser fallback speech, `MediaRecorder` records a completely silent audio track!



To guarantee that exported `.mp4` and `.webm` files always contain synchronized, speaker-differentiated vocal audio even when running 100% offline without external neural TTS buffers, `WebAudioSceneSynth.ts` (`@chronos3d/video-exporter`) constructs a **real-time WebAudio Formant Synthesizer** routed directly into `MediaStreamAudioDestinationNode`:

```text
WebAudioSceneSynth.ts — Offline Vocal Formant & Sub-Bass SFX Graph
═══════════════════════════════════════════════════════════════════════════
[Triangle Oscillator] ──► [Biquad Bandpass Filter (Q = 4.5)] ──► [ADSR GainNode]
 • ARIA:   f₀ = 215 Hz     • viseme_aa ('ah'): f_F1 = 1100 Hz     • Attack:  15ms
 • ZEPHYR: f₀ = 130 Hz     • viseme_O  ('oh'): f_F1 =  650 Hz     • Release: cue.dur
                           • viseme_E  ('ee'): f_F1 = 1650 Hz
                                                                        │
                                                                        ▼
                                                     [MediaStreamAudioDestinationNode]
                                                                        │
                                                                        ▼
                                                     Multiplexed into MediaRecorder!

```

* **Harmonic-Rich Glottal Source:** Unlike a pure sine wave (which has no overtones to filter) or a harsh sawtooth wave, a `triangle` oscillator at fundamental pitch $f_0 = 215\text{ Hz}$ (ARIA's soprano/alto register) or $f_0 = 130\text{ Hz}$ (ZEPHYR's baritone register) provides odd harmonics that decay at $1/n^2$.
* **Viseme-Driven First/Second Formant Resonance:** By sweeping a resonant `bandpass` `BiquadFilterNode` ($Q = 4.5$) across the compiled `VisemeCue[]` array (`1100 Hz` for open-jaw `viseme_aa`, `650 Hz` for rounded-lip `viseme_O`, `1650 Hz` for spread-lip `viseme_E`), the synthesizer shapes the triangle wave's harmonics in exact lockstep with the 3D character's mouth blendshapes—and routes the resulting stereo stream straight into `MediaRecorderExporter.ts`!



---

### What would you like to do next?

We are currently in **Step 7 (Obscure Details & "Coder Flex" Blogs)**. Would you like to:

1. **Move on to Step 8 (First-Person AI Coding Orchestrator Perspectives):** Write a detailed, first-person blog post from the perspective of an AI coding orchestrator agent analyzing this architecture, detailing how it would tinker with the codebase and proposing a concrete roadmap of iterative self-improvements?
2. **Generate another "Coder Flex" Blog (Blog 19)** in Step 7?
