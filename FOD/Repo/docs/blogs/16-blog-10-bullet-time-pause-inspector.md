# Turn 16 — Blog 10: Bullet-Time Pause Inspector

*Source: `Latest From branched onward.md` — turn 16 of 18*

**User:**

yes

---

**AI:**

### Blog 10: Inside the "Bullet-Time" Pause Inspector — 6-DOF Free-Roam, Turntable Orbit & The Quadratic Bezier Camera Swerve

In a standard MP4 or pixel-diffusion video player, clicking **Pause** freezes a flat 2D grid of pixels. If a student watching a technical walkthrough wants to see the rear manifold of the **Quantum Core** or check where ARIA's hand is positioned relative to the console pad, they are out of luck—the camera angle is permanently baked into the raster stream.

Because **Chronos3D (`chronos-3d-studio`)** renders a live, deterministic 3D scene graph at 60 FPS, pausing the timeline clock ($t = t_{\text{pause}}$) only freezes *time*—not *space*. By handing viewport control over to an **Interactive "Bullet-Time" Pause Inspector** (`PauseInspectorCam.ts`, `usePauseInspector.ts`, `CameraDirectorAndPauseCam.ts`), viewers can fly around the frozen 3D stage with 6-DOF `WASD`/`QE` controls, click any character or prop for a 360° turntable orbit inspection, and then click **Resume** to trigger a **Slow-Mo Quadratic Bezier Camera Swerve** that arcs smoothly back into the moving Director Camera without losing a single millimeter of timeline determinism.

---

#### 1. The Four-State Camera & Clock Lifecycle (`CameraControlState`)

To coordinate the handoff between automated cinematography and user-driven spatial exploration, `@chronos3d/engine-core` and `@chronos3d/react-player` implement a four-state camera and clock state machine:

```text
               ┌────────────────────────────────────────────┐
               │              DIRECTOR_PLAYING              │
               │ • Timeline Clock: 1.0x                     │
               │ • Camera: Declarative Director (OTS/Dolly) │
               └──────────┬──────────────────────▲──────────┘
                          │ Click Pause          │ u = 1.0 (Locked In!)
                          ▼                      │
               ┌─────────────────────────────────┴──────────┐
               │              PAUSED_FREE_ROAM              │
               │ • Timeline Clock: 0.0x (Frozen at t_pause) │
               │ • WASD/Arrows pan XZ; Q/E slider sets Y    │
               │ • Spawns Amber Ghost Director Frustum      │
               └──────────┬──────────────────────┬──────────┘
     Raycast Click Asset  │                      │ Click Resume
                          ▼                      ▼
               ┌────────────────────┐  ┌────────────────────┐
               │ PAUSED_ORBIT_ASSET │  │  SNAPBACK_SWERVE   │
               │ • 360° Spherical   ├─►│ • Clock: 0.08x->1x │
               │   Turntable (θ,φ,r)│  │ • 3D Bezier Arc +  │
               │ • Test-Spin Asset  │  │   Dutch Banking    │
               └────────────────────┘  └────────────────────┘

```

| Engine State | Timeline Clock Rate | Camera Controller Behavior | Scene & Asset Consistency |
| --- | --- | --- | --- |
| **`DIRECTOR_PLAYING`** | `1.0x` (or user speed)

 | Driven 100% by the Declarative Camera Director (`twoShot`, `overTheShoulder`, `splineDolly`, `closeUp`).

 | Characters walk splines, crossfade skeletal clips, track gaze targets, and sync visemes.

 |
| **`PAUSED_FREE_ROAM`** | `0.0x` (Frozen at $t_{\text{pause}}$)

 | **WASD / Arrow Keys** translate along the horizontal plane; **Q / E** (or UI slider) adjust height from the ground ($y \in [0.15\text{m}, 12\text{m}]$); **Left-Drag** rotates Yaw & Pitch.

 | A glowing amber **Ghost Director Frustum** remains suspended in 3D space at the exact pose where the camera was paused.

 |
| **`PAUSED_ORBIT_ASSET`** | `0.0x` (Frozen at $t_{\text{pause}}$)

 | Raycasts pointer clicks against all 3D character bones, props, and floor geometry, smoothly dollying into a **Spherical Turntable Orbit** ($\theta, \phi, r$) centered on the clicked target.

 | If the user test-spins or elevates an asset while paused, its original transform is preserved in `pausedAssetSnapshotRef`.

 |
| **`SNAPBACK_SWERVE`** | Ramps $0.08\times \to 1.0\times$ over $1.35\text{s–}1.45\text{s}$<br> | Evaluates a **3D Quadratic Bezier Arc** $\vec{B}(u)$ with a **Dutch-Angle Banking Roll** ($\pm 14^\circ \sin(\pi u)$) and **FOV Warp** ($+12^\circ \sin(\pi u)$).

 | Inspected assets simultaneously slerp back to their exact deterministic timeline transform at $t$, guaranteeing zero state drift on resume.

 |

---

#### 2. 6-DOF Free-Roam & Spherical Turntable Orbit (`PauseInspectorCam.ts`)

When the viewer clicks **Pause**, `createInitialPauseCameraState()` (`packages/engine-core/src/PauseInspectorCam.ts`) initializes the observer camera at the exact world position $\vec{P}_{\text{director}}(t_{\text{pause}})$ and viewing direction of the active Director Camera so there is zero visual jump when entering pause mode:

```typescript
export function createInitialPauseCameraState(
  directorPos: THREE.Vector3,
  directorLookAt: THREE.Vector3
): PauseCameraState {
  const dir = new THREE.Vector3().subVectors(directorLookAt, directorPos).normalize();
  return {
    mode: 'FREE_ROAM',
    freeRoamPos: directorPos.clone(),
    freeRoamYaw: Math.atan2(dir.x, dir.z),
    freeRoamPitch: Math.asin(THREE.MathUtils.clamp(dir.y, -0.95, 0.95)),
    orbitTargetId: null,
    orbitCenter: directorLookAt.clone(),
    orbitRadius: Math.max(1.5, directorPos.distanceTo(directorLookAt)),
    orbitAzimuth: Math.atan2(
      directorPos.x - directorLookAt.x,
      directorPos.z - directorLookAt.z
    ),
    orbitElevation: 0.35
  };
}

```

At the exact same instant, the engine spawns a glowing amber wireframe **Ghost Director Frustum** (`GhostFrustumGizmo.ts`) in 3D space. As the viewer flies around the laboratory using `W/A/S/D` (horizontal plane translation) and `Q/E` (vertical elevation from ground level), they can see the suspended amber camera cone marking where the Director Camera is waiting for them.

If the viewer clicks directly on a character (ARIA or ZEPHYR), the **Quantum Core**, or any coordinate on the floor grid while paused, a `THREE.Raycaster` hit switches `state.mode` to `'ORBIT_ASSET'` and centers a spherical coordinate system $(\theta_{\text{azimuth}}, \phi_{\text{elevation}}, r_{\text{radius}})$ on that exact 3D point:

```typescript
const horiz = state.orbitRadius * Math.cos(state.orbitElevation);
const position = new THREE.Vector3(
  state.orbitCenter.x + Math.sin(state.orbitAzimuth) * horiz,
  Math.max(0.25, state.orbitCenter.y + state.orbitRadius * Math.sin(state.orbitElevation)),
  state.orbitCenter.z + Math.cos(state.orbitAzimuth) * horiz
);
return { position, lookAt: state.orbitCenter.clone() };

```

---

#### 3. Preserving Zero State Corruption When Manipulating Paused Assets

While orbiting a paused asset in `PAUSED_ORBIT_ASSET`, the viewer can even **test-spin or elevate the selected 3D prop** to inspect its underside or geometry. How do we allow interactive object manipulation during a pause without corrupting the deterministic timeline when playback resumes?

The secret lies in **additive inspection offsets** ($\Delta \theta_{\text{inspect}}, \Delta y_{\text{inspect}}$) applied *after* the deterministic timeline evaluation pass:

1. On every frame, the engine first computes the pure deterministic world transform $\vec{T}_{\text{deterministic}}(t)$ from the compiled timeline tracks.


2. While paused, the user's inspection rotation $\Delta \theta_{\text{inspect}}$ and vertical lift $\Delta y_{\text{inspect}}$ are layered on top of $\vec{T}_{\text{deterministic}}(t_{\text{pause}})$ as an additive post-pass.


3. During the `SNAPBACK_SWERVE` resume window ($u \in [0, 1]$), those additive offsets are multiplied by $(1 - u)$ and ramped smoothly back to $0$—guaranteeing that at $u = 1.0$, every bone, mesh, and prop lands on the exact millimeter required by the timeline.



---

#### 4. Mathematical Formulation of the Quadratic Bezier Camera Swerve

Suppose the viewer flew the observer camera across the room to $\vec{P}_{\text{inspect}}$ behind the containment pedestal, and now clicks **Resume**. Why not simply linearly interpolate (`lerp`) between $\vec{P}_{\text{inspect}}$ and the Director Camera $\vec{P}_{\text{director}}$?

A straight-line chord $\vec{D} = \vec{P}_{\text{director}} - \vec{P}_{\text{inspect}}$ between two opposite sides of the stage looks robotic and frequently slices straight through characters or the central pedestal standing in the middle of the room.

Instead, Chronos3D formulates a **3D Quadratic Bezier Crane Arc** $\vec{B}(u)$ over $u \in [0, 1]$:

$$\vec{B}(u) = (1 - u)^2 \vec{P}_{\text{inspect}} + 2(1 - u)u \vec{P}_{\text{apex}} + u^2 \vec{P}_{\text{director}}(t)$$

```text
                        Apex Control Point (P_apex)
                     Elevated + Offset Perpendicular to D
                                  ●
                                ╱   ╲
       Sweeping Crane Arc     ╱       ╲   Dutch Roll: ±14° sin(πu)
       B(u), u ∈ [0, 1]     ╱           ╲   Clock Rate: 0.08x ──► 1.0x
                          ╱               ▼
       Observer Camera  ●───────────────────● Moving Director Camera
         P_inspect          Straight Chord D     P_director(t)

```

To ensure the camera sweeps gracefully around and above stage obstacles, the **Apex Control Point** $\vec{P}_{\text{apex}}$ is constructed perpendicular to the horizontal chord $\hat{D}_{xz}$ and elevated along $+\hat{Y}$:

$$\vec{P}_{\text{apex}} = \frac{\vec{P}_{\text{inspect}} + \vec{P}_{\text{director}}}{2} + \left(\hat{Y} \times \hat{D}_{xz}\right) \cdot \left(0.38 \Vert{}\vec{D}\Vert{}\right) + \hat{Y} \cdot \left(0.22 \Vert{}\vec{D}\Vert{} + 0.45\right)$$

And inside `evaluateQuadraticBezierSnapback()` (`packages/engine-core/src/CameraDirectorAndPauseCam.ts`), we pair the Bezier position curve with a **centripetal Dutch-angle banking roll** ($\phi_{\text{roll}}(u) = \sin(\pi u) \cdot 11^\circ\text{ to }14^\circ$) so the camera banks into the turn like a physical FPV drone or Steadicam rig before leveling out at $0^\circ$ as $u \to 1$:

```typescript
export function evaluateQuadraticBezierSnapback(
  uRaw: number,
  startPos: THREE.Vector3,
  startLookAt: THREE.Vector3,
  targetDirectorPose: EvaluatedCameraPose
): { position: THREE.Vector3; lookAt: THREE.Vector3; dutchRollRad: number } {
  const u = smoothstep(uRaw);
  const midControl = new THREE.Vector3()
    .lerpVectors(startPos, targetDirectorPose.position, 0.5)
    .add(new THREE.Vector3(0, 1.15, 0.6));

  const oneMinusU = 1 - u;
  const position = new THREE.Vector3()
    .addScaledVector(startPos, oneMinusU * oneMinusU)
    .addScaledVector(midControl, 2 * oneMinusU * u)
    .addScaledVector(targetDirectorPose.position, u * u);

  const lookAt = new THREE.Vector3().lerpVectors(
    startLookAt,
    targetDirectorPose.lookAt,
    u
  );
  const dutchRollRad = Math.sin(u * Math.PI) * THREE.MathUtils.degToRad(11);

  return { position, lookAt, dutchRollRad };
}

```

---

#### 5. Moving Target Interception & Slow-Motion Time Dilation ($0.08\times \to 1.0\times$)

There is one final piece of magic in `usePauseInspector.ts` (`packages/react-player/src/hooks/usePauseInspector.ts`): what happens to the timeline clock during the $1.45\text{s}$ Bezier camera swerve?

If the timeline remained completely frozen ($0.0\times$) until the camera finished its $1.45\text{s}$ flight and then abruptly snapped to $1.0\times$ speed, the sudden velocity jump in character walking and speech would feel jarring. Instead, the moment **Resume** is clicked, the timeline clock begins advancing in **ultra-slow-motion ($0.08\times$)** and ramps smoothly up to **$1.0\times$ real time** across $u \in [0, 1]$:

```typescript
const evaluateSwerveProgress = useCallback(
  (nowMs: number, swerveDurationSec: number = 1.45): number => {
    const elapsedSec = (nowMs - swerveStartMsRef.current) / 1000;
    const u = Math.min(1, Math.max(0, elapsedSec / swerveDurationSec));
    // Smoothly ramp timeline clock from 0.08x slow-motion back to 1.0x real time
    onSetTimeScale(0.08 + 0.92 * u);
    if (u >= 1) {
      onSetTimeScale(1.0);
      setCameraMode('DIRECTOR_PLAYING');
    }
    return u;
  },
  [onSetTimeScale]
);

```

Because the timeline clock is already ticking forward during the swerve, the Director Camera pose $\vec{P}_{\text{director}}(t)$ is a **moving target** (for example, gliding along ARIA's `splineDolly` track). And because `evaluateQuadraticBezierSnapback()` evaluates `targetDirectorPose` at the **live timestamp $t$** on every frame of the swerve, the Quadratic Bezier endpoint $\vec{P}_2(t)$ tracks the moving Director Camera dynamically—allowing the observer camera to intercept the moving Steadicam rig with seamless $C^1$ velocity continuity at $u = 1.0$.

---

Are you ready to proceed to **Blog 11: From Live WebGL to Mastered MP4 — Dual-Canvas 2D+3D Compositing, Formant WebAudio & Faster-Than-Real-Time WebCodecs**?
