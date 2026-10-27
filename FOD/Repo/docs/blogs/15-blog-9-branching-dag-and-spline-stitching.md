# Turn 15 — Blog 9: Branching DAG & Dynamic Spline Stitching

*Source: `Latest From branched onward.md` — turn 15 of 18*

**User:**

yes

---

**AI:**

### Blog 9: Branching Without Jump Cuts — Stateful DAG Narratives, Dynamic Spline Stitching & 3D Bone-Socket Inventories

In traditional pre-rendered interactive video (think *Bandersnatch* or FMV games), every narrative branch is an exercise in hiding seams. Because video clips are static MP4 files baked ahead of time, characters must either return to a rigid neutral starting mark before every decision prompt, or the director has to mask the branch transition behind a jarring jump cut. Worse yet, if a viewer chooses to pick up a key item in Chapter 1, the studio must pre-render two completely separate versions of Chapters 2, 3, and 4—one where the actor is holding the object, and one where their hands are empty.

In **Chronos3D (`chronos-3d-studio`)**, branching a 3D timeline without breaking spatial continuity or suffering combinatorial scene explosion is solved by upgrading the player from a linear manifest runner into a **Stateful Directed Acyclic Graph (DAG) Scene Engine** (`DynamicSplineStitcher.ts`, `BoneSocketManager.ts`, `useWorldStateDAG.ts`).

---

#### 1. The Four Pillars of Multi-Chapter Spatial Continuity

When transitioning from Chapter 1 (`ch1_core_inspection`) into Branch 2A (`ch2a_extract_core`) or Branch 2B (`ch2b_remote_scan`), and then converging into Chapter 3 (`ch3_convergence_finale`), four subsystems work in concert to preserve seamless 3D state:

```text
               Chapter 1 (ch1_core_inspection)
        ARIA stops at [-0.85, 0, 0.55] beside Pedestal
                              │
                ┌─────────────┴─────────────┐
                ▼ (Choice 1: Extract Core)  ▼ (Choice 2: Remote Shield)
   ┌─────────────────────────┐ ┌─────────────────────────┐
   │ Branch 2A               │ │ Branch 2B               │
   │ • Equips holo_core to   │ │ • Grants telemetry_cipher│
   │   actor_aria.ForearmR   │ │ • Walks to [1.1, 0, 0.9]│
   │ • Ends at [-0.2,0,-0.8] │ │   beside Console        │
   └────────────┬────────────┘ └────────────┬────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼ (inheritStartPose: true)
               Chapter 3 (ch3_convergence_finale)
   • DynamicSplineStitcher prepends live [x,y,z] as Waypoint 0!
   • BoneSocketManager keeps holo_core locked to ForearmR if equipped!

```

1. **Dynamic Spline Stitching (`inheritStartPose: true`):** Reads a character's live $[x, y, z]$ world position $\vec{P}_{\text{current}}$ from the Three.js registry at the moment a branch loads and prepends it as **Waypoint 0** of the incoming Catmull-Rom curve.


2. **3D Bone-Socket Prop Persistence (`BoneSocketManager.ts`):** Locks acquired 3D props (such as `holo_core`) directly onto a character's animated `ForearmR`, `ForearmL`, or `Spine` bone world matrix across chapters.


3. **Inventory-Gated Mid-Video Decision Cards (`DecisionCardModal.tsx`):** Freezes the timeline clock at `decision.triggerTime` into a $0.0\times$ cinematic idle orbit while keeping character breathing, eye saccades, and orbital camera drift alive at 60 FPS, dynamically unlocking secret downstream branches via `requiredItemId` and `requiredFlag`.


4. **$O(1)$ Checkpoint Snapshot Time-Travel (`WorldCheckpointSnapshot`):** Serializes the complete world state (`inventory`, `flags`, `socketAttachments`, `characterPoses`) in under 1 KB of JSON at each chapter boundary so viewers can click any historical node in the **Interactive Branch Graph** to rewind both 3D transforms and inventory state instantaneously.



---

#### 2. Eliminating Jump Cuts with Dynamic Spline Stitching (`DynamicSplineStitcher.ts`)

Consider the convergence problem in **Chapter 3 (`ch3_convergence_finale`)**:

* If the viewer chose **Branch 2A (Extract the Core)**, ARIA finishes Chapter 2 standing beside the central containment pedestal at `[-0.2, 0, -0.8]`.


* If the viewer chose **Branch 2B (Run Remote Diagnostics)**, ARIA finishes Chapter 2 standing over at ZEPHYR's tactical console at `[1.1, 0, 0.9]`.



If Chapter 3 hardcoded its first spline waypoint at `[0.2, 0, 1.4]`, ARIA would instantaneously teleport across the laboratory floor the millisecond Chapter 3 began. Conversely, forcing an 8B LLM or human author to write $2^N$ duplicate versions of Chapter 3 for every possible incoming character coordinate would cause combinatorial explosion.

Instead, the author or 8B LLM simply sets `"inheritStartPose": true` on Chapter 3's spline segment:

```json
{
  "id": "track_ch2_aria_spline",
  "label": "Aria Stitched Walk to Console",
  "targetId": "actor_aria",
  "property": "splinePath",
  "segments": [
    {
      "id": "seg_ch2_stitch",
      "startTime": "@line_1.start",
      "endTime": "@line_1.word(\"console\") + 0.2",
      "inheritStartPose": true,
      "strideLength": 1.25,
      "waypoints": [
        [0.2, 0, 1.4],
        [1.1, 0, 0.7]
      ]
    }
  ]
}

```

When the chapter loads, `stitchBranchSplineWaypoints()` (`packages/engine-core/src/DynamicSplineStitcher.ts`) inspects `inheritStartPose` and queries ARIA's live or persisted $[x, y, z]$ coordinate `(px, py, pz)`:

```typescript
export function stitchBranchSplineWaypoints(
  rawWaypoints: Vector3Tuple[],
  inheritStartPose: boolean | undefined,
  liveOrPersistedPosition?: Vector3Tuple
): {
  stitchedWaypoints: Vector3Tuple[];
  curve: THREE.CatmullRomCurve3;
  totalLength: number;
} {
  const waypoints: Vector3Tuple[] = rawWaypoints.map((w) => [w[0], w[1], w[2]]);

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

  const { curve, totalLength } = buildArcLengthCatmullRom(waypoints);
  return {
    stitchedWaypoints: waypoints,
    curve,
    totalLength
  };
}

```

Look at the distance threshold check (`horizontalDist > 0.15`):

* If ARIA's live position $\vec{P}_{\text{current}} = (p_x, p_y, p_z)$ is more than $15\text{cm}$ away from the authored first waypoint `(fx, fz)`, `waypoints.unshift([px, py, pz])` prepends her exact standing mark as **Waypoint 0** (`[P_current, ...branchWaypoints]`).


* If she is already within $15\text{cm}$ of Waypoint 0, it overwrites `waypoints[0] = [px, py, pz]` in place so `THREE.CatmullRomCurve3` doesn't create a microscopic zero-length pinch knot at the start of the spline.
* Finally, `buildArcLengthCatmullRom(waypoints)` rebuilds the 250-division cumulative arc-length Look-Up Table (`curve.updateArcLengths()`) and updates `totalLength`. Because our stride solver (`evaluateSplineLocomotionAtTime`) locks footstep phase to $\phi_{\text{stride}} = d(t) / L_{\text{stride}}$ and finishes on `@line_1.word("console") + 0.2`, ARIA walks smoothly from whichever branch she came from and arrives at the console on the exact spoken word `"console"`.



---

#### 3. 3D Bone-Socket Prop Persistence (`BoneSocketManager.ts`)

In a 2D UI, "picking up an item" just pushes an icon into an array. In a 3D scene graph, if the viewer selects **"Equip Quantum Core in Right Gauntlet"**, the spinning 3D torus-knot mesh (`holo_core`) on the containment pedestal must physically detach from the pedestal, shrink to handheld gauntlet scale, and stay locked to ARIA's right forearm (`ForearmR`) as she walks, gestures, and branches into future chapters.

In `@chronos3d/schema` (`world-state.types.ts`), persistent socket ownership is modeled via `SocketAttachment` inside `PersistentWorldState`:

```typescript
export interface SocketAttachment {
  propId: string;
  characterId: string;
  boneSocket: 'ForearmR' | 'ForearmL' | 'Spine';
  localOffset: Vector3Tuple;
  localScale: Vector3Tuple;
}

```

Why don't we reparent `holoCoreMesh` directly via `ariaRig.forearmRBone.add(holoCoreMesh)` inside the Three.js scene graph?

* If you mutate the Three.js parent-child hierarchy during chapter playback, scrubbing backward or restoring a historical checkpoint before the item was picked up requires fragile scene-graph reparenting and matrix-inverse math.
* Instead, `holoCoreMesh` remains a top-level citizen of `AssetRegistry`. During **Stage 5** of the 60 FPS render loop—right after `mixer.update(0)` and 2-bone Arm IK have finalized `forearmRBone`'s world matrix—`applyBoneSocketAttachments()` (`packages/engine-core/src/BoneSocketManager.ts`) locks any attached prop directly to its target bone's world position and quaternion:



```typescript
export function applyBoneSocketAttachments(
  attachments: SocketAttachment[],
  rigsMap: Map<string, CharacterRigInstance>,
  propObjectsMap: Map<string, THREE.Object3D>
): void {
  attachments.forEach((att) => {
    const rig = rigsMap.get(att.characterId);
    const propObj = propObjectsMap.get(att.propId);
    if (!rig || !propObj) return;

    rig.root.updateMatrixWorld(true);
    const socketBone =
      att.boneSocket === 'ForearmR'
        ? rig.forearmRBone
        : att.boneSocket === 'ForearmL'
        ? rig.forearmLBone
        : rig.spineBone;

    const boneWorldPos = new THREE.Vector3();
    const boneWorldQuat = new THREE.Quaternion();
    socketBone.getWorldPosition(boneWorldPos);
    socketBone.getWorldQuaternion(boneWorldQuat);

    const worldOffset = new THREE.Vector3(...att.localOffset).applyQuaternion(
      boneWorldQuat
    );
    propObj.position.copy(boneWorldPos).add(worldOffset);
    propObj.quaternion.copy(boneWorldQuat);
    propObj.scale.set(...att.localScale);
  });
}

```

Let's trace the transform math:


$$\vec{P}_{\text{prop}}(t) = \vec{P}_{\text{bone,world}}(t) + \mathbf{Q}_{\text{bone,world}}(t) \otimes \vec{\Delta}_{\text{local}}, \qquad \mathbf{Q}_{\text{prop}}(t) = \mathbf{Q}_{\text{bone,world}}(t)$$

Because `worldOffset` (`localOffset: [0, -0.3, 0.16]`) is rotated by `boneWorldQuat`, the Quantum Core sits naturally in ARIA's palm $30\text{cm}$ down the forearm bone axis and $16\text{cm}$ forward—swinging naturally with her arm as she walks along Chapter 2's stitched spline or waves to ZEPHYR.

---

#### 4. Stateful DAG Gating & $O(1)$ Checkpoint Time-Travel (`useWorldStateDAG.ts`)

How does an 8B LLM author a decision gate that mutates world state and unlocks secret downstream choices?

In our multi-chapter JSON schema (`SymbolicMultiChapterSceneManifest`), each `ChapterNode` ends with an optional `decision` object whose `triggerTime` is bound to a symbolic anchor such as `"@line_3.end + 0.2"`:

```json
"decision": {
  "id": "dec_ch1_core",
  "triggerTime": "@line_3.end + 0.2",
  "promptTitle": "CONTAINMENT PROTOCOL",
  "promptSubtitle": "How should Aria handle the destabilizing Quantum Core?",
  "timeoutSeconds": 15,
  "choices": [
    {
      "id": "choice_grab_core",
      "label": "Equip Quantum Core in Right Gauntlet",
      "description": "Attaches holo_core to Aria's ForearmR bone and branches to Chapter 2A.",
      "targetChapterId": "ch2a_equipped_walk",
      "requiredItemId": null,
      "effects": {
        "addItem": {
          "id": "quantum_core_item",
          "name": "Unstable Quantum Core",
          "color": "#f43f5e",
          "description": "Contained Tokamak Core held in Aria's right hand"
        },
        "attachAssetToBone": {
          "assetId": "holo_core",
          "characterId": "actor_aria",
          "boneName": "ForearmR"
        },
        "mutateAssetColor": {
          "assetId": "holo_core",
          "color": "#f43f5e"
        }
      }
    }
  ]
}

```

In `@chronos3d/react-player` (`packages/react-player/src/hooks/useWorldStateDAG.ts`), `useWorldStateDAG` manages both choice gating and historical checkpoint snapshots:

```typescript
const isChoiceUnlocked = useCallback(
  (choice: DecisionChoice): boolean => {
    if (choice.requiredItemId) {
      const hasItem = worldState.inventory.some(
        (i) => i.id === choice.requiredItemId
      );
      if (!hasItem) return false;
    }
    if (choice.requiredFlag && !worldState.flags[choice.requiredFlag]) {
      return false;
    }
    return true;
  },
  [worldState.inventory, worldState.flags]
);

```

And whenever `applyChoiceAndBranch(choice)` executes, it clones `PersistentWorldState`, applies the item/flag/bone-socket mutations, and appends an immutable `WorldCheckpointSnapshot` to `checkpoints`:

```typescript
const restoreCheckpoint = useCallback((index: number) => {
  setCheckpoints((prev) => {
    const target = prev[index];
    if (target) {
      setWorldState(JSON.parse(JSON.stringify(target.state)));
    }
    return prev.slice(0, index + 1);
  });
}, []);

```

Because `WorldCheckpointSnapshot` is less than 1 KB of pure JSON (`currentChapterId`, `inventory`, `flags`, `socketAttachments`, `characterPoses`) and the 3D engine evaluates poses purely as a function of timestamp $t$, clicking any historical node in the **Interactive Branch Graph** rewinds a multi-hour interactive course or story to that exact spatial, bone-socket, and inventory state in $O(1)$ time.

---

Are you ready to proceed to **Blog 10: Inside the "Bullet-Time" Pause Inspector — 6-DOF Free-Roam, Turntable Orbit & The Quadratic Bezier Camera Swerve**?
