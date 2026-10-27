# Turn 11 — Blog 5: Zero-Drift Locomotion & Scrub-Safe Blending

*Source: `Latest From branched onward.md` — turn 11 of 18*

**User:**

yes

---

**AI:**

### Blog 5: Zero-Drift 60 FPS Biomechanics — Scrub-Safe Skeletal Blending & Arc-Length Catmull-Rom Locomotion

If you take a standard Three.js or Unity game character controller and hook it up to a video timeline scrubber, two things break immediately:

1. **Stateful Delta-Time Drift (`mixer.update(dt)`):** Game loops advance skeletal animations and character positions incrementally from the previous frame ($\vec{P}_k = \vec{P}_{k-1} + \vec{v} \cdot \Delta t$). If a viewer watches a scene up to $t = 12.40\text{s}$, scrubs backward to $t = 3.10\text{s}$, and then jumps forward to $t = 12.40\text{s}$ again, a stateful `AnimationMixer` or velocity integrator produces completely different bone matrices depending on the direction and speed of the scrub.


2. **Catmull-Rom Parameter Speed Warping & Foot-Sliding ("Moonwalking"):** When an 8B LLM outputs unevenly spaced 3D waypoints—for instance, a short $1.2\text{m}$ step from `[-3.1, 0, -1.5]` to `[-2.0, 0, 0.4]` followed by a longer curve to `[-0.85, 0, 0.55]`—evaluating a raw cubic spline at parameter $u = (t - t_0)/\Delta t$ causes the character to race through long spans and crawl through short spans. Worse, if the `Walk` animation clip plays at a fixed temporal frequency ($1.0\text{ Hz}$) while the character accelerates and decelerates, their boots slide across the floor grid like they are skating on ice.



In **Chronos3D (`@chronos3d/engine-core`)**, both problems are eliminated by replacing stateful game-loop integration with **purely functional time evaluation ($S(t)$)**, **Arc-Length Reparameterized Catmull-Rom Look-Up Tables (LUTs)**, and **Distance-Locked Stride Phase ($\phi_{\text{stride}} = d(t) / L_{\text{stride}}$)**.

---

#### 1. The Zero-Drift Invariant: Evaluating `THREE.AnimationMixer` at $\Delta t = 0$

Our non-functional requirements mandate **$0.0\text{mm}$ pose variance** when seeking to any timestamp $t$ from any direction. To achieve this inside `ProceduralRigBuilder.ts` and the 60 FPS render loop (`apps/studio-web/src/App.tsx`), we never pass frame delta (`dt`) into `rig.mixer.update(dt)`.

Instead, all five skeletal clips (`Idle`, `Walk`, `Explain`, `PointRight`, `Wave`) are initialized in a playing state during rig construction, and on every single frame at timestamp $t$, we compute each action's exact phase and weight directly from $t$, then flush the skeletal hierarchy with **`rig.mixer.update(0)`**:

```typescript
rig.actions.forEach((act, name) => {
  if (name === 'Walk') {
    act.setEffectiveWeight(walkWeight);
    act.time = stridePhase * act.getClip().duration;
  } else if (name === baseClip) {
    const isUpper =
      baseClip === 'Explain' || baseClip === 'PointRight' || baseClip === 'Wave';
    act.setEffectiveWeight(isUpper ? 0.9 : 1 - walkWeight);
    act.time = t % (act.getClip().duration || 1);
  } else {
    act.setEffectiveWeight(0);
  }
});

// Flush evaluated bone transforms at exactly delta = 0 (100% scrub-safe!)
rig.mixer.update(0);

```

Why is `rig.mixer.update(0)` such a critical architectural primitive?

* Because `act.time` and `act.setEffectiveWeight(...)` are set explicitly as deterministic functions of $t$ before `mixer.update(0)` is called, Three.js's internal `PropertyMixer` interpolates all bone `VectorKeyframeTrack` and `QuaternionKeyframeTrack` buffers at that exact instant without advancing internal accumulators.


* Whether you arrive at $t = 12.40\text{s}$ via normal $1\times$ playback, $0.08\times$ slow-motion swerve, or an instant backward timeline drag from $t = 45.00\text{s}$, the resulting world matrices of `Hips`, `Spine`, `Head`, and `ForearmR` are bit-for-bit identical.



---

#### 2. Upper/Lower Body Track Decoupling

How can ARIA walk smoothly along a curved path while simultaneously gesturing with her arms (`Explain` or `PointRight`), turning her head toward ZEPHYR, and speaking with 14-viseme lip-sync?

Look at how `ProceduralRigBuilder.ts` (`packages/engine-core/src/ProceduralRigBuilder.ts`) authors the `Walk` clip versus the upper-body gesture clips (`Explain`, `PointRight`, `Wave`):

```text
15-Bone Humanoid Hierarchy & Track Ownership
═══════════════════════════════════════════════════════════════════════════
root (THREE.Group) ─── Driven by Spline Position P(u) & Heading Yaw θ(u)
 └─ Hips ───────────── Driven by Walk Clip (vertical bob ±0.04m) / Idle Clip
     ├─ ThighL ───────┐
     │   └─ ShinL     ├── Driven 100% by Walk Clip (Stride Phase φ_stride)
     ├─ ThighR        │
     │   └─ ShinR ────┘
     └─ Spine ─────────── Driven by Arm IK Lean Compensation & Gaze IK
         ├─ ShoulderL ─┐
         │   └─ ForearmL├── Blended: Walk Arm-Swing vs. Explain/PointRight/Wave
         ├─ ShoulderR  │    (Overridden post-mixer when 2-Bone Arm IK weight > 0)
         │   └─ ForearmR┘
         └─ Head ────────── Driven post-mixer by applyCharacterLookAtIK()
             ├─ BrowL/R ─── Driven by EMOTION_PRESETS (Lift & Tilt)
             └─ MouthMesh ─ Driven by 14 Oculus Viseme morphTargetInfluences

```

* **`Walk` Clip (`walkClip`):** Contains `VectorKeyframeTrack` for `Hips.position` (producing the natural vertical gait bounce between $y = 0.99\text{m}$ and $y = 1.06\text{m}$ twice per stride cycle) and `QuaternionKeyframeTrack` channels for `ThighL`, `ShinL`, `ThighR`, `ShinR`, and subtle counter-swing on `ShoulderL`/`ShoulderR`.


* **Upper-Body Gesture Clips (`explainClip`, `pointRightClip`, `waveClip`):** Contain **only** `ShoulderL.quaternion` and `ShoulderR.quaternion` tracks—leaving `ThighL/R` and `ShinL/R` completely untouched.



When ARIA is walking (`walkWeight > 0`) and simultaneously executing an upper-body gesture like `Explain` (`isUpper === true`), both clips remain active in the `AnimationMixer`: `Walk` drives the legs at `walkWeight`, while `Explain` overrides the upper-arm quaternions at weight `0.9`.

---

#### 3. Arc-Length Reparameterized Catmull-Rom Splines (`SplineAndStrideSolver.ts`)

An 8B LLM authors a character's floor trajectory as a compact array of 3D waypoints (`Vector3Tuple[]`) paired with symbolic start and end anchors:

```json
{
  "id": "seg_aria_approach",
  "startTime": "@line_1.start",
  "endTime": "@line_1.word(\"pedestal\") + 0.25",
  "strideLength": 1.25,
  "waypoints": [
    [-3.2, 0, -1.6],
    [-2.1, 0, 0.8],
    [-0.85, 0, 0.55]
  ]
}

```

In `packages/engine-core/src/SplineAndStrideSolver.ts`, `buildArcLengthCatmullRom()` constructs a centripetal/chordal `THREE.CatmullRomCurve3` and pre-computes a high-resolution **250-division cumulative arc-length Look-Up Table (LUT)**:

```typescript
export function buildArcLengthCatmullRom(waypoints: Vector3Tuple[]): {
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
} {
  const pts = waypoints.map((wp) => new THREE.Vector3(wp[0], wp[1], wp[2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  curve.arcLengthDivisions = 250;
  curve.updateArcLengths();
  return { curve, totalLength: curve.getLength() };
}

```

##### Why `getPointAt(u)` Beats `getPoint(t)`

In Three.js, `curve.getPoint(t)` evaluates the raw cubic polynomial parameter $t \in [0, 1]$, where equal $\Delta t$ steps produce unequal world-space distances whenever control points are unevenly spaced. By contrast, `curve.getPointAt(u)` binary-searches the 250-segment cumulative arc-length LUT so that parameter $u \in [0, 1]$ maps linearly to **exact fractional distance traveled along the curve** ($d(u) = u \cdot L_{\text{total}}$).

---

#### 4. Smoothstep Ease-In/Ease-Out & Distance-Locked Stride Phase ($\phi_{\text{stride}}$)

Humans do not accelerate from $0\text{ m/s}$ to full walking speed in $0\text{ms}$ like a rigid constant-velocity platform. They ease into their walk at `startTime`, cruise through the middle of the path, and decelerate smoothly to a halt as they arrive at their destination at `endTime`.

Inside `evaluateSplineLocomotionAtTime()` (`SplineAndStrideSolver.ts`), we map normalized segment time $\alpha = \text{clamp}\left(\frac{t - t_{\text{start}}}{t_{\text{end}} - t_{\text{start}}}, 0, 1\right)$ through the Hermite cubic **`smoothstep`** curve:

$$u(t) = 3\alpha^2 - 2\alpha^3$$

Because the derivative of `smoothstep` is $u'(\alpha) = 6\alpha(1 - \alpha)$, the character's ground velocity naturally starts at $0\text{ m/s}$ at $\alpha = 0$, peaks at $\alpha = 0.5$, and eases back to $0\text{ m/s}$ at $\alpha = 1$.

##### Solving Foot-Sliding During Acceleration and Deceleration

If the character's velocity changes continuously along $u(t)$, how do we prevent their feet from sliding on the floor during the ease-in and ease-out ramps?

1. **Instantaneous Arc-Length Velocity Differentiation (`walkWeight`):** We sample $u(t)$ and $u(t + \Delta t_{\text{probe}})$ (with $\Delta t_{\text{probe}} = 0.03\text{s}$) to compute the instantaneous ground speed $v(t)$ in meters per second, and blend `walkWeight` between `Idle` ($0.0$) and `Walk` ($1.0$) proportionally:



$$v(t) = \frac{\vert{}u(t + 0.03) - u(t)\vert{} \cdot L_{\text{total}}}{0.03}, \qquad w_{\text{walk}}(t) = \text{clamp}\left(\frac{v(t)}{0.85}, 0, 1\right)$$


2. **Distance-Locked Stride Phase ($\phi_{\text{stride}}$):** Instead of driving `walkAction.time` from elapsed clock seconds $t$, we drive it directly from **cumulative meters walked** divided by the character's anatomical stride length $L_{\text{stride}}$ (default $1.25\text{m}$):



$$\phi_{\text{stride}}(t) = \left(\frac{u(t) \cdot L_{\text{total}}}{L_{\text{stride}}}\right) \bmod 1.0$$



Here is the complete solver in `packages/engine-core/src/SplineAndStrideSolver.ts`:

```typescript
export function evaluateSplineLocomotionAtTime(
  t: number,
  startTime: number,
  endTime: number,
  curve: THREE.CatmullRomCurve3,
  totalLength: number,
  strideLength: number = 1.25
): EvaluatedSplineState {
  const dur = Math.max(0.05, endTime - startTime);
  const inWalk = t >= startTime && t <= endTime;
  const rawA = Math.max(0, Math.min(1, (t - startTime) / dur));
  const u = smoothstep(rawA);

  const position = curve.getPointAt(u);
  const tangent = curve.getTangentAt(u).normalize();
  const headingYaw = Math.atan2(tangent.x, tangent.z);

  let walkWeight = 0;
  if (inWalk) {
    const uNext = smoothstep(Math.min(1, (t + 0.03 - startTime) / dur));
    const speed = (Math.abs(uNext - u) * totalLength) / 0.03;
    walkWeight = THREE.MathUtils.clamp(speed / 0.85, 0, 1);
  }

  const stridePhase = ((u * totalLength) / Math.max(0.2, strideLength)) % 1.0;

  return {
    position,
    tangent,
    headingYaw,
    walkWeight,
    stridePhase
  };
}

```

Look at what happens when you drag the **Aria WPM** slider in `apps/studio-web` from **145 WPM** down to **95 WPM**:

* Pass 1 of `@chronos3d/compiler` stretches `line_1` so the spoken word `"pedestal"` occurs $1.8\text{ seconds}$ later.


* Pass 2 stretches `walk_to_pedestal.endTime` (`@line_1.word("pedestal") + 0.25`) to match.


* At runtime, `evaluateSplineLocomotionAtTime()` automatically slows Aria's ground speed $v(t)$ and advances $\phi_{\text{stride}}(t)$ strictly per meter covered—so Aria takes the exact same number of physical footsteps along the floor grid and plants her foot beside the pedestal on the exact syllable `"pedestal"` with zero foot-sliding.



---

Are you ready to proceed to **Blog 6: Reaching Into the 3D World — Closed-Form 2-Bone Arm IK, Gram-Schmidt Pole Vectors & Hierarchical Gaze Tracking**?
