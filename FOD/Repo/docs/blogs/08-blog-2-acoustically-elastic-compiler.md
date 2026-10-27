# Turn 08 — Blog 2: Acoustically Elastic Symbolic Compiler

*Source: `Latest From branched onward.md` — turn 8 of 18*

**User:**

yes

---

**AI:**

### Blog 2: Designing an Acoustically Elastic Timeline — Inside the 4-Pass `@line.word()` Symbolic Compiler

In traditional 3D animation and video production, timing is absolute. A keyframe sits at frame 120 (or second 4.00), a camera cut happens at second 6.50, and an actor's gesture triggers at second 2.10. While rigid timestamps work for static pre-rendered scenes, they fail the moment you introduce **neural Text-to-Speech (TTS) variability, dynamic voiceover translation, or live user prompt editing**.

If an LLM or author hardcodes `time: 4.2` for ARIA's `PointRight` gesture, and a user switches from a fast English voice (145 WPM) to a slower German voice (115 WPM)—or if a neural TTS engine takes 5.3 seconds to speak a line that previously took 4.0 seconds—the 3D animation immediately desynchronizes from the audio. The character points at empty air *before* the word is spoken, or finishes walking *after* the sentence has ended.

Chronos3D solves this through **acoustically elastic symbolic compilation** implemented in `@chronos3d/compiler` (`expression-parser.ts`, `compile-symbolic-manifest.ts`).

---

#### 1. The Symbolic Time Expression DSL (`TimeExpression`)

Instead of writing raw floating-point seconds, authors and 8B LLMs script scenes using **symbolic time expressions** that reference dialogue nodes, spoken tokens, and structural animation markers:

```typescript
export type TimeExpression = number | string;

```

When evaluated by `evaluateTimeExpression()`, expressions resolve against a live symbol table populated during Pass 1 of the compiler:

* **Literal Seconds:** `4.25` or `"4.25"` $\to$ Exactly `4.25` seconds.


* **Dialogue Start / End Anchors:** `"@line_1.start"` or `"@line_2.end + 0.35"` $\to$ Resolves to the exact acoustic start or end millisecond of the referenced dialogue line, plus or minus arithmetic offsets.


* **Word-Token Anchors:** `"@line_2.word(\"surge\") - 0.1"` or `"@line_1.word(4)"` $\to$ Searches the line's punctuation-stripped `TTSWordBoundary[]` array for the exact token or index and returns its acoustic start timestamp minus 100 milliseconds for physical anticipation.


* **Progress Interpolation:** `"@line_3.progress(0.5)"` $\to$ Linearly interpolates halfway ($\Delta t \cdot 0.5$) across the line's duration.



---

#### 2. Inside the 4-Pass Compilation Pipeline (`compileSymbolicManifest.ts`)

When an author or UI control modifies a speaking rate (WPM) or triggers a new TTS stream, `@chronos3d/compiler` executes a four-pass transformation in **under 1.5 milliseconds**:

```
[SymbolicSceneManifest] (AST with @line.word() anchors)
       │
       ├──► Pass 1: Acoustic Word-Boundary Alignment & Symbol Table Hydration
       │           (Synthesizes TTS offsets or prosody estimates into TTSWordBoundary[])
       │
       ├──► Pass 2: Spline Segment Window & Duration Resolution
       │           (Resolves @seg.startTime and registers segment duration symbols)
       │
       ├──► Pass 3: Track Keyframe, IK & Camera Shot Hydration
       │           (Evaluates expressions against symbol table, sorts & resolves shots)
       │
       └──► Pass 4: Elastic Velocity & Viseme Time-Warping
                   (Stretches walk curves & co-articulation envelopes to match new word timings)
       │
       ▼
[CompiledSceneManifest] (Flat numeric Intermediate Representation for 60FPS Three.js runtime)

```

##### Pass 1: Acoustic Word-Boundary Alignment (`viseme-compiler.ts`)

Pass 1 ingests either real neural TTS telemetry (`ttsWordOffsets` from ElevenLabs, Azure, or WhisperX) or falls back to a prosody estimator that computes syllable counts via vowel-nucleus regex (`[aeiouy]+`) and punctuation pauses:

```typescript
export function synthesizeWordTimingsForLine(
  line: SymbolicDialogueLine,
  lineStartSec: number,
  wpmOverride: number
): { words: TTSWordBoundary[]; endSec: number; visemes: VisemeCue[] } {
  // If real neural TTS word offsets are provided, use them directly;
  // otherwise, estimate syllable durations elastically from WPM.
  ...
}

```

Every resolved dialogue segment is registered in the master `symbolicTable`:

```typescript
symbolicTable.set(line.id, {
  id: line.id,
  start: adjustedStart,
  end: endSec,
  duration: endSec - adjustedStart,
  words
});

```

##### Pass 2 & 3: Structural Anchor & Track Hydration

Pass 2 resolves Catmull-Rom spline segment windows (`startTime` and `endTime`), registering each segment ID into the symbol table so downstream tracks can reference `@walk_approach.end`. Pass 3 then evaluates all skeletal clips, 2-bone arm IK keyframes, emotional face shifts, and camera director shots, sorting them chronologically:

```typescript
export function evaluateTimeExpression(
  expr: TimeExpression,
  symbolTable: Map<string, SymbolTableEntry>
): { seconds: number; matchedInfo: string } {
  if (typeof expr === 'number') return { seconds: expr, matchedInfo: `Literal ${expr}` };
  
  const anchorRegex = /^@([a-zA-Z0-9_-]+)\.(start|end|duration|word\(([^)]+)\)|progress\(([0-9.]+)\))\s*([+-]\s*[0-9.]+)?$/;
  // Parses accessor, extracts word/token, applies offset arithmetic, and returns exact seconds.
  ...
}

```

##### Pass 4: Elastic Time-Warping

Because spline durations and gesture keyframe windows are bound dynamically to `@line.word("pedestal")` or `@line_1.end`, changing an actor's speaking rate from 145 WPM to 110 WPM automatically stretches the entire animation timeline without breaking a single spatial constraint.

---

#### 3. Vitest Unit Test Verification (`compiler.test.ts`)

The compiler package includes automated unit tests verifying expression evaluation, WPM elasticity, and performance SLAs:

```typescript
it('elastically shifts spline, Arm IK, and camera keyframes when speaker WPM changes', () => {
  const fastCompiled = compileSymbolicManifest(manifest, { actor_aria: 200, actor_zephyr: 200 });
  const slowCompiled = compileSymbolicManifest(manifest, { actor_aria: 100, actor_zephyr: 100 });

  expect(slowCompiled.duration).toBeGreaterThan(fastCompiled.duration);
  
  const fastIk = fastCompiled.tracks.find(t => t.id === 'track_ik')!.ikKeyframes![0].time;
  const slowIk = slowCompiled.tracks.find(t => t.id === 'track_ik')!.ikKeyframes![0].time;
  expect(slowIk).toBeGreaterThan(fastIk);
});

```

---

Would you like to proceed to **Blog 3: Sub-20ms Lip-Sync Without Manual Keyframes — Neural Forced Alignment, Prosody Estimation & 14-Viseme Co-Articulation**?
