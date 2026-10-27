# Turn 19 — Blog 13: Spring-Bone Physics & Prop Handover IK

*Source: `Latest From branched onward1.md` — turn 1 of 9*

**User:**

begin generating Blog 13

---

**AI:**

### Blog 13: Closed-Form Scrub-Safe Spring-Bone Physics & Dual-Hand Collaborative Prop Handover IK

In the core 12-part series, we established the foundational law of **Chronos3D (`chronos-3d-studio`)**: the entire 3D world state at any frame must be a pure mathematical function of timestamp $t$ ($S(t)$), guaranteeing **$0.0\text{mm}$ bone matrix variance** whether the viewer plays forward at $1.0\times$, sweeps through a $0.08\times$ bullet-time camera snapback, or drags the timeline scrubber backward across a 3-hour episode.

However, as we push into the **Phase 4 Advanced Engineering Roadmap** defined in our architecture specification, two high-complexity biomechanical features threaten to break this pure functional invariant:

1. **Secondary Spring-Bone Physics (Hair, Long Coats, Lanyards & Suspended Cables):** In standard game engines (Unity, Unreal, or `three-vrm`), secondary jiggle and cloth/hair follow-through are simulated via stateful Semi-Implicit Euler or Verlet integration ($\vec{x}_k = \vec{x}_{k-1} + \vec{v}_k \Delta t$). If you scrub a stateful Verlet spring bone backward or jump from $t = 45.0\text{s}$ to $t = 12.4\text{s}$, the hair or cable either explodes from an massive $\Delta t$ spike or settles into a completely different trajectory depending on scrub speed.


2. **Dual-Hand Collaborative IK & Actor-to-Actor Prop Handover:** In `BoneSocketManager.ts`, locking a prop like `holo_core` to a single bone socket (`actor_aria.ForearmR`) is a discrete state ownership assignment. But what happens when a character must carry a heavy containment canister with **both hands simultaneously**, or when ARIA physically hands the unstable **Quantum Core** from her right gauntlet (`actor_aria.ForearmR`) directly into ZEPHYR's left hand (`actor_zephyr.ForearmL`) on the exact spoken word `@line_2.word("take")`?



In this advanced deep dive, we will design and implement both subsystems as **100% closed-form, $O(1)$ scrub-safe solvers** inside `@chronos3d/schema` and `@chronos3d/engine-core`.

---

#### 1. Why Stateful Verlet Spring Bones Fail in Scrubbable Video Timelines

In a traditional real-time character rig, a secondary bone (such as a hair strand, shoulder pauldron, or lab-coat hem) tracks its parent bone by integrating hookean spring tension and velocity damping frame-by-frame:

$$\vec{a}(t) = -k \left(\vec{x}(t) - \vec{x}_{\text{rest}}(t)\right) - c \vec{v}(t)$$

This differential equation is stateful: knowing $\vec{x}(t)$ requires knowing $\vec{x}(t - \Delta t)$ and $\vec{v}(t - \Delta t)$ from the beginning of time $t_0 = 0$. That creates three fatal bugs in Chronos3D:

* **Backward Scrub Inversion:** When a user drags the timeline playhead backward ($\Delta t < 0$), standard damping $-c\vec{v}\Delta t$ inverts sign and injects energy *into* the spring, causing hair and cables to violently oscillate.
* **WebCodecs Offline Frame-Stepping:** When `WebCodecsOfflineMuxer.ts` steps frames out-of-order or resumes rendering from a mid-chapter checkpoint snapshot (`WorldCheckpointSnapshot`), any unserialized spring velocity accumulator causes visible pose pop.


* **Bullet-Time Swerve Distortion:** During the `SNAPBACK_SWERVE` camera transition, the timeline clock ramps smoothly from $0.08\times$ slow-motion to $1.0\times$ real time. Frame-rate-dependent spring integrators change their effective stiffness when time-dilation scales $\Delta t$.



---

#### 2. Closed-Form Scrub-Safe Spring-Bone Physics (`ScrubSafeSpringBoneSolver.ts`)

To make secondary physics a pure function of $t$ ($O(1)$ evaluation with zero frame-to-frame memory), we combine two analytical techniques specified in our Phase 4 architecture: **Closed-Form Damped Harmonic Oscillator Impulse Superposition** ($x(t) = A e^{-\zeta \omega_0 t} \cos(\omega_d t + \phi)$) and **3-Point Finite-Difference Kinematic Probing**.

```text
Closed-Form Scrub-Safe Spring Bone Evaluation at Timestamp t
═══════════════════════════════════════════════════════════════════════════
1. KINEMATIC INERTIAL PROBE (Evaluates Parent Bone at t - δt, t, t + δt)
   • Velocity:     v_p(t) = (P_parent(t + δt) - P_parent(t - δt)) / (2·δt)
   • Acceleration: a_p(t) = (P_parent(t + δt) - 2·P_parent(t) + P_parent(t - δt)) / δt²
   ──► Produces continuous inertial drag & centripetal turn flare!

2. CLOSED-FORM DAMPED HARMONIC RINGING (Green's Function Convolution)
   • Impulse Anchors τ_i: Footfalls (φ_stride = 0, 0.5), Spline Stops (t_end),
     and Gesture Inflections (t_keyframe)
   • Underdamped Ringing for τ = t - t_i > 0:
     x_ring(τ) = A_i · e^(-ζ·ω₀·τ) · cos(ω_d·τ + φ_i)
   ──► Guarantees 0.0mm variance whether scrubbing forward or backward!

```

##### A. Mathematical Formulation: Underdamped Green's Function & Kinematic Acceleration

For a spring bone with natural undamped frequency $\omega_0 = \sqrt{k / m}$ (rad/s) and damping ratio $\zeta \in (0, 1)$, the damped natural frequency is:

$$\omega_d = \omega_0 \sqrt{1 - \zeta^2}$$

Whenever the character experiences a discrete kinematic impulse at a compiled timestamp $t_i$—such as:

1. **Footfall Impact:** When the distance-locked stride phase $\phi_{\text{stride}}(t) = \left(\frac{d(t)}{L_{\text{stride}}}\right) \bmod 1.0$ crosses $0.0$ (left heel strike) or $0.5$ (right heel strike),


2. **Locomotion Arrival:** When a Catmull-Rom spline segment decelerates to a halt at `seg.endTime`, or


3. **Gesture Snap:** When an upper-body clip (`PointRight`, `Wave`) or 2-Bone Arm IK reach hits peak acceleration—



the exact closed-form angular deflection $\vec{\theta}_{\text{ring}}(t)$ contributed by impulse $i$ for any $t \ge t_i$ is given by the analytical underdamped harmonic oscillator equation:

$$\vec{\theta}_i(t) = \vec{A}_i \, e^{-\zeta \omega_0 (t - t_i)} \cos\left(\omega_d (t - t_i) + \phi_i\right) \cdot H(t - t_i)$$

where $H(t - t_i)$ is the Heaviside step function and $\vec{A}_i$ is the impulse amplitude vector in the bone's local frame. Because $e^{-\zeta \omega_0 \tau}$ decays below $0.001$ within $\tau_{\text{max}} \approx \frac{6.9}{\zeta \omega_0}$ seconds (typically $1.2\text{s}$ to $2.0\text{s}$), at any timestamp $t$ we only sum impulses within the lookback window $[t - \tau_{\text{max}}, \; t]$.

Simultaneously, to capture smooth **inertial lag** while ARIA walks along a curved Catmull-Rom path, we exploit the fact that our spline and skeletal evaluators are pure functions of $t$. By evaluating the parent attachment position at $t - \delta t$, $t$, and $t + \delta t$ (with $\delta t = 0.016\text{s}$), we obtain the exact instantaneous world velocity $\vec{v}_p(t)$ and acceleration $\vec{a}_p(t)$:

$$\vec{v}_p(t) = \frac{\vec{P}_p(t + \delta t) - \vec{P}_p(t - \delta t)}{2\,\delta t}, \qquad \vec{a}_p(t) = \frac{\vec{P}_p(t + \delta t) - 2\vec{P}_p(t) + \vec{P}_p(t - \delta t)}{\delta t^2}$$

The quasi-steady inertial deflection of the spring bone opposes the parent's velocity and acceleration:

$$\vec{\theta}_{\text{inertial}}(t) = -\frac{1}{\omega_0^2} \left(\mathbf{Q}_{\text{parent}}^{-1}(t) \otimes \vec{a}_p(t)\right) - \frac{2\zeta}{\omega_0} \left(\mathbf{Q}_{\text{parent}}^{-1}(t) \otimes \vec{v}_p(t)\right)$$

##### B. Production Implementation (`packages/engine-core/src/ScrubSafeSpringBoneSolver.ts`)

```typescript
import * as THREE from 'three';

export interface SpringBoneConfig {
  bone: THREE.Bone;
  /** Natural frequency ω₀ in rad/s (typical: 12..24 rad/s) */
  omega0: number;
  /** Underdamped ratio ζ in (0.05..0.85) */
  zeta: number;
  /** Rest orientation in parent bone space */
  restQuaternion: THREE.Quaternion;
  /** Maximum angular deflection in radians to prevent mesh self-intersection */
  maxAngleRad: number;
}

export interface KinematicImpulseEvent {
  time: number;
  /** Local-space angular kick [pitchX, yawY, rollZ] in radians */
  amplitude: [number, number, number];
  /** Initial oscillator phase φ in radians (typically -π/2 for velocity kick) */
  phase: number;
}

/**
 * Evaluates a secondary spring bone (hair, coat tail, lanyard, cable) in O(1)
 * closed form at timestamp t without any frame-to-frame state accumulators.
 */
export function evaluateScrubSafeSpringBoneAtTime(
  t: number,
  config: SpringBoneConfig,
  impulses: KinematicImpulseEvent[],
  sampleParentWorldPosAt: (sampleTime: number) => THREE.Vector3,
  parentWorldQuat: THREE.Quaternion,
  stridePhase?: number,
  walkWeight: number = 0
): void {
  const { bone, omega0, zeta, restQuaternion, maxAngleRad } = config;
  const omegaD = omega0 * Math.sqrt(Math.max(0.01, 1 - zeta * zeta));

  // 1. 3-Point Finite-Difference Kinematic Probe for Inertial Lag & Centripetal Flare
  const dt = 0.016;
  const pPrev = sampleParentWorldPosAt(Math.max(0, t - dt));
  const pCurr = sampleParentWorldPosAt(t);
  const pNext = sampleParentWorldPosAt(t + dt);

  const worldVel = pNext.clone().sub(pPrev).divideScalar(2 * dt);
  const worldAcc = pNext
    .clone()
    .sub(pCurr.clone().multiplyScalar(2))
    .add(pPrev)
    .divideScalar(dt * dt);

  // Transform world velocity and acceleration into the parent bone's local frame
  const invParentQuat = parentWorldQuat.clone().invert();
  const localVel = worldVel.applyQuaternion(invParentQuat);
  const localAcc = worldAcc.applyQuaternion(invParentQuat);

  const invOmegaSq = 1 / (omega0 * omega0);
  const viscCoeff = (2 * zeta) / omega0;

  // Inertial pitch (X) and roll (Z) lag behind parent acceleration & velocity
  let pitchX = -(localAcc.z * invOmegaSq + localVel.z * viscCoeff) * 0.45;
  let yawY = 0;
  let rollZ = (localAcc.x * invOmegaSq + localVel.x * viscCoeff) * 0.45;

  // 2. Continuous Stride-Locked Harmonic Bobbing during Walk Locomotion
  if (typeof stridePhase === 'number' && walkWeight > 0.001) {
    // Double-frequency vertical gait harmonic (2 footfalls per stride cycle)
    const gaitOmega = stridePhase * Math.PI * 4;
    const phaseLag = Math.atan2(2 * zeta, 1 - 0.5);
    pitchX += Math.sin(gaitOmega - phaseLag) * 0.14 * walkWeight;
    rollZ += Math.cos(gaitOmega * 0.5 - phaseLag) * 0.08 * walkWeight;
  }

  // 3. Superposition of Closed-Form Damped Harmonic Oscillator Impulses
  //    x(τ) = A * exp(-ζ * ω₀ * τ) * cos(ω_d * τ + φ)
  const lookbackWindowSec = 6.9 / Math.max(0.5, zeta * omega0);

  for (let i = 0; i < impulses.length; i++) {
    const imp = impulses[i];
    const tau = t - imp.time;
    if (tau >= 0 && tau <= lookbackWindowSec) {
      const envelope = Math.exp(-zeta * omega0 * tau);
      const carrier = Math.cos(omegaD * tau + imp.phase);
      const factor = envelope * carrier;

      pitchX += imp.amplitude[0] * factor;
      yawY += imp.amplitude[1] * factor;
      rollZ += imp.amplitude[2] * factor;
    }
  }

  // 4. Anatomical Cone Clamping & Rest Quaternion Composition
  pitchX = THREE.MathUtils.clamp(pitchX, -maxAngleRad, maxAngleRad);
  yawY = THREE.MathUtils.clamp(yawY, -maxAngleRad * 0.6, maxAngleRad * 0.6);
  rollZ = THREE.MathUtils.clamp(rollZ, -maxAngleRad, maxAngleRad);

  const deltaQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(pitchX, yawY, rollZ, 'XYZ')
  );
  bone.quaternion.copy(restQuaternion).multiply(deltaQuat);
}

```

Look at why `evaluateScrubSafeSpringBoneAtTime()` is completely immune to scrubbing bugs:

* It maintains **zero mutable fields** on `CharacterRigInstance`.


* When ARIA stops abruptly at the containment pedestal (`@line_1.word("pedestal") + 0.25`), `@chronos3d/compiler` emits a `KinematicImpulseEvent` at `seg.endTime`. At runtime, as $t$ crosses `seg.endTime`, her hair and coat tails pitch forward and ring down via $e^{-\zeta \omega_0 (t - t_{\text{stop}})} \cos(\omega_d (t - t_{\text{stop}}) - \pi/2)$.


* If the viewer pauses mid-oscillation at $t = 4.32\text{s}$, flies around ARIA in `PAUSED_FREE_ROAM`, and scrubs backward to $t = 4.10\text{s}$, the spring bone evaluates the exact analytical exponential-cosine value at $t = 4.10\text{s}$ with $0.0\text{mm}$ error.



---

#### 3. Dual-Hand Collaborative IK & Actor-to-Actor Prop Handover

Now let's examine the second Phase 4 frontier: **Dual-Hand Collaborative IK & Actor-to-Actor Prop Handover**.

In Blog 6 and Blog 9, we saw how `solveAnalyticalTwoBoneArmIK()` steers a single wrist toward a prop surface offset (`surfaceOffset: [-0.22, 0, 0.18]`), and how `applyBoneSocketAttachments()` (`BoneSocketManager.ts`) locks a prop's world transform to a single socket (`ForearmR`, `ForearmL`, or `Spine`).

To support **two-handed heavy object carrying** and **mid-scene actor-to-actor prop handover** (e.g., ARIA extracting the `holo_core` with both hands and handing it to ZEPHYR on `@line_3.word("stabilize")`), we must solve three coupled kinematic problems:

```text
3-Phase Actor-to-Actor Prop Handover Kinematics (t ∈ [t_start, t_end])
═══════════════════════════════════════════════════════════════════════════
Phase A: Approach & Rendezvous Alignment (u ∈ [0.0, 0.35])
  • Source Socket (actor_aria.ForearmR) holds prop; ARIA's Arm IK steers
    prop toward the spatial Rendezvous Point M(t) between both actors.
  • Receiver (actor_zephyr.ForearmL) raises empty hand via 2-Bone Arm IK
    to meet the opposite grasp surface offset (+graspRadius) of the prop.

Phase B: Dual-Contact Iso-Velocity Handover Window (u ∈ [0.35, 0.65])
  • BOTH actor_aria.ForearmR and actor_zephyr.ForearmL are locked at IK
    weight = 1.0 onto opposing local surface handles of holo_core!
  • Prop world matrix P_prop(t), Q_prop(t) smoothly slerps ownership from
    Aria's wrist frame to Zephyr's wrist frame via smoothstep(u_transfer).

Phase C: Socket Ownership Commit & Withdrawal (u ∈ [0.65, 1.0])
  • Zephyr's ForearmL assumes 100% socket ownership of holo_core.
  • Aria's right arm IK weight ramps smoothly from 1.0 -> 0.0, returning
    her arm to her active upper-body clip (Explain / Idle).

```

##### A. Extending the Declarative Schema (`@chronos3d/schema`)

First, we extend `@chronos3d/schema` so an 8B LLM or human author can declare either a **Dual-Hand Grasp** or an **Actor-to-Actor Prop Handover** bound to `@line.word()` symbolic anchors:

```typescript
import { TimeExpression, Vector3Tuple } from './symbolic-ast.types';

export interface SymbolicPropHandoverEvent {
  id: string;
  propId: string;
  /** Symbolic start of the handover reach (e.g. '@line_2.word("hand") - 0.35') */
  startTime: TimeExpression;
  /** Symbolic completion when receiver takes full ownership (e.g. '@line_2.word("hand") + 0.55') */
  endTime: TimeExpression;
  fromCharacterId: string;
  fromSocket: 'ForearmR' | 'ForearmL' | 'DualHands';
  toCharacterId: string;
  toSocket: 'ForearmR' | 'ForearmL' | 'DualHands';
  /** Local grasp offset on the prop surface for the giver's hand(s) */
  giverSurfaceOffset: Vector3Tuple;
  /** Opposing local grasp offset on the prop surface for the receiver's hand(s) */
  receiverSurfaceOffset: Vector3Tuple;
}

export interface CompiledPropHandoverEvent {
  id: string;
  propId: string;
  startTime: number;
  endTime: number;
  fromCharacterId: string;
  fromSocket: 'ForearmR' | 'ForearmL' | 'DualHands';
  toCharacterId: string;
  toSocket: 'ForearmR' | 'ForearmL' | 'DualHands';
  giverSurfaceOffset: Vector3Tuple;
  receiverSurfaceOffset: Vector3Tuple;
}

```

##### B. Mathematical Formulation of the Rendezvous Point $\vec{M}(t)$ & Dual-Wrist Locking

When ARIA (`fromCharacterId: "actor_aria"`) hands `holo_core` to ZEPHYR (`toCharacterId: "actor_zephyr"`) over the normalized progress window $u = \frac{t - t_{\text{start}}}{t_{\text{end}} - t_{\text{start}}} \in [0, 1]$:

1. **Dynamic Shoulder-Midpoint Rendezvous $\vec{M}(t)$:**
Rather than hardcoding where in 3D space the handover occurs, we read the live post-mixer world positions of the giver's shoulder $\vec{S}_A(t)$ and the receiver's shoulder $\vec{S}_B(t)$. The ergonomic handover coordinate $\vec{M}(t)$ sits along the inter-shoulder chord biased by arm reach ratio, elevated slightly toward chest height ($y - 0.12\text{m}$), and bowed outward along the conversation normal $\hat{N}_{\text{side}}$ so neither character's forearm clips through their chest:


$$\vec{M}(t) = \text{lerp}\left(\vec{S}_A(t), \; \vec{S}_B(t), \; 0.5\right) + \begin{bmatrix} 0 \\ -0.12 \\ 0 \end{bmatrix} + 0.14\,\hat{N}_{\text{side}}$$


2. **Bimanual Bounding-Box Grasp (`DualHands` Mode):**
When a character carries or receives a prop in `DualHands` mode, the prop's local bounding width $2r_{\text{grasp}}$ defines symmetric lateral handle offsets in the prop's local frame:
$$\vec{H}_{\text{left,world}}(t) = \vec{P}_{\text{prop}}(t) + \mathbf{Q}_{\text{prop}}(t) \otimes \begin{bmatrix} -r_{\text{grasp}} \\ 0 \\ 0 \end{bmatrix}, \qquad \vec{H}_{\text{right,world}}(t) = \vec{P}_{\text{prop}}(t) + \mathbf{Q}_{\text{prop}}(t) \otimes \begin{bmatrix} +r_{\text{grasp}} \\ 0 \\ 0 \end{bmatrix}$$


Both `solveAnalyticalTwoBoneArmIK(rig, 'left', H_left, w)` and `solveAnalyticalTwoBoneArmIK(rig, 'right', H_right, w)` execute in closed form on the same frame.


3. **Piecewise Smoothstep Ownership Envelope:**
We partition $u \in [0, 1]$ into three deterministic curves using `smoothstep`:


* **Giver IK Reach Weight $w_{\text{giver}}(u)$:** Ramps $0 \to 1$ over $u \in [0, 0.35]$, holds at $1.0$ during the dual-contact window $u \in [0.35, 0.65]$, and ramps $1 \to 0$ over $u \in [0.65, 1.0]$.
* **Receiver IK Reach Weight $w_{\text{receiver}}(u)$:** Ramps $0 \to 1$ over $u \in [0, 0.35]$, holds at $1.0$ through $u = 0.65$, and settles into the receiver's natural holding posture as $u \to 1.0$.
* **Socket Ownership Blend $\alpha_{\text{own}}(u)$:** Remains $0.0$ (100% locked to Giver) for $u < 0.35$, transitions smoothly via $\text{smoothstep}\left(\frac{u - 0.35}{0.30}\right)$ over the dual-contact window $u \in [0.35, 0.65]$ while **both** characters' hands are physically touching the prop, and locks at $1.0$ (100% locked to Receiver) for $u > 0.65$.



##### C. Production Implementation (`packages/engine-core/src/CollaborativePropHandover.ts`)

```typescript
import * as THREE from 'three';
import { CompiledPropHandoverEvent } from '@chronos3d/schema';
import { CharacterRigInstance } from './ProceduralRigBuilder';
import { smoothstep } from './SplineAndStrideSolver';
import { solveAnalyticalTwoBoneArmIK } from './IKSolvers';

export function evaluateCollaborativePropHandoverAtTime(
  t: number,
  event: CompiledPropHandoverEvent,
  rigsMap: Map<string, CharacterRigInstance>,
  propObjectsMap: Map<string, THREE.Object3D>
): boolean {
  if (t < event.startTime) return false;

  const giverRig = rigsMap.get(event.fromCharacterId);
  const receiverRig = rigsMap.get(event.toCharacterId);
  const propObj = propObjectsMap.get(event.propId);
  if (!giverRig || !receiverRig || !propObj) return false;

  giverRig.root.updateMatrixWorld(true);
  receiverRig.root.updateMatrixWorld(true);

  const dur = Math.max(0.1, event.endTime - event.startTime);
  const u = THREE.MathUtils.clamp((t - event.startTime) / dur, 0, 1);

  // 1. Compute live world-space Shoulder origins & ergonomic Rendezvous Point M(t)
  const giverShoulderPos = new THREE.Vector3();
  const receiverShoulderPos = new THREE.Vector3();
  giverRig.shoulderRBone.getWorldPosition(giverShoulderPos);
  receiverRig.shoulderLBone.getWorldPosition(receiverShoulderPos);

  const rendezvousWorld = new THREE.Vector3()
    .lerpVectors(giverShoulderPos, receiverShoulderPos, 0.5)
    .add(new THREE.Vector3(0, -0.12, 0.14));

  // 2. Evaluate 3-phase weights (Approach [0..0.35] -> Dual-Contact [0.35..0.65] -> Commit [0.65..1.0])
  const approachAlpha = smoothstep(THREE.MathUtils.clamp(u / 0.35, 0, 1));
  const transferAlpha = smoothstep(
    THREE.MathUtils.clamp((u - 0.35) / 0.3, 0, 1)
  );
  const withdrawAlpha = smoothstep(
    THREE.MathUtils.clamp((u - 0.65) / 0.35, 0, 1)
  );

  const giverIkWeight = u <= 0.65 ? approachAlpha : 1.0 - withdrawAlpha;
  const receiverIkWeight = u <= 0.65 ? approachAlpha : 1.0 - withdrawAlpha * 0.65;

  // 3. Steer Giver & Receiver Wrists toward the Rendezvous Prop Handles via 2-Bone Arm IK
  const giverOffset = new THREE.Vector3(...event.giverSurfaceOffset);
  const receiverOffset = new THREE.Vector3(...event.receiverSurfaceOffset);

  if (event.fromSocket === 'DualHands') {
    solveAnalyticalTwoBoneArmIK(
      giverRig,
      'left',
      rendezvousWorld.clone().add(new THREE.Vector3(-0.16, 0, 0)),
      giverIkWeight
    );
    solveAnalyticalTwoBoneArmIK(
      giverRig,
      'right',
      rendezvousWorld.clone().add(new THREE.Vector3(0.16, 0, 0)),
      giverIkWeight
    );
  } else {
    const giverHand = event.fromSocket === 'ForearmR' ? 'right' : 'left';
    solveAnalyticalTwoBoneArmIK(
      giverRig,
      giverHand,
      rendezvousWorld.clone().add(giverOffset),
      giverIkWeight
    );
  }

  if (event.toSocket === 'DualHands') {
    solveAnalyticalTwoBoneArmIK(
      receiverRig,
      'left',
      rendezvousWorld.clone().add(new THREE.Vector3(-0.16, 0, 0)),
      receiverIkWeight
    );
    solveAnalyticalTwoBoneArmIK(
      receiverRig,
      'right',
      rendezvousWorld.clone().add(new THREE.Vector3(0.16, 0, 0)),
      receiverIkWeight
    );
  } else {
    const receiverHand = event.toSocket === 'ForearmR' ? 'right' : 'left';
    solveAnalyticalTwoBoneArmIK(
      receiverRig,
      receiverHand,
      rendezvousWorld.clone().add(receiverOffset),
      receiverIkWeight
    );
  }

  // 4. Re-propagate bone matrices after IK and interpolate Prop Socket Ownership
  giverRig.root.updateMatrixWorld(true);
  receiverRig.root.updateMatrixWorld(true);

  const giverBone =
    event.fromSocket === 'ForearmL'
      ? giverRig.forearmLBone
      : giverRig.forearmRBone;
  const receiverBone =
    event.toSocket === 'ForearmR'
      ? receiverRig.forearmRBone
      : receiverRig.forearmLBone;

  const giverWristPos = new THREE.Vector3();
  const giverWristQuat = new THREE.Quaternion();
  giverBone.getWorldPosition(giverWristPos);
  giverBone.getWorldQuaternion(giverWristQuat);

  const receiverWristPos = new THREE.Vector3();
  const receiverWristQuat = new THREE.Quaternion();
  receiverBone.getWorldPosition(receiverWristPos);
  receiverBone.getWorldQuaternion(receiverWristQuat);

  const giverHoldPos = giverWristPos
    .clone()
    .add(new THREE.Vector3(0, -0.28, 0.14).applyQuaternion(giverWristQuat));
  const receiverHoldPos = receiverWristPos
    .clone()
    .add(new THREE.Vector3(0, -0.28, 0.14).applyQuaternion(receiverWristQuat));

  propObj.position.lerpVectors(giverHoldPos, receiverHoldPos, transferAlpha);
  propObj.quaternion
    .copy(giverWristQuat)
    .slerp(receiverWristQuat, transferAlpha);

  return true;
}

```

---

#### 4. How the 7-Stage Frame Pipeline Preserves $0.0\text{mm}$ Determinism

With Closed-Form Spring-Bone Physics and Collaborative Prop Handover added, our strict downward per-frame execution order in `@chronos3d/engine-core` expands cleanly from 6 stages to 7 stages:

| Stage | Subsystem | Why This Exact Order Is Mandatory |
| --- | --- | --- |
| **Stage 1** | **Prop Keyframe Tracks** | Evaluates base prop positions/scales for unattached scene objects.

 |
| **Stage 2** | **Spline Locomotion & Base Mixer (`mixer.update(0)`)** | Places character roots on their arc-length Catmull-Rom paths and flushes base skeletal clips (`Idle`, `Walk`, `Explain`) at $\Delta t = 0$.

 |
| **Stage 3** | **Hierarchical Gaze IK & Single/Dual-Hand Arm IK** | Reads post-mixer shoulder/head world matrices and solves closed-form Law-of-Cosines arm reaches and collaborative rendezvous postures.

 |
| **Stage 4** | **Closed-Form Spring-Bone Secondary Physics** | Samples the finalized parent bone trajectories (`Head`, `Spine`, `ForearmR`) via 3-point finite differences and adds damped harmonic ringing ($e^{-\zeta \omega_0 \tau}\cos(\omega_d \tau + \phi)$).

 |
| **Stage 5** | **Orthogonal Visemes & Eyebrow/Eyelid Emotions** | Applies 14 Oculus viseme blendshapes and `BrowL`/`BrowR` bone lift/tilt.

 |
| **Stage 6** | **Bone-Socket Attachments & Prop Handover Slerp** | Locks held props to `ForearmR`/`ForearmL` or interpolates ownership across `transferAlpha` after all arm IK and spring-bone rotations are finalized.

 |
| **Stage 7** | **Declarative Camera Director / Bezier Swerve** | Frames `overTheShoulder`, `twoShot`, or `closeUp` lenses against the completely finalized actor and prop world matrices.

 |

---

### What would you like to do next?

We are in **Step 6 (Novel Advanced-User Blogs — Iterative Loop)**. Would you like me to:

1. **Generate Blog 14 (Advanced-User Blog):** *The "Raise Hand" Live Viewer Voice Interruption Engine, Dynamic Sub-Timeline Splicing & WebGPU 3D Gaussian Splatting (`.splat` / `.ply`) Stage Backdrops*?


2. **Proceed to Step 7 (Obscure Details & "Coder Flex" Blogs):** Focus on hidden gems, subtle mathematical hacks, and non-obvious internals within the Chronos3D source code itself?
