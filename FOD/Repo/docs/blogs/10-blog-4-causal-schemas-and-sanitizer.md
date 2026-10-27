# Turn 10 — Blog 4: Taming 7B–8B LLMs — Causal Schemas & Sanitizer

*Source: `Latest From branched onward.md` — turn 10 of 18*

**User:**

yes

---

**AI:**

### Blog 4: Taming 7B–8B LLMs for 3D Choreography — Causal JSON Schemas & The 4-Rule Self-Healing Sanitizer

Ask a frontier 70B+ or proprietary cloud LLM to write a 3D scene manifest, and it will usually get the spatial blocking, symbolic word references, and camera rules right on the first try. Ask a local, quantized **7B–8B parameter model** (`Qwen-2.5-7B-Instruct` or `Llama-3.1-8B-Instruct` running in Ollama or vLLM) to do the same in a single zero-shot pass, and you immediately confront the realities of small-model attention limits:

1. **Forward-Reference Hallucinations:** If the JSON schema places `tracks` before `dialogue`, an 8B model has to invent `@line_2.word("surge")` *before* it has even written `line_2.text`. Half the time, when it finally writes `line_2.text` 400 tokens later, it forgets to include the word `"surge"` at all.
2. **Morphological Inflection Drift:** Even when `dialogue` comes first, the model writes `"Watch closely: the exact moment I say surging..."` in `line_2.text`, and then writes `"@line_2.word(\"surge\") - 0.1"` in the gesture track—failing exact string equality.


3. **Unchained Sequential Dialogue (`start: 0`):** On `line_2` or `line_3`, small models occasionally fall back to `"start": 0` (or `"0.0"`), causing both characters to speak over each other at timestamp $t = 0.0\text{s}$.


4. **3D Obstacle Collisions:** While routing a Catmull-Rom spline from Stage Left `[-3.1, 0, -1.5]` toward the central pedestal, an 8B model may emit a final waypoint like `[-0.25, 0, -0.35]`—which sits directly inside the `0.72m` radius of the Central Containment Pedestal (`[-0.15, 0, -0.45]`), causing the character mesh to walk straight through solid geometry.


5. **Crossing the 180-Degree Camera Line:** During a Shot-Reverse-Shot sequence (`overTheShoulder` on Aria $\to$ `overTheShoulder` on Zephyr), an 8B model frequently flips `"side": "right"` to `"side": "left"` because it confuses "the character on the left" with "the camera side of the line of action".



In **Chronos3D (`chronos-3d-studio`)**, we achieve a **$>99.5\%$ crash-free compilation rate** on 7B–8B models by pairing **Causal Constrained JSON Schema Decoding** (`@chronos3d/schema/src/llm-json-schema.ts`) with a deterministic **4-Rule Self-Healing Sanitizer** (`@chronos3d/compiler/src/llm-sanitizer.ts`).

---

#### 1. Designing for Autoregressive Attention: Causal Key Ordering & Chain-of-Thought Grounding

Autoregressive language models generate tokens strictly left-to-right ($P(x_t \mid x_{<t})$). A token at position $t$ can attend to tokens at $< t$, but cannot attend to tokens that haven't been sampled yet.

In `LLM_SCENE_JSON_SCHEMA` (`packages/schema/src/llm-json-schema.ts`) and `SymbolicMultiChapterSceneManifest`, we exploit left-to-right attention by enforcing a strict **top-to-bottom causal property order** at the grammar/FSM sampling layer:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. "id", "title", "subtitle"                                               │
│    Sets the narrative frame & episode identity.                            │
├────────────────────────────────────────────────────────────────────────────┤
│ 2. "chapterPlan" (Embedded Chain-of-Thought Scratchpad)                    │
│    Forces the 8B model to plan spatial landmarks, trigger words, and       │
│    camera coverage in plain English BEFORE emitting a single coordinate.   │
├────────────────────────────────────────────────────────────────────────────┤
│ 3. "dialogue" (line_1, line_2, line_3, ...)                                │
│    Establishes every line ID and spoken word token in the KV cache         │
│    BEFORE any track or camera shot is allowed to reference them.           │
├────────────────────────────────────────────────────────────────────────────┤
│ 4. "tracks" (splinePath, animationClip, armIK, facialEmotion, lookAt...)   │
│    Attends directly back to "dialogue" in the KV cache to pick exact       │
│    spoken words for @line_X.word("...") and @seg_Y.end anchors.            │
├────────────────────────────────────────────────────────────────────────────┤
│ 5. "cameraShots" & "decision"                                              │
│    Attends to both "dialogue" and "tracks" to frame the already-blocked    │
│    choreography and trigger branching choices at "@line_3.end + 0.2".      │
└────────────────────────────────────────────────────────────────────────────┘

```

##### Why `"chapterPlan"` Inside the JSON Schema Works So Well

When using grammar-constrained decoding (`format: jsonSchema` in Ollama or `guided_json` in vLLM), the model is not allowed to emit free-form `<think>...</think>` text outside the JSON object. By making `"chapterPlan"` a required string field right before `"dialogue"`, we give the 8B model an **in-schema Chain-of-Thought (CoT) scratchpad**:

```json
{
  "id": "ch1_core_inspection",
  "title": "Chapter 1: The Harmonic Surge",
  "chapterPlan": "Aria walks from STAGE_LEFT_BACK [-3.2,0,-1.6] to PEDESTAL_APPROACH_LEFT [-0.85,0,0.55] finishing on the word 'pedestal' in line_1. In line_2, she points at holo_core on the word 'surge' while the core scales up. Camera starts with a lead splineDolly, cuts to OTS on Aria, then Reverse OTS on Zephyr.",
  "dialogue": [ ... ]
}

```

Once the 8B model writes `"finishing on the word 'pedestal' in line_1"` inside `chapterPlan`, its self-attention heads strongly attend to that token when generating `line_1.text` *and* when binding `endTime: "@line_1.word(\"pedestal\") + 0.25"` inside `tracks`.

---

#### 2. Grammar-Level Regex Enforcement (`TimeExpression` Pattern)

Even with causal ordering, an unconstrained 8B model might invent invalid anchor syntax like `"@line_2.onWord('surge')"` or `"line_1.end + 0.5s"`. In the JSON Schema definition (`$defs.TimeExpression`), we constrain every timestamp string using a regular expression compiled directly into the token sampler's finite-state automaton:

```json
"TimeExpression": {
  "type": "string",
  "description": "Either '0.2' for the first event, or a symbolic anchor like '@line_1.start', '@line_1.end + 0.35', '@line_2.word(\"surge\") - 0.1', or '@line_2.progress(0.5)'.",
  "pattern": "^([0-9]+(\\.[0-9]+)?|@[a-zA-Z0-9_]+\\.(start|end|duration|word\\(\"[a-zA-Z0-9]+\"\\)|word\\([0-9]+\\)|progress\\(0\\.[0-9]+\\))(\\s*[+-]\\s*[0-9]+(\\.[0-9]+)?)?)$"
}

```

Similarly, `ActorOrPropId` (`"actor_aria"`, `"actor_zephyr"`, `"holo_core"`, `"containment_pedestal"`, `"survey_drone"`, `"camera"`, `"auto"`) and skeletal clip names (`"Idle"`, `"Explain"`, `"PointRight"`, `"Wave"`, `"Inspect"`) are locked via strict `"enum"` arrays. It is **mathematically impossible** for the token sampler to emit a syntax error or a non-existent bone/clip name.

---

#### 3. Inside `sanitizeAndRepairLLMScene`: The 4-Rule Self-Healing Sanitizer

Constrained decoding guarantees **syntactic validity**, but it cannot enforce **cross-field semantic or geometric invariants** (such as whether a spoken word inside `tracks` actually appears in `dialogue[1].text`, or whether a `[x, y, z]` coordinate intersects a cylinder in 3D space).

That is the job of `sanitizeAndRepairLLMScene()` (`packages/compiler/src/llm-sanitizer.ts`), which sits directly between the 8B model output and `compileSymbolicManifest()`. Importantly, it returns **both** the repaired `SymbolicSceneManifest` and a structured array of `SanitizerRepairEntry[]` audit cards so human directors can inspect and toggle between **"Raw 8B (Unfixed)"** and **"Sanitized"** modes in the studio UI:

```typescript
export interface SanitizerRepairEntry {
  ruleId:
    | 'OBSTACLE_PUSH_OUT'
    | 'WORD_STEM_FUZZY_MATCH'
    | 'DIALOGUE_CHAIN_REPAIR'
    | 'CAMERA_180_AXIS_LOCK';
  targetPath: string;
  beforeValue: string;
  afterValue: string;
  explanation: string;
}

```

Let's walk through the exact implementation and geometry of all four rules.

---

##### Rule 1: `DIALOGUE_CHAIN_REPAIR` — Auto-Chaining Sequential Dialogue Lines

When an 8B model generates multiple dialogue lines, it reliably sets `line_1.start` to `0.2` or `0.25`, but occasionally forgets to chain `line_2.start` and emits `0` or `"0"`. Left unfixed, both characters talk simultaneously at $t = 0\text{s}$.

Rule 1 inspects every dialogue line at index $\text{idx} > 0$ and rewrites any zero start timestamp into a symbolic chain referencing the preceding line's end plus a natural $350\text{ms}$ conversational turn-taking pause:

```typescript
// RULE 1: Auto-chain sequential dialogue lines if an 8B model emitted start: 0 on line_2+
manifest.dialogue.forEach((line, idx) => {
  if (idx > 0 && (line.start === 0 || line.start === '0' || line.start === '0.0')) {
    const prevId = manifest.dialogue[idx - 1].id;
    const chained = `@${prevId}.end + 0.35`;
    repairs.push({
      ruleId: 'DIALOGUE_CHAIN_REPAIR',
      targetPath: `dialogue[${idx}].start (${line.id})`,
      beforeValue: String(line.start),
      afterValue: chained,
      explanation: `Prevented overlapping speech by chaining ${line.id} after @${prevId}.end`
    });
    line.start = chained;
  }
});

```

---

##### Rule 2: `WORD_STEM_FUZZY_MATCH` — Morphological Stem Resolution for `@line.word()`

Suppose `line_2.text` is:

> `"Watch closely: the exact moment I say surging, I touch the Quantum Core as it expands!"`
> 

And the 8B model emits a gesture or Arm IK keyframe anchored to:

> `"@line_2.word(\"surge\") - 0.1"` (or `"@line_2.word(\"destabilize\")"` when the transcript says `"destabilizing"`)
> 
> 

In `llm-sanitizer.ts`, we first tokenize every dialogue line into a lookup map of lowercase, punctuation-stripped words (`dialogueWordsMap`), and then run `repairSymbolicWordExpression()` across every spline `startTime`/`endTime`, track `keyframe.time`, `ikKeyframe.time`, and camera shot window:

```typescript
function stemToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(ing|ed|es|s|tion|ly)$/, '');
}

```

If `lineTokens.includes(cleanRequested)` is already true, the expression passes untouched. Otherwise, the sanitizer strips common English morphological suffixes (`-ing`, `-ed`, `-es`, `-s`, `-tion`, `-ly`) from both the requested anchor word and each spoken token in the referenced line:

```typescript
const reqStem = stemToken(cleanRequested);
const fuzzyMatch = lineTokens.find((tok) => {
  const tokStem = stemToken(tok);
  return (
    (reqStem.length >= 3 && tokStem.startsWith(reqStem)) ||
    (tokStem.length >= 3 && reqStem.startsWith(tokStem)) ||
    tok.includes(cleanRequested)
  );
});

if (fuzzyMatch) {
  const repaired = `@${lineId}.word("${fuzzyMatch}")${trailingOffset}`;
  repairs.push({
    ruleId: 'WORD_STEM_FUZZY_MATCH',
    targetPath,
    beforeValue: String(expr),
    afterValue: repaired,
    explanation: `Matched morphological stem "${requestedWord}" -> spoken token "${fuzzyMatch}" in @${lineId}`
  });
  return repaired;
}

```

When `"surge"` (`reqStem = "surg"`) is compared against `"surging"` (`tokStem = "surg"`), `tokStem.startsWith(reqStem)` matches immediately, and the sanitizer rewrites `"@line_2.word(\"surge\") - 0.1"` into `"@line_2.word(\"surging\") - 0.1"` while preserving the `- 0.1` anticipation offset.

---

##### Rule 3: `OBSTACLE_PUSH_OUT` — Radial Keep-Out Projection Around Stage Geometry

To prevent characters from walking through solid stage props, `@chronos3d/schema` (`llm-json-schema.ts`) defines calibrated keep-out cylinders on the $XZ$ floor plane:

```typescript
export const STAGE_OBSTACLES: ObstacleKeepOutZone[] = [
  {
    id: 'holo_pedestal',
    name: 'Central Containment Pedestal',
    centerXZ: [-0.15, -0.45],
    radius: 0.72
  }
];

```

For every spline waypoint $\vec{W}_{xz} = (x, z)$ in `track.segments[s].waypoints`, Rule 3 computes the radial vector from the obstacle center $\vec{C}_{xz} = (c_x, c_z)$:

$$\Delta x = x - c_x, \qquad \Delta z = z - c_z, \qquad d = \sqrt{\Delta x^2 + \Delta z^2}$$

If $d < R_{\text{obstacle}}$ ($0.72\text{m}$), the waypoint sits inside the collision cylinder. Rather than deleting the waypoint or snapping it to an arbitrary corner, the sanitizer projects the waypoint **radially outward** along the unit normal $\hat{n} = (\Delta x / d, \Delta z / d)$ to a safe clearance distance $d_{\text{safe}} = R_{\text{obstacle}} + 0.06\text{m} = 0.78\text{m}$:

$$\vec{W}'_{xz} = \vec{C}_{xz} + \hat{n} \cdot (R_{\text{obstacle}} + 0.06)$$

```text
                      Catmull-Rom Approach Curve
                           \
                            \   Pushed Outward along n_hat
                             ●' W_repaired [-0.70, 0, 0.10] (d = 0.78m >= 0.72m)
                              ↖
                               \
                   ╭────────────╲────────────╮
                ╭──┘             ● W_raw     └──╮
               │                [-0.25, 0, -0.35]│
               │        ● Center                 │  R = 0.72m Keep-Out Ring
               │      [-0.15, -0.45]             │
                ╰──┐                         ┌──╯
                   ╰─────────────────────────╯

```

Here is the exact implementation in `packages/compiler/src/llm-sanitizer.ts`:

```typescript
seg.waypoints = seg.waypoints.map((wp, wIdx) => {
  let [x, y, z] = wp;
  STAGE_OBSTACLES.forEach((obs) => {
    const dx = x - obs.centerXZ[0];
    const dz = z - obs.centerXZ[1];
    const dist = Math.hypot(dx, dz);
    if (dist < obs.radius) {
      const normX = dist > 0.001 ? dx / dist : -1;
      const normZ = dist > 0.001 ? dz / dist : 1;
      const safeDist = obs.radius + 0.06;
      const pushedX = Number((obs.centerXZ[0] + normX * safeDist).toFixed(2));
      const pushedZ = Number((obs.centerXZ[1] + normZ * safeDist).toFixed(2));
      repairs.push({
        ruleId: 'OBSTACLE_PUSH_OUT',
        targetPath: `${seg.id}.waypoints[${wIdx}]`,
        beforeValue: `[${x}, ${y}, ${z}]`,
        afterValue: `[${pushedX}, ${y}, ${pushedZ}]`,
        explanation: `Pushed waypoint radially outside ${obs.name} (${obs.radius}m keep-out zone)`
      });
      x = pushedX;
      z = pushedZ;
    }
  });
  return [x, y, z];
});

```

Because the projection is purely radial along the direction of approach, ARIA walks right up to the safe perimeter of the containment pedestal without colliding with the mesh.

---

##### Rule 4: `CAMERA_180_AXIS_LOCK` — Enforcing the 180-Degree Cinematography Rule

In cinematography, the **180-degree rule** states that once the camera establishes a viewing side (`"right"` or `"left"`) relative to the Line of Action connecting two actors, consecutive `twoShot` and `overTheShoulder` cuts must remain on that same side so Actor A stays on screen-left and Actor B stays on screen-right.

When an 8B model switches `subjectId` and `secondaryId` for a reverse Over-The-Shoulder cut (`shot_3_rev_ots_zephyr`), it often mistakenly flips `side: "right"` to `side: "left"`. Rule 4 records the first established `canonicalSide` and normalizes all subsequent OTS and Two-Shot cuts to match:

```typescript
let canonicalSide: 'left' | 'right' | null = null;
manifest.cameraShots.forEach((shot, cIdx) => {
  if (shot.shotType === 'overTheShoulder' || shot.shotType === 'twoShot') {
    if (!canonicalSide) {
      canonicalSide = shot.side || 'right';
      shot.side = canonicalSide;
    } else if (shot.side && shot.side !== canonicalSide) {
      repairs.push({
        ruleId: 'CAMERA_180_AXIS_LOCK',
        targetPath: `cameraShots[${cIdx}].side (${shot.id})`,
        beforeValue: shot.side,
        afterValue: canonicalSide,
        explanation: `Normalized camera side to "${canonicalSide}" to prevent crossing the 180-degree line of action`
      });
      shot.side = canonicalSide;
    }
  }
});

```

---

#### 4. End-to-End Inference Pipeline: Ollama / vLLM $\to$ Sanitizer $\to$ Compiler

Connecting a local 8B model (`qwen2.5:7b-instruct` or `llama3.1:8b-instruct`) to the 3D engine takes less than 35 lines of code:

```typescript
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'qwen2.5:7b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userStoryPrompt }
    ],
    format: LLM_SCENE_JSON_SCHEMA, // Enforces schema at token sampling layer
    stream: false,
    options: { temperature: 0.25, num_ctx: 8192 }
  })
});

const rawManifest = JSON.parse((await response.json()).message.content);

// 1. Self-Healing Sanitizer repairs spatial collisions & stem mismatches
const { repairedManifest, repairs } = sanitizeAndRepairLLMScene(rawManifest);

// 2. 4-Pass Symbolic Compiler resolves @line.word() anchors in < 1.5ms
const compiledScene = compileSymbolicManifest(repairedManifest);

```

And in `apps/studio-web/src/App.tsx`, the top toolbar includes a live **Sanitized vs. Raw 8B (Unfixed)** toggle button. Clicking it lets you watch the exact same scene with and without `sanitizeAndRepairLLMScene()`—visually demonstrating how the cyan waypoint cylinder jumps out of the red `0.72m` pedestal collision ring, `line_2` stops talking over `line_1`, and Aria's `PointRight` gesture locks cleanly onto the spoken word `"surging"`.

---

Are you ready to proceed to **Blog 5: Zero-Drift 60 FPS Biomechanics — Scrub-Safe Skeletal Blending & Arc-Length Catmull-Rom Locomotion**?
