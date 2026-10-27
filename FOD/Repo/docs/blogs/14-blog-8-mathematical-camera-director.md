# Turn 14 — Blog 8: The Mathematical Camera Director

*Source: `Latest From branched onward.md` — turn 14 of 18*

**User:**

yes

---

**AI:**

### Blog 8: The Mathematical Camera Director — Automating Over-The-Shoulder Cuts, Dynamic Two-Shots & 180-Degree Continuity

In a 3D scene where characters walk along curved Catmull-Rom paths, lean their upper spines into 2-bone Arm IK reaches, and turn their heads dynamically via Gaze IK, **hardcoding `[x, y, z]` camera coordinates is a recipe for disaster**. If an 8B LLM tries to guess static world-space camera coordinates for an Over-The-Shoulder (OTS) shot while ARIA is walking across the stage, the camera will either point at empty floor grid or clip directly inside the back of ZEPHYR's skull.

**Chronos3D (`@chronos3d/engine-core`)** solves this by decoupling **narrative cinematographic intent** (*"frame an Over-The-Shoulder shot past Zephyr onto Aria using a 65mm lens, then hard-cut to a Reverse OTS onto Zephyr on `@line_3.start`"*) from **frame-by-frame 3D matrix math**. By running the **Declarative Camera Director** (`CameraDirectorAndPauseCam.ts`) as the final stage of the 60 FPS frame pipeline—*after* spline locomotion, skeletal animation, and post-mixer IK have updated every bone's world matrix—every camera shot tracks the live world positions of `ariaRig.headBone` and `zephyrRig.headBone` with zero manual keyframing.

---

#### 1. Enforcing the 180-Degree Cinematography Rule in Vector Space

In film theory, the **180-degree rule** establishes an imaginary axis—the **Line of Action**—between two interacting characters. Once the camera places itself on one side of that axis (say, the `"right"` side), every subsequent `twoShot` and `overTheShoulder` cut must remain on that same half-plane. If a reverse cut accidentally crosses over to the `"left"` side of the axis, the actors suddenly swap left-to-right screen positions, disorienting the viewer.

```text
               Top-Down Stage View: The 180-Degree Line of Action
═══════════════════════════════════════════════════════════════════════════
                     FORBIDDEN CAMERA ZONE (side: "left")
                                      │
      ARIA (P_A) ●────────────────────┼────────────────────● ZEPHYR (P_B)
   [-0.85, 0, 0.55]          Line of Action (L_vec)        [1.85, 0, 0.35]
                    ╲                 │                 ╱
                     ╲                │ N_side         ╱
                      ╲               ▼               ╱
         📷 Reverse OTS (Shot 3)      📷Two-Shot     📷 OTS on Aria (Shot 2)
        (Behind Aria's R Shoulder)    (Midpoint)     (Behind Zephyr's R Shoulder)
                     ACTIVE CAMERA HALF-PLANE (side: "right")

```

To guarantee 180-degree continuity mathematically at any timestamp $t$, `evaluateCameraDirectorAtTime()` (`packages/engine-core/src/CameraDirectorAndPauseCam.ts`) first queries the live world-space head coordinates $\vec{P}_A(t)$ (`ariaHeadPos`) and $\vec{P}_B(t)$ (`zephyrHeadPos`) and constructs an orthonormal basis on the horizontal $XZ$ plane:

1. **Horizontal Line of Action ($\hat{L}_{xz}$):**

$$\vec{L} = \vec{P}_B(t) - \vec{P}_A(t), \qquad \hat{L}_{xz} = \frac{(L_x, 0, L_z)}{\sqrt{L_x^2 + L_z^2}}$$



This unit vector always points horizontally from Actor A's head toward Actor B's head, even as Actor A walks along a curved spline.


2. **Perpendicular 180° Side Normal ($\hat{N}_{\text{side}}$):**
Rotating $\hat{L}_{xz}$ by $90^\circ$ in the horizontal plane and multiplying by the canonical side sign $s \in \{-1, +1\}$ (`side === 'left' ? -1 : 1`) yields the unit normal pointing into the allowed camera half-plane:



$$\hat{N}_{\text{side}} = s \cdot (-\hat{L}_z, \; 0, \; \hat{L}_x)$$



Here is how `CameraDirectorAndPauseCam.ts` computes this basis on every frame:

```typescript
const lineDir = new THREE.Vector3()
  .subVectors(zephyrHeadPos, ariaHeadPos)
  .setY(0)
  .normalize();
const sideSign = activeShot.side === 'left' ? -1 : 1;
const sideNormal = new THREE.Vector3(-lineDir.z, 0, lineDir.x)
  .multiplyScalar(sideSign)
  .normalize();

```

Because both `@chronos3d/compiler`'s Rule 4 sanitizer (`CAMERA_180_AXIS_LOCK`) and the vector basis lock `sideSign` across consecutive cuts, ARIA is guaranteed to stay on one side of the screen and ZEPHYR on the other throughout an entire conversation.

---

#### 2. The Five Declarative Shot Archetypes (`ShotType`)

Rather than exposing raw camera matrices to the 8B LLM, `@chronos3d/schema` defines five semantic `ShotType` archetypes—each paired with a calibrated focal length (`fov`) and geometric solver:

| Shot Archetype (`shotType`) | Vector Formulation (Evaluated Post-IK at Timestamp $t$) | Cinematographic Purpose & Lens (`fov`) |
| --- | --- | --- |
| **`twoShot`** (Dynamic Two-Shot) | Computes midpoint $\vec{M} = \frac{1}{2}(\vec{P}_A + \vec{P}_B)$ and actor separation $\Vert{}\vec{L}\Vert{}$. Places the camera along the 180° normal at $\vec{P}_{\text{cam}} = \vec{M} + \hat{N}_{\text{side}} \cdot d_{\text{two}}$, where $d_{\text{two}} = \max\left(d_{\min}, \frac{\Vert{}\vec{L}\Vert{} \cdot 1.35}{2 \tan(\text{fov}/2)}\right)$, aiming at $\vec{M} + (0, -0.12, 0)$.

 | Automatically pulls the camera back as actors walk apart so both remain framed on the left and right rule-of-thirds columns (`fov: 45°` / 50mm standard lens).

 |
| **`overTheShoulder`** (OTS / Reverse OTS) | Given `subjectId` ($\vec{P}_{\text{subj}}$) and foreground listener `secondaryId` ($\vec{P}_{\text{anchor}}$), computes unit axis $\hat{u} = \text{normalize}_{xz}(\vec{P}_{\text{subj}} - \vec{P}_{\text{anchor}})$. Places the camera behind the foreground listener at $\vec{P}_{\text{anchor}} - 1.15\hat{u} + 0.48\hat{N}_{\text{side}} + (0, -0.04, 0)$ and aims at $\text{lerp}(\vec{P}_{\text{anchor}}, \vec{P}_{\text{subj}}, 0.78)$.

 | Places the listener's head and shoulder in the near-field edge (22% frame weight) while isolating the speaking subject in the 78% rule-of-thirds column (`fov: 35°–36°` / 65mm lens).

 |
| **`splineDolly`** (`lead`, `follow`, `parallel`) | Queries the character's active `THREE.CatmullRomCurve3` at arc-length parameter $u(t)$ for position $\vec{P}(u)$, unit forward tangent $\hat{T}(u)$, and lateral right normal $\hat{R}(u) = (-\hat{T}_z, 0, \hat{T}_x)$. Places the camera at $\vec{P}_{\text{head}}(u) + d_{\text{long}}\hat{T}(u) + d_{\text{lat}}\hat{R}(u)$.

 | **`lead`**: Steadicam walking backward $2.2\text{m}$ ahead of the actor.

<br>

<br>**`parallel`**: Side-tracking dolly rail matching exact walking speed.

<br>

<br>**`follow`**: Over-the-back tracking shot (`fov: 42°–44°`).

 |
| **`closeUp`** (85mm Portrait Single) | Locks onto the target character's `headBone` world position at distance $1.65\text{m}$ angled $22^\circ$ off the conversation axis with rule-of-thirds eye-line headroom.

 | Isolates 14-viseme lip-sync, eyebrow emotion tilt, and binocular eye saccades during high-stakes technical lines (`fov: 28°` / 85mm portrait lens).

 |
| **`establishingOrbit`** | Orbits around the stage centroid or target asset at radius $R$ and angular velocity $\omega$, keeping the full laboratory deck and spline trajectories in frame.

 | Chapter openers, mid-video decision gates, and spatial orientation (`fov: 52°` / 35mm wide lens).

 |

---

#### 3. Inside the OTS & Spline-Dolly Math (`CameraDirectorAndPauseCam.ts`)

Let's examine how `evaluateCameraDirectorAtTime()` implements `splineDolly`, `twoShot`, and `overTheShoulder` in `packages/engine-core/src/CameraDirectorAndPauseCam.ts`:

```typescript
if (activeShot.shotType === 'splineDolly') {
  const tan = ariaSplineTangent.clone().setY(0).normalize();
  const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  position
    .copy(ariaHeadPos)
    .addScaledVector(tan, 2.2)
    .addScaledVector(right, 0.35);
  position.y = 1.68;
  lookAt.copy(ariaHeadPos).add(new THREE.Vector3(0, -0.1, 0));
} else if (activeShot.shotType === 'twoShot') {
  const mid = new THREE.Vector3().lerpVectors(ariaHeadPos, zephyrHeadPos, 0.5);
  const sep = ariaHeadPos.distanceTo(zephyrHeadPos);
  position.copy(mid).addScaledVector(sideNormal, Math.max(2.6, sep * 0.92));
  position.y = 1.55;
  lookAt.copy(mid).add(new THREE.Vector3(0, -0.12, 0));
} else {
  // Over-The-Shoulder (OTS) / Reverse OTS
  const isAriaSubj = activeShot.subjectId === 'actor_aria';
  const subj = isAriaSubj ? ariaHeadPos : zephyrHeadPos;
  const anchor = isAriaSubj ? zephyrHeadPos : ariaHeadPos;
  const aToS = new THREE.Vector3().subVectors(subj, anchor).setY(0).normalize();
  position
    .copy(anchor)
    .addScaledVector(aToS, -1.15)
    .addScaledVector(sideNormal, 0.48);
  position.y = anchor.y - 0.04;
  lookAt.lerpVectors(anchor, subj, 0.78);
}

```

Look closely at the **Over-The-Shoulder (`overTheShoulder`)** geometry:

* **Why `lookAt.lerpVectors(anchor, subj, 0.78)`?** If the camera aimed $100\%$ (`1.0`) at `subj`, the distant speaker would be dead-center in the frame and the foreground listener (`anchor`) would be pushed partly off the screen edge. Weighting the `lookAt` target $78\%$ toward the speaker (`subj`) and $22\%$ toward the foreground listener (`anchor`) while offsetting the camera laterally by $+0.48\text{m}$ along `sideNormal` places the foreground listener's head and shoulder cleanly on the outer third of the frame and the speaking subject on the opposite rule-of-thirds vertical line.


* **Why Reverse Cuts Are Symmetrical:** When `shot_2_ots_aria` (`subjectId: "actor_aria"`, `secondaryId: "actor_zephyr"`, `side: "right"`) switches to `shot_3_rev_ots_zephyr` (`subjectId: "actor_zephyr"`, `secondaryId: "actor_aria"`, `side: "right"`), `aToS` reverses direction while `sideNormal` continues pointing into the `"right"` camera zone—producing a textbook Hollywood Shot-Reverse-Shot cut.



---

#### 4. Scrub-Safe Shot Blending vs. Hard Cuts (`transitionDuration`)

A classic mistake in real-time 3D cinematography is smoothing all camera movements with a stateful exponential decay filter (`camera.position.lerp(targetPos, 0.05)`). That approach fails in two ways:

1. **Sweeping Through Skulls on OTS Cuts:** When cutting from an OTS shot behind Zephyr to a Reverse OTS shot behind Aria, a stateful `.lerp()` flies the camera straight across the stage between them—sweeping directly through the back of an actor's head.


2. **Broken Timeline Scrubbing:** Dragging the timeline playhead from $t = 15.0\text{s}$ back to $t = 4.0\text{s}$ causes a stateful `.lerp()` camera to lag behind and drift along an arbitrary trajectory depending on how fast the user dragged the slider.



In Chronos3D, every `SymbolicCameraShot` specifies an explicit `transitionDuration` ($\Delta t_{\text{trans}} \ge 0$) evaluated purely as a function of timestamp $t$:

* **Hard Cuts (`transitionDuration: 0.0`):** At `t === shot.startTime`, the camera switches instantaneously from Shot $k-1$ to Shot $k$ with zero intermediate frames—essential for clean dialogue editing between `overTheShoulder` and Reverse `overTheShoulder` shots.


* **Smooth Crane / Dolly Transitions (`transitionDuration > 0`):** When transitioning from an OTS shot into a wide `twoShot` (`transitionDuration: 1.2`), the director evaluates **both** the outgoing shot pose $S_{k-1}(t)$ and the incoming shot pose $S_k(t)$ at timestamp $t$, and interpolates their positions, `lookAt` vectors, and lens `fov` via `smoothstep`:



$$\alpha(t) = \text{smoothstep}\left(\frac{t - t_{\text{start}}}{\Delta t_{\text{trans}}}\right)$$

$$\vec{P}_{\text{cam}}(t) = \text{lerp}\left(\vec{P}_{k-1}(t), \; \vec{P}_k(t), \; \alpha(t)\right), \qquad \text{fov}(t) = \text{lerp}\left(\text{fov}_{k-1}, \; \text{fov}_k, \; \alpha(t)\right)$$

Because $\alpha(t)$ is a pure function of $t$, scrubbing backward or forward through the middle of a $1.2\text{s}$ crane transition places the camera and focal length at the exact same millimeter and degree every single time.

---

#### 5. The Picture-in-Picture (PiP) Overhead Director's Crane Monitor

To give human directors and AI engineers complete visibility into what the virtual camera crew is doing, the studio (`OverheadCranePiP.ts` / `apps/studio-web`) supports an overhead **Stage Editor / Director's Crane View** alongside the main cinema viewport:

* It renders a live 3D wireframe camera frustum (`THREE.CameraHelper`), the **180° Line of Action laser axis** connecting ARIA and ZEPHYR, the **red $0.72\text{m}$ pedestal keep-out ring**, and the **cyan Catmull-Rom spline ribbons**.


* Watching both views side-by-side lets you see the `CameraHelper` frustum glide backward ahead of ARIA during `shot_1_lead_walk`, snap behind ZEPHYR's right shoulder on `@line_2.start`, and snap behind ARIA's right shoulder on `@line_3.start`—all while remaining strictly on the safe side of the 180-degree line.



---

Are you ready to proceed to **Blog 9: Branching Without Jump Cuts — Stateful DAG Narratives, Dynamic Spline Stitching & 3D Bone-Socket Inventories**?
