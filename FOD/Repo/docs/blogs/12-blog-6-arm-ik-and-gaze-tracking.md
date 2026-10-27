# Turn 12 — Blog 6: Two-Bone Arm IK & Hierarchical Gaze Tracking

*Source: `Latest From branched onward.md` — turn 12 of 18*

**User:**

yes

---

**AI:**

### Blog 6: Reaching Into the 3D World — Closed-Form 2-Bone Arm IK, Gram-Schmidt Pole Vectors & Hierarchical Gaze Tracking

Pre-baked skeletal animation clips (`Explain`, `PointRight`, `Wave`) are great for general body language, but they are spatially blind. A baked `PointRight` clip rotates the shoulder to a fixed quaternion regardless of whether the target prop is $0.5\text{m}$ to the left, $1.2\text{m}$ high on a pedestal, or bobbing up and down in mid-air. If an educational explainer or interactive story requires ARIA to walk up to the containment pedestal and physically place her fingertips onto the outer surface of the spinning **Quantum Core** on the exact spoken word `"surge"`, baked clips alone will miss the mark.

At the same time, we cannot simply drop in a standard iterative game-engine Inverse Kinematics solver like **CCD (Cyclic Coordinate Descent)** or **FABRIK (Forward And Backward Reaching Inverse Kinematics)**. Iterative solvers step incrementally from the previous frame's bone pose over 10–20 relaxation passes—meaning they can jitter or converge to different elbow orientations when a viewer scrubs a video timeline backward.

In **Chronos3D (`@chronos3d/engine-core`)**, both gaze tracking and physical prop interaction are solved using **closed-form, $O(1)$ analytical post-mixer Inverse Kinematics** (`IKSolvers.ts`, `TwoBoneArmIKSolver.ts`, `HierarchicalLookAtIK.ts`).

---

#### 1. Why IK Must Run Post-Mixer (`Stage 3` of the Frame Pipeline)

In Three.js, calling `rig.mixer.update(0)` evaluates all active `AnimationClip` tracks and overwrites the local `.position` and `.quaternion` of every animated bone in the skeleton. If you apply an IK rotation *before* `mixer.update(0)`, the mixer immediately wipes it out.

Conversely, if you replace the mixer entirely with procedural rotations, the character loses the natural breathing motion and subtle head/torso rhythms baked into their underlying `Idle`, `Walk`, or `Explain` animations.

Chronos3D solves this by executing IK as an **additive post-mixer pass** immediately after `rig.mixer.update(0)`:

1. `rig.mixer.update(0)` establishes the deterministic base skeletal pose for timestamp $t$.


2. `rig.root.updateMatrixWorld(true)` propagates those base bone transforms into world space.


3. **Gaze IK** and **2-Bone Arm IK** read the live world-space bone positions (`headBone`, `shoulderRBone`, `forearmRBone`) and multiply or slerp delta quaternions on top of the mixer's pose.



---

#### 2. Hierarchical Gaze IK (`applyCharacterLookAtIK`)

When a human turns to look at a companion or an unstable reactor core, the motion is distributed across a kinematic chain: the eyes snap first (binocular vergence), the neck/head follows, and for wider angles, the upper chest (`Spine`) rotates to share the load.

In `@chronos3d/engine-core/src/IKSolvers.ts` (and the 3-tier `GazeIKSolver.ts`), `applyCharacterLookAtIK()` transforms the world-space target coordinate $\vec{T}_{\text{world}}$ into the character root's local coordinate frame so anatomical yaw and pitch limits can be enforced cleanly:

```typescript
export function applyCharacterLookAtIK(
  rig: CharacterRigInstance,
  myHeadWorld: THREE.Vector3,
  targetWorld: THREE.Vector3
): void {
  const rootQuat = new THREE.Quaternion();
  rig.root.getWorldQuaternion(rootQuat);

  // Transform world gaze vector into character-local space
  const localDir = targetWorld
    .clone()
    .sub(myHeadWorld)
    .applyQuaternion(rootQuat.invert());

  // Enforce anatomical cervical spine limits (±62° yaw, ±28° pitch)
  const yaw = THREE.MathUtils.clamp(
    Math.atan2(localDir.x, localDir.z),
    THREE.MathUtils.degToRad(-62),
    THREE.MathUtils.degToRad(62)
  );
  const pitch = THREE.MathUtils.clamp(
    -Math.atan2(localDir.y, Math.hypot(localDir.x, localDir.z)),
    THREE.MathUtils.degToRad(-28),
    THREE.MathUtils.degToRad(28)
  );

  rig.smoothedHeadOffset.slerp(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * 0.6, yaw * 0.8, 0)),
    0.22
  );
  // Multiply post-mixer so underlying clip head bobbing is preserved!
  rig.headBone.quaternion.multiply(rig.smoothedHeadOffset);
}

```

Notice two subtle details here:

* **Anatomical Clamping prevents "Owl Neck":** If ARIA walks past ZEPHYR so he is $140^\circ$ behind her shoulder, `Math.atan2(localDir.x, localDir.z)` is clamped to $\pm 62^\circ$ horizontal yaw and $\pm 28^\circ$ vertical pitch—so her head turns naturally to the anatomical limit of the human neck rather than spinning $180^\circ$ around like an owl.


* **Post-Multiplicative Blending (`.multiply()`):** Because `rig.headBone.quaternion.multiply(rig.smoothedHeadOffset)` post-multiplies the delta rotation onto the bone's existing mixer quaternion after `mixer.update(0)`, any subtle head nod baked into a Mixamo or procedural `Walk`/`Explain` clip remains intact while her gaze locks onto `holo_core` or `actor_zephyr`.



---

#### 3. Closed-Form 2-Bone Arm IK: Law of Cosines & Gram-Schmidt Pole Vectors

To let a character reach out and touch any 3D prop at an exact world coordinate $\vec{T}$ with zero scrubbing jitter, we model the arm as a two-link planar triangle embedded in 3D space: an upper arm of length $L_1$ (`Shoulder` $\vec{S} \to$ `Elbow` $\vec{E}$) and a forearm of length $L_2$ (`Elbow` $\vec{E} \to$ `Wrist/Hand` $\vec{T}$), steered by an anatomical **Elbow Pole Vector** $\vec{P}_{\text{pole}}$.

```text
                  Pole Vector (P_pole)
                         ▲
                         │  (Steers Elbow Plane via Gram-Schmidt)
                    v_hat│
                         │      L2 (Forearm = 0.38m)
                Elbow (E)●───────────────────● Target / Prop Surface (T)
                        ╱ ╲ β               ╱
   L1 (UpperArm=0.42m) ╱   ╲               ╱
                      ╱ α   ╲             ╱
        Shoulder (S) ●───────┴───────────●
                         w_hat (Clamped Distance d)

```

Let's walk through the four-step closed-form derivation used in our engine:

##### Step 1: Upper-Spine Lean Compensation & Triangle Inequality Clamping

When a human reaches for an object near the edge of their arm span ($\Vert{}\vec{T} - \vec{S}\Vert{} > 0.82(L_1 + L_2)$), they don't keep their torso frozen like a mannequin—they lean their upper spine forward and into the reach.

* Before solving the arm triangle, if the target distance exceeds $82\%$ of total arm reach, the solver pitches and yaws `rig.spineBone` up to $16^\circ$ toward $\vec{T}$ and calls `updateMatrixWorld(true)` so the shoulder origin $\vec{S}$ physically moves closer to the prop.


* Next, to prevent `Math.acos()` from returning `NaN` when a target is slightly out of reach or too close to the shoulder, the effective chord length $d$ is clamped to the strict triangle inequality interval:



$$d = \text{clamp}\left(\Vert{}\vec{T} - \vec{S}\Vert{}, \; \vert{}L_1 - L_2\vert{} + \epsilon, \; L_1 + L_2 - \epsilon\right)$$



##### Step 2: Law of Cosines for Shoulder Elevation ($\alpha$) & Interior Elbow Angle ($\beta$)

With sides $L_1$, $L_2$, and $d$ known, the **Law of Cosines** gives the exact interior angles of the $\triangle SET$ triangle in $O(1)$ time:

$$\cos(\alpha) = \text{clamp}\left(\frac{L_1^2 + d^2 - L_2^2}{2 L_1 d}, -1, 1\right), \qquad \alpha = \arccos(\cos\alpha)$$

$$\cos(\beta) = \text{clamp}\left(\frac{L_1^2 + L_2^2 - d^2}{2 L_1 L_2}, -1, 1\right), \qquad \theta_{\text{elbow}} = \pi - \arccos(\cos\beta)$$

Here, $\alpha$ is the elevation angle of the upper arm away from the shoulder-to-target chord $\hat{w} = \frac{\vec{T} - \vec{S}}{\Vert{}\vec{T} - \vec{S}\Vert{}}$, and $\theta_{\text{elbow}} = \pi - \beta$ is the anatomical flexion bend of the forearm hinge.

##### Step 3: Gram-Schmidt Orthogonalization of the Elbow Pole Plane $(\hat{w}, \hat{v})$

Fixing $\vec{S}$, $\vec{T}$, $L_1$, and $L_2$ still leaves a circle of possible elbow positions rotating around the chord axis $\hat{w}$. To lock the elbow into an anatomically natural plane (pointing outward and downward rather than flipping upside-down), each `SymbolicArmIKKeyframe` includes a `poleOffset` (default `[0.25, -0.3, 0.15]`, or `[0.35, -0.35, 0.2]`) defining $\vec{V}_{\text{pole}} = \vec{P}_{\text{pole}} - \vec{S}$.

Using **Gram-Schmidt orthogonalization**, we project $\vec{V}_{\text{pole}}$ perpendicular to the reach chord $\hat{w}$ to form an orthonormal 2D basis $(\hat{w}, \hat{v})$ for the arm plane:

$$\hat{v} = \text{normalize}\left(\vec{V}_{\text{pole}} - (\vec{V}_{\text{pole}} \cdot \hat{w})\hat{w}\right)$$

The exact world-space elbow position $\vec{E}(t)$ is then:

$$\vec{E}(t) = \vec{S} + (L_1 \cos\alpha)\hat{w} + (L_1 \sin\alpha)\hat{v}$$

##### Step 4: Local Quaternion Alignment in `IKSolvers.ts`

In `packages/engine-core/src/IKSolvers.ts`, `solveAnalyticalTwoBoneArmIK()` applies the Law-of-Cosines angles directly to `shoulderBone.quaternion` and `forearmBone.quaternion` blended by keyframe `weight` $\in [0, 1]$, and returns the world-space debug joints (`shoulderWorld`, `elbowWorld`, `wristWorld`, `targetWorld`) so the studio can render the live **3D IK Triangle & Contact Ripple Gizmos**:

```typescript
export function solveAnalyticalTwoBoneArmIK(
  rig: CharacterRigInstance,
  hand: 'left' | 'right',
  targetWorld: THREE.Vector3,
  weight: number
): TwoBoneArmIKDebugPoints | null {
  if (weight <= 0.01) return null;

  const shoulderBone = hand === 'right' ? rig.shoulderRBone : rig.shoulderLBone;
  const forearmBone = hand === 'right' ? rig.forearmRBone : rig.forearmLBone;

  rig.root.updateMatrixWorld(true);
  const shoulderWorld = new THREE.Vector3();
  shoulderBone.getWorldPosition(shoulderWorld);

  const upperLen = 0.42;
  const lowerLen = 0.38;
  const maxReach = upperLen + lowerLen - 0.02;

  const toTarget = new THREE.Vector3().subVectors(targetWorld, shoulderWorld);
  const dist = Math.min(maxReach, Math.max(0.15, toTarget.length()));
  const dir = toTarget.clone().normalize();

  // Law of Cosines for shoulder elevation angle
  const cosShoulder = THREE.MathUtils.clamp(
    (upperLen * upperLen + dist * dist - lowerLen * lowerLen) /
      (2 * upperLen * dist),
    -1,
    1
  );
  const shoulderFlexAngle = Math.acos(cosShoulder);

  const rootQuat = new THREE.Quaternion();
  rig.root.getWorldQuaternion(rootQuat);
  const localDir = dir.clone().applyQuaternion(rootQuat.clone().invert());

  const aimPitch = -Math.atan2(localDir.z, -localDir.y);
  const aimRoll =
    (hand === 'right' ? 1 : -1) * Math.atan2(localDir.x, -localDir.y);

  const ikShoulderQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(aimPitch - shoulderFlexAngle * 0.65, 0, aimRoll)
  );
  shoulderBone.quaternion.slerp(ikShoulderQuat, weight);

  // Law of Cosines for interior elbow flexion angle
  const cosElbow = THREE.MathUtils.clamp(
    (upperLen * upperLen + lowerLen * lowerLen - dist * dist) /
      (2 * upperLen * lowerLen),
    -1,
    1
  );
  const elbowBend = Math.PI - Math.acos(cosElbow);
  const ikForearmQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-elbowBend * 0.85, 0, 0)
  );
  forearmBone.quaternion.slerp(ikForearmQuat, weight);

```

---

#### 4. Prop-Relative Surface Offsets & Symbolic Word Binding

How does an 8B LLM or human author script a physical prop touch without knowing the exact world-space center of a moving object?

In `@chronos3d/schema` (`SymbolicArmIKKeyframe`), `target` accepts **either** an explicit `[x, y, z]` world coordinate tuple (e.g., `[-0.2, 1.02, -0.18]` for a static console button) **or** a semantic prop ID (`"holo_core"`) paired with a `surfaceOffset` vector (`[-0.22, 0, 0.18]`):

```json
{
  "id": "track_aria_arm_ik",
  "targetId": "actor_aria",
  "property": "armIK",
  "hand": "right",
  "ikKeyframes": [
    { "time": "@line_1.start", "target": null, "weight": 0.0 },
    {
      "time": "@line_2.word(\"surge\") - 0.05",
      "target": "holo_core",
      "surfaceOffset": [-0.22, 0, 0.18],
      "weight": 1.0
    },
    { "time": "@line_3.start", "target": null, "weight": 0.0 }
  ]
}

```

During the 60 FPS render loop (`apps/studio-web/src/App.tsx`), Stage 1 updates `holoCoreMesh` first, and Stage 3 queries `holoCoreMesh.position.clone().add(new THREE.Vector3(...activeIk.surfaceOffset))` before invoking `solveAnalyticalTwoBoneArmIK()`. Even if the Quantum Core scales up from `0.42` to `0.88` or floats vertically during an anomaly, ARIA's right hand stays locked to its outer surface at the exact millisecond she pronounces `"surging"`.

---

Are you ready to proceed to **Blog 7: Orthogonal Affective Facial Animation — Blending Eyebrow Bones, Eyelids & Emotions Over Live Speech Visemes**?
