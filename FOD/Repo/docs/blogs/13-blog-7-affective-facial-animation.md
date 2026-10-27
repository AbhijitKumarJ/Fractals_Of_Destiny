# Turn 13 — Blog 7: Orthogonal Affective Facial Animation

*Source: `Latest From branched onward.md` — turn 13 of 18*

**User:**

yes

---

**AI:**

### Blog 7: Orthogonal Affective Facial Animation — Blending Eyebrow Bones, Eyelids & Emotions Over Live Speech Visemes

In 3D character animation, one of the most common visual bugs occurs when a character tries to **express an emotion while speaking**. If a rig uses full-face blendshapes (where the `"Happy"` morph target pulls the mouth wide and parts the lips, while the `"viseme_PP"` morph target presses the lips shut for a `'P'` or `'M'` sound), activating both at the same time causes additive vertex explosion: the character's lips clip through their teeth, or their mouth freezes in a permanent grin that ignores bilabial plosives.

Yet human communication relies heavily on **affective prosody**: ARIA needs to furrow her brow in analytical concentration (`focused`) on the exact word `"touch"`, widen her eyes in `surprised` alarm when the reactor spikes, and relax into a warm `happy` smile on `"stabilized"`—all while articulating rapid 14-viseme speech at 145 WPM.

In **Chronos3D (`@chronos3d/engine-core`)**, we solve this by decomposing the facial rig into **strictly orthogonal spatial channels** (`ProceduralRigBuilder.ts`, `EmotionVisemeMixer.ts`), separating upper-face skeletal/eyelid articulation and outer-corner mouth curvature from the central phonetic lip aperture.

---

#### 1. The Principle of Spatial Orthogonality on the Face Mesh

Why do naive facial rigs collide when mixing emotions and speech, and how does Chronos3D keep them independent?

In linear blendshape skinning, the final vertex position $\vec{v}_{\text{final}}$ of a mesh with base vertex $\vec{v}_0$ and $N$ active morph targets is computed on the GPU as:

$$\vec{v}_{\text{final}} = \vec{v}_0 + \sum_{k=1}^{N} w_k \cdot \Delta \vec{v}_k$$

If two morph targets $A$ (e.g., `viseme_aa`) and $B$ (e.g., `emotion_smile`) apply large, opposing displacement vectors $\Delta \vec{v}_A$ and $\Delta \vec{v}_B$ to the **exact same vertices** at the center of the upper and lower lips, their sum $\vec{v}_0 + w_A \Delta \vec{v}_A + w_B \Delta \vec{v}_B$ over-shoots anatomical bounds.

Chronos3D partitions facial expression across three non-overlapping anatomical domains:

```text
Orthogonal Facial Channel Partitioning
═══════════════════════════════════════════════════════════════════════════
1. UPPER FACE (Skeletal Bones: BrowL, BrowR + Eyelid Aperture)
   • Brow Lift (Δy): Vertical translation along the frontal bone
   • Brow Tilt (θ_z): Counter-rotation of BrowL (+θ) & BrowR (-θ)
   • Eye Aperture: Upper/lower eyelid squint (-0.45) vs. wide open (+0.85)
   ──► Zero shared vertices with the mouth mesh!

2. OUTER MOUTH CORNERS (Additive Morphs: emotion_smile / emotion_frown)
   • Displaces lateral commissures (x -> 1.22x) and vertical arch (Δy ∝ x²)
   • Zero vertical displacement at the central lip midline (x = 0)!

3. CENTRAL LIP APERTURE (14 Oculus Phonetic Visemes: viseme_aa .. viseme_U)
   • Drives central vertical jaw opening (y) and pursing/rounding (x)
   • Blends seamlessly with outer corner smile/frown curvature!

```

1. **Skeletal Eyebrow & Eyelid Channels (`BrowL`, `BrowR`):** Upper-face emotion is driven via dedicated child bones of `headBone` (`BrowL` at `[-0.14, 0.19, 0.31]` and `BrowR` at `[0.14, 0.19, 0.31]`) plus upper/lower eyelid aperture scaling.


2. **Parabolic Outer-Corner Mouth Morphs (`emotion_smile` / `emotion_frown`):** Affective mouth morph targets displace the **outer lateral corners** of the mouth ($x \to 1.22x$, with vertical lift proportional to distance from the midline, $\Delta y \propto x^2$). At the center of the lips ($x = 0$), $\Delta y = 0$.


3. **Central Aperture Speech Visemes (`viseme_aa` through `viseme_U`):** The 14 TTS viseme morph targets control the vertical separation and rounding of the **central lip aperture**. Because the emotion morph acts on $x^2$ at the corners while the viseme morph acts on the aperture, both blend simultaneously in `morphTargetInfluences` without vertex clipping.



---

#### 2. The Six Calibrated Affective Presets (`EMOTION_PRESETS`)

Rather than asking a compact **7B–8B LLM** to output raw millimeter bone offsets or Euler angles for eyebrows, `@chronos3d/schema` defines six semantic `EmotionPreset` values that map to calibrated biomechanical tables in `@chronos3d/engine-core`:

| Emotion Preset | `browLift` ($Y$ Offset) | `browTilt` ($Z$ Angle) | `eyeAperture` (Squint / Wide) | `mouthSmileFrown` (Additive Morph) | Visual Character Expression |
| --- | --- | --- | --- | --- | --- |
| **`neutral`** | `0.00` | `0°` | `0.00` (Normal) | `0.00` | Relaxed baseline posture

 |
| **`happy`** | `+0.35` (`+0.03m`) | `-6°` (Arched) | `-0.25` (Cheek squint) | `+0.85` (Corners lifted) | Warm Duchenne smile + arched brows

 |
| **`concerned`** | `+0.45` (`+0.04m`) | `+16°` (Inner up `/ \`) | `-0.15` | `-0.60` (Corners down) | Empathetic / worried inner brow raise

 |
| **`surprised`** | `+0.90` (`+0.075m`) | `-4°` | `+0.85` (Wide open) | `+0.10` + Jaw drop | High eyebrows + widened upper/lower lids

 |
| **`focused`** | `-0.45` (`-0.035m`) | `-12°` (Inner down `\ /`) | `-0.45` (Narrowed) | `-0.20` | Intense analytical concentration

 |
| **`determined`** | `-0.65` (`-0.05m`) | `-18°` (Steep `\ /`) | `-0.35` | `-0.45` | High-stakes action / command expression

 |

Look at how `browTilt` ($Z$-axis rotation) works across the left and right eyebrows:

* Because the face is bilaterally symmetric across the $YZ$ sagittal plane, rotating `browLBone.rotation.z` by $+\theta$ and `browRBone.rotation.z` by $-\theta$ produces symmetric emotional expressions.


* When $\theta = +16^\circ$ (`concerned`), the medial (inner) ends of both eyebrows lift upward into an empathetic `/ \` roof while `browLift` raises their overall height.


* When $\theta = -12^\circ$ (`focused`) or $-18^\circ$ (`determined`), the medial ends angle sharply downward into a concentrated `\ /` V-shape while `browLift` lowers the brow ridge over narrowed eyelids.



---

#### 3. Binding Emotional Shifts to Spoken Words in the Symbolic AST

Because `facialEmotion` is a standard track property in `@chronos3d/schema` (`SymbolicTrack`), an 8B model or human director binds emotional transitions directly to `@line.word()` symbolic anchors alongside gestures and 2-bone arm IK:

```json
{
  "id": "track_aria_emotion",
  "targetId": "actor_aria",
  "property": "facialEmotion",
  "keyframes": [
    { "time": "@line_1.start", "value": "concerned", "crossFade": 0.35 },
    { "time": "@line_2.word(\"touch\") - 0.2", "value": "focused", "crossFade": 0.25 },
    { "time": "@line_2.word(\"stabilized\")", "value": "happy", "crossFade": 0.4 }
  ]
}

```

Notice the `- 0.2` offset on `"@line_2.word(\"touch\") - 0.2"`: in human cognitive psychology, a person's facial expression shifts roughly **150ms to 250ms before** they execute a physical action or pronounce the focal word. Using a negative symbolic offset lets the 8B model script natural emotional anticipation without doing any timestamp arithmetic.

---

#### 4. Inside Stage 4 of the 60 FPS Render Loop

During every frame at timestamp $t$, right after Stage 3 (Gaze & 2-Bone Arm IK) finishes orienting `headBone`, Stage 4 evaluates both the active `EmotionPreset` and the active line's `VisemeCue[]` array:

```typescript
// 1. Evaluate Eyebrow Emotion Channels
const emoTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_emotion');
let activeEmotion: EmotionPreset = 'neutral';
if (emoTrack && emoTrack.keyframes) {
  for (let i = 0; i < emoTrack.keyframes.length; i++) {
    if (t >= emoTrack.keyframes[i].time) {
      activeEmotion = emoTrack.keyframes[i].value as EmotionPreset;
    }
  }
}
const emoCfg = EMOTION_PRESETS[activeEmotion] || EMOTION_PRESETS.neutral;
ariaRig.browLBone.position.y = 0.19 + emoCfg.browLift;
ariaRig.browRBone.position.y = 0.19 + emoCfg.browLift;
ariaRig.browLBone.rotation.z = THREE.MathUtils.degToRad(emoCfg.browTiltDeg);
ariaRig.browRBone.rotation.z = THREE.MathUtils.degToRad(-emoCfg.browTiltDeg);

// 2. Evaluate 14 Oculus Visemes Simultaneously on Mouth Morph Targets
rigsMap.forEach((rig, charId) => {
  const activeLine = manifest.dialogue.find(
    (d) => d.speakerId === charId && t >= d.start && t <= d.end
  );
  const weights: Record<string, number> = {};
  ALL_VISEMES.forEach((v) => (weights[v] = 0));

  if (activeLine) {
    activeLine.visemes.forEach((cue) => {
      const center = cue.time + cue.duration * 0.5;
      const halfW = Math.max(0.035, cue.duration * 0.8);
      const dist = Math.abs(t - center);
      if (dist < halfW) {
        const inf = Math.cos((dist / halfW) * (Math.PI / 2)) * cue.weight;
        weights[cue.viseme] = Math.max(weights[cue.viseme] || 0, inf);
      }
    });
  }

  rig.morphMeshes.forEach((mesh) => {
    const dict = mesh.morphTargetDictionary;
    const inf = mesh.morphTargetInfluences;
    if (!dict || !inf) return;
    ALL_VISEMES.forEach((vName) => {
      const idx = dict[vName];
      if (typeof idx === 'number') {
        inf[idx] = THREE.MathUtils.lerp(inf[idx], weights[vName] || 0, 0.45);
      }
    });
  });
});

```

Because `browLBone` and `browRBone` are children of `headBone`, their local `position.y` and `rotation.z` updates automatically inherit the character's spline walking motion, upper-spine lean, and post-mixer Gaze IK head turns—Delivering expressive, film-grade close-ups (`shotType: "closeUp"`, $28^\circ$ FOV / 85mm portrait lens) with zero manual facial keyframing.

---

Are you ready to proceed to **Blog 8: The Mathematical Camera Director — Automating Over-The-Shoulder Cuts, Dynamic Two-Shots & 180-Degree Continuity**?
