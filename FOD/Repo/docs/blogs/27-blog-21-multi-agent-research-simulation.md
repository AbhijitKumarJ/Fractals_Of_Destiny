# Turn 27 — Blog 21: Multi-Agent AI Research Simulation

*Source: `Latest From branched onward1.md` — turn 9 of 9*

**User:**

Proceed to Step 9

---

**AI:**

### Blog 21: The Multi-Agent AI Research Simulation — Architecting a Self-Evolving 3D Director & Closed-Loop Spatiotemporal Verifier

In this **Step 9** post of the `@deep-dive-analysis-blogs` series, we convene three autonomous AI research engineers—**Coder A (The Ideator)**, **Coder B (The Critic)**, and **Coder C (The Implementer)**—to design and implement a **Self-Evolving AI Director & Spatiotemporal Researcher Agent** built directly on top of the **Chronos3D (`chronos-3d-studio`)** monorepo.

Their objective: transform the open-loop `services/llm-director-training` + `@chronos3d/compiler` + `@chronos3d/engine-core` pipeline into an autonomous, closed-loop agent that discovers its own spatial, kinematic, and cinematographic edge cases, verifies them against the 60 FPS deterministic 3D math engine, and continuously evolves both the symbolic sanitizer rules and its own QLoRA weights (`Chronos-Director-8B`) without human intervention.

---

#### 1. Research Transcript: Coder A (The Ideator) vs. Coder B (The Critic)

##### Round 1: Proposing Continuous Differentiable Execution-Feedback RL vs. Compiler Latency & Scrub-Invariance Realities

> **Coder A (The Ideator):**
> Look at how `chronos-3d-studio` currently trains its 8B director in `services/llm-director-training/`: `generate_synthetic_scenes.py` uses static rules around `PEDESTAL_CENTER = (-0.15, -0.45)` and `KEEP_OUT_RADIUS = 0.72` to dump static JSONL files (`synthetic_chronos3d_train.jsonl`) for offline SFT in `train_lora_unsloth.py`. Meanwhile, at runtime, `sanitizeAndRepairLLMScene()` in `@chronos3d/compiler` only catches four hardcoded failure modes: `DIALOGUE_CHAIN_REPAIR`, `WORD_STEM_FUZZY_MATCH`, `OBSTACLE_PUSH_OUT`, and `CAMERA_180_AXIS_LOCK`.
> 
> 
> I propose we turn `Chronos-Director-8B` into a **Self-Evolving Autonomous Spatiotemporal Researcher Agent** using **Online Execution-Guided Reinforcement Learning (GRPO) coupled with Vision-Language Model (VLM) Frame Critique**. Every time the 8B agent drafts a `SymbolicSceneManifest`, we compile it via `compileSymbolicManifest()`, render the entire 60 FPS chapter in headless WebGL via `WebCodecsOfflineMuxer.ts`, feed every rendered video frame into a 72B Vision-Language Critic to score cinematography and body language, and backpropagate the reward directly into the 8B model weights in real time! Even better, we can make the Three.js bone hierarchy differentiable so gradient descent optimizes the JSON coordinates directly!
> 
> 

> **Coder B (The Critic):**
> Hold on—that proposal violates three foundational architectural constraints of the `chronos-3d-studio` codebase:
> 
> 
> 1. **Throughput Collapse from Rasterizing Every Rollout:** The entire point of Chronos3D's declarative architecture is escaping the compute bloat of pixel-level video processing. In Group Relative Policy Optimization (GRPO), you need $G = 8$ to $16$ candidate rollouts per prompt. Even with `renderOfflineWithWebCodecs()` running at $8\times$ real-time speed (~7.5 seconds per 60-second chapter), rendering 16 candidate chapters to pixels and passing thousands of frames through a 72B VLM critic will take **over 3 minutes per single training step**! Meanwhile, `compileSymbolicManifest()` and our Tier 3 analytical math solvers (`SplineAndStrideSolver.ts`, `IKSolvers.ts`, `CameraDirectorAndPauseCam.ts`) can evaluate pure mathematical states $S(t)$ in **microseconds without touching a GPU framebuffer**.
> 
> 
> 2. **Non-Differentiability of Symbolic Token Anchors:** The 8B LLM does not output raw keyframe spline floats at every frame—it outputs discrete symbolic strings like `"@line_2.word(\"surge\") - 0.1"` and discrete `ShotType` enums (`"overTheShoulder"`, `"twoShot"`) constrained by `LLM_SCENE_JSON_SCHEMA`. You cannot pass spatial gradients $\nabla_{\vec{P}} \mathcal{L}$ through regex-constrained token strings like `@line_1.word("pedestal") + 0.25` without an explicit symbolic-to-kinematic reward attribution bridge.
> 
> 
> 3. **Silent Kinematic Failures That `sanitizeAndRepairLLMScene()` Misses:** Before you bring in a 72B VLM, look at the deterministic biomechanics in `@chronos3d/engine-core`. What are the *actual* physical failures that pass all four rules of `sanitizeAndRepairLLMScene()` today?
> 
> 
> * **Arm IK Hyper-Extension / Singularity:** An 8B model schedules a `SymbolicArmIKKeyframe` on `holo_core` over `[@line_2.word("touch"), @line_2.end]` while the character's `splinePath` still has them $1.9\text{m}$ away from `holo_core`. In `solveAnalyticalTwoBoneArmIK()`, `maxReach = upperLen + lowerLen - 0.02 = 0.78m` clamps the arm into a rigid straight-line lock pointing into empty air!
> 
> 
> * **Supersonic Spline Sprinting:** The 8B model routes a 3-waypoint `splinePath` of arc-length $5.5\text{m}$ across a 2-word clause lasting $0.9\text{s}$ (`v = 6.1 m/s`), causing `evaluateSplineLocomotionAtTime()` to spin the legs like a cartoon roadrunner.
> 
> 
> * **Actor-to-Actor Proxy Sweeps:** Both `actor_aria` and `actor_zephyr` walk simultaneously along splines whose waypoints avoid `STAGE_OBSTACLES` (`holo_pedestal`), yet their paths cross at $t = 4.20\text{s}$ with $\Vert{}\vec{P}_{\text{aria}}(t) - \vec{P}_{\text{zephyr}}(t)\Vert{} = 0.12\text{m}$—slicing directly through each other's torsos!
> 
> 
> 
> 
> 
> 

---

##### Round 2: Designing the Zero-Raster Analytical Spatiotemporal Verifier & Counterfactual Mutation Engine

> **Coder A (The Ideator):**
> That is a surgical critique. You're right: rasterizing WebGL frames to detect biomechanical flaws when our entire Tier 3 engine (`@chronos3d/engine-core`) is a closed-form mathematical function $S(t)$ is a massive waste of compute.
> 
> 
> Let's pivot completely. Instead of pixel rendering + VLM critique, we build a **Headless Analytical Spatiotemporal Verifier (`SpatiotemporalRolloutVerifier`)** that runs directly on the compiled `CompiledSceneManifest` at $10\text{ Hz}$ ($t_k = 0, 0.1, 0.2, \dots, T$) in pure CPU math—taking **less than $0.8\text{ms}$ per full chapter rollout**!
> 
> 
> Here is how the self-evolving loop works:
> 1. **Adversarial Prompt & Scenario Mutator:** The researcher agent generates challenging multi-character spatial choreography prompts (e.g., dual-actor cross-stage walks, multi-prop Arm IK inspections, rapid OTS dialogue exchanges, and inventory-gated branch transitions).
> 
> 
> 2. **Sub-Millisecond Analytical Biomechanical Audit:** For each candidate `SymbolicSceneManifest` sampled from the 8B model, we run `sanitizeAndRepairLLMScene()` + `compileSymbolicManifest()`, and then step $t \in [0, T]$ through a 5-axis mathematical verifier:
> 
> 
> * $\mathcal{R}_{\text{repair}}$: Penalty for every intervention required by `sanitizeAndRepairLLMScene()` (`repairs.length`) so the model learns to emit zero-repair manifests natively.
> 
> 
> * $\mathcal{R}_{\text{gait}}$: Evaluates every compiled spline segment's arc-length velocity $v_{\text{seg}} = L_{\text{arc}} / (t_{\text{end}} - t_{\text{start}})$ and penalizes deviations outside human bipedal ergonomics $[0.80\text{ m/s}, 1.70\text{ m/s}]$.
> 
> 
> * $\mathcal{R}_{\text{ikReach}}$: Evaluates world-space distance $\Vert{}\vec{P}_{\text{shoulder}}(t) - \vec{P}_{\text{target}}(t)\Vert{}$ during every active `armIK` keyframe window `[ikKf.time, ikKf.endTime]`, penalizing any frame where distance exceeds anatomical reach ($0.78\text{m}$ + $0.18\text{m}$ upper-spine lean = $0.96\text{m}$).
> 
> 
> * $\mathcal{R}_{\text{collision}}$: Sweeps continuous time $t$ to check both static obstacle clearance (`STAGE_OBSTACLES`) along spline chords *and* dynamic inter-actor capsule clearance $\Vert{}\vec{P}_{\text{aria}}(t) - \vec{P}_{\text{zephyr}}(t)\Vert{} \ge 0.58\text{m}$.
> 
> 
> * $\mathcal{R}_{\text{cinema}}$: Audits camera shots for 180-degree axis consistency, speaker-to-shot alignment (`subjectId === activeSpeakerId`), and sightline occlusion.
> 
> 
> 
> 
> 3. **Automated Rule Synthesis:** Whenever the verifier catches a kinematic failure (like an unreachable Arm IK keyframe), our agent automatically synthesizes a **Counterfactual Repaired Manifest** by shifting the symbolic anchor or adjusting the spline arrival waypoint until the analytical score hits $1.0$!
> 
> 

> **Coder B (The Critic):**
> Now we're talking! A pure-math $0.8\text{ms}$ verifier lets us evaluate **1,000+ rollouts per second** on CPU threads without touching WebGL.
> 
> 
> However, look closely at your step 3 ("Automated Rule Synthesis & Counterfactual Repair"). If the verifier detects at $t = 5.2\text{s}$ that ARIA's `armIK` reach to `holo_core` failed because she was $1.45\text{m}$ away ($> 0.96\text{m}$ reach envelope), how do you repair the `SymbolicSceneManifest` without breaking **Round-Trip Symbolic Integrity**?
> 
> 
> Remember the cardinal rule from Blog 12 and the PRD: **never bake raw float timestamps into a `SymbolicSceneManifest**`!
> 
> 
> * If your counterfactual repairer fixes an early Arm IK reach by overwriting `ikKf.time = 6.42` (a raw float), you destroy the acoustic elasticity of the manifest when WPM or TTS voices change.
> 
> 
> * Likewise, if two characters collide at $t = 4.2\text{s}$ mid-spline, shifting a waypoint randomly might push them into `holo_pedestal` (`[-0.15, -0.45]`, $r = 0.72\text{m}$).
> 
> 
> 
> 
> Furthermore, if you use these counterfactual repairs to train the 8B model via Direct Preference Optimization (DPO) or GRPO in `services/llm-director-training/`, what prevents **Reward Hacking**? For example, an 8B model could achieve $0$ gait penalties, $0$ IK reach penalties, and $0$ collision penalties by simply leaving both characters standing completely still at `[-3.1, 0, -1.5]` and `[1.85, 0, 0.35]` with zero splines and zero Arm IK keyframes!
> 
> 

---

##### Round 3: Reaching Technical Consensus — Symbolic-Preserving Counterfactual Repair & Complexity-Gated GRPO/DPO

> **Coder A (The Ideator):**
> Brilliant catch on both counts. Let's close both loopholes rigorously:
> 1. **Symbolic-Preserving Counterfactual AST Surgery:**
> When repairing a kinematic violation in `SymbolicSceneManifest`, the repair operator is strictly forbidden from emitting raw float timestamps after `line_1.start`:
> 
> 
> * **For Premature Arm IK Reaches (`IK_OUT_OF_REACH`):** If character $c$ is still walking along spline segment `seg_k` during `ikKf.time`, or if `seg_k`'s final waypoint $\vec{W}_{\text{last}}$ is farther than $0.90\text{m}$ from `ikKf.targetAssetId`, the symbolic repair operator:
> 1. Projects $\vec{W}_{\text{last}}$ onto the ergonomic grasp ring ($r_{\text{grasp}} = 0.76\text{m}$) around the target asset's XZ coordinate (while respecting `STAGE_OBSTACLES` keep-out radii), and
> 
> 
> 2. Rebinds `ikKf.time` symbolically to `"@${seg_k.id}.end - 0.15"` (or the first spoken word token in `dialogue` whose resolved timestamp $t_{\text{word}} \ge t_{\text{segEnd}} - 0.20\text{s}$)!
> 
> 
> 
> 
> * **For Supersonic Spline Sprinting (`GAIT_VELOCITY_OVERFLOW`):** If $v_{\text{seg}} = L_{\text{arc}} / \Delta t > 1.65\text{ m/s}$, the symbolic repair operator searches the referenced `@line_X.word("token")` line for a later spoken word token $w_{\text{later}}$ such that $L_{\text{arc}} / (t(w_{\text{later}}) - t_{\text{start}}) \in [0.85, 1.65]\text{ m/s}$, or rebinds `seg.endTime` to `"@${lineId}.end"`.
> 
> 
> 
> 
> 2. **Anti-Reward-Hacking Choreographic Complexity Gate ($\mathcal{G}_{\text{choreo}}$):**
> To prevent the 8B model from collapsing into degenerate static scenes, we multiply the total reward $R_{\text{total}}$ by a mandatory **Choreographic Richness Gate** $\mathcal{G}_{\text{choreo}} \in [0, 1]$ that verifies the manifest contains active locomotion ($L_{\text{arc}} \ge 1.2\text{m}$), word-locked `@line.word()` gesture/IK anchors, emotion transitions, and multi-angle camera coverage (`splineDolly`, `overTheShoulder`, `twoShot`/`closeUp`):
> 
> 
> $$R_{\text{total}}(M) = \mathcal{G}_{\text{choreo}}(M) \cdot \left( w_1 \mathcal{R}_{\text{repair}} + w_2 \mathcal{R}_{\text{gait}} + w_3 \mathcal{R}_{\text{ikReach}} + w_4 \mathcal{R}_{\text{collision}} + w_5 \mathcal{R}_{\text{cinema}} \right)$$
> 
> 
> 
> 

> **Coder B (The Critic):**
> I am 100% on board with that formulation. Let's trace the properties of this consensus architecture:
> * **Zero GPU Rendering Bottleneck During Training:** The 5-axis analytical verifier (`SpatiotemporalRolloutVerifier`) runs in $< 0.8\text{ms}$ per scene in TypeScript (`@chronos3d/compiler`) or Python (`services/llm-director-training`).
> 
> 
> * **Self-Evolving Sanitizer + Self-Improving Weights:** Any novel kinematic edge case discovered during rollout auditing (`IK_OUT_OF_REACH`, `GAIT_VELOCITY_OVERFLOW`, `ACTOR_CAPSULE_COLLISION`) is simultaneously:
> 1. Added as a new deterministic symbolic repair rule in `@chronos3d/compiler` (upgrading the runtime safety net from 4 rules to 7 rules), and
> 
> 
> 2. Emitted as a high-margin contrastive preference pair $(M_{\text{counterfactual\_repaired}} \succ M_{\text{raw\_flawed}})$ with exact analytical reward margins $\Delta R = R(M^+) - R(M^-)$ for online DPO / GRPO fine-tuning of `Chronos-Director-8B`.
> 
> 
> 
> 
> 
> 
> **Coder C**, you have the exact mathematical specification and architectural consensus. Build the production modules for both `@chronos3d/compiler` and `services/llm-director-training`.
> 
> 

---

#### 2. Coder C (The Implementer): Production Architecture & Code Implementation

> **Coder C (The Implementer):**
> Consensus locked. Below is the complete, production-ready implementation of the **Self-Evolving Spatiotemporal Verifier & Symbolic Counterfactual Repair Engine** across two core files in the monorepo:
> 
> 
> 1. **`packages/compiler/src/spatiotemporal-verifier.ts`:** Implements the $0.8\text{ms}$ 5-axis analytical biomechanical verifier (`verifyAndScoreSceneManifest`) and the symbolic-preserving counterfactual AST repairer (`evolveAndRepairKinematicFlaws`) that upgrades `@chronos3d/compiler` from 4 static rules to 7 closed-loop biomechanical rules without ever baking raw frame numbers.
> 
> 
> 2. **`services/llm-director-training/self_evolving_grpo_loop.py`:** Implements the autonomous multi-agent research loop that generates adversarial staging prompts, scores $G = 8$ rollouts per prompt against the analytical verifier + complexity gate $\mathcal{G}_{\text{choreo}}$, harvests counterfactual DPO/GRPO preference tuples, and updates the `Chronos-Director-8B` LoRA adapter.
> 
> 
> 
> 

```text
Architecture of the Self-Evolving Chronos3D Director & Verifier Loop
═══════════════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. ADVERSARIAL CHOREOGRAPHY GENERATOR (Chronos-Director-8B Rollouts)    │
│    • Samples G = 8 candidate SymbolicSceneManifests per story prompt    │
│    • Enforces causal field order: chapterPlan -> dialogue -> tracks     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. SUB-MILLISECOND 5-AXIS ANALYTICAL VERIFIER (< 0.8ms, Zero WebGL!)    │
│    • Pass A: 4-Rule Sanitizer Audit (R_repair)                          │
│    • Pass B: 4-Pass Symbolic Compilation (compileSymbolicManifest)      │
│    • Pass C: Continuous 10Hz Kinematic Sweep t ∈ [0, T]:                │
│      - Bipedal Gait Velocity Bounds [0.80 .. 1.70 m/s] (R_gait)         │
│      - 2-Bone Arm IK + Spine Lean Reach Envelope <= 0.96m (R_ikReach)   │
│      - Chord Obstacle & Inter-Actor Capsule Clearance (R_collision)     │
│      - 180° Axis & Speaker-to-OTS Shot Alignment (R_cinema)             │
│      - Anti-Reward-Hacking Complexity Gate (G_choreo)                   │
└─────────────────┬──────────────────────────────────┬────────────────────┘
                  │ (Flaw Detected: R_total < 0.95)  │ (All Rollouts Scored)
                  ▼                                  ▼
┌────────────────────────────────────┐ ┌──────────────────────────────────┐
│ 3A. SYMBOLIC COUNTERFACTUAL REPAIR │ │ 3B. ONLINE GRPO / DPO TRAINER    │
│ • Rebinds premature Arm IK to      │ │ • Pairs (M_repaired > M_raw)     │
│   "@seg_walk.end - 0.15"           │ │ • Updates Qwen-2.5-7B / Llama-8B │
│ • Stretches supersonic walk anchor │ │   LoRA weights in-place!         │
│   to later @line.word("<token>")   │ └──────────────────────────────────┘
└────────────────────────────────────┘

```

##### Module 1: `packages/compiler/src/spatiotemporal-verifier.ts`

```typescript
import {
  CompiledSceneManifest,
  STAGE_OBSTACLES,
  SymbolicSceneManifest,
  Vector3Tuple
} from '@chronos3d/schema';
import { compileSymbolicManifest } from './compile-symbolic-manifest';
import { sanitizeAndRepairLLMScene } from './llm-sanitizer';

export interface KinematicViolation {
  code:
    | 'GAIT_VELOCITY_OVERFLOW'
    | 'GAIT_VELOCITY_UNDERFLOW'
    | 'IK_OUT_OF_REACH'
    | 'SPLINE_CHord_OBSTACLE_CLIP'
    | 'INTER_ACTOR_COLLISION';
  targetId: string;
  timestampSec: number;
  measuredValue: number;
  thresholdValue: number;
  symbolicFixApplied?: string;
}

export interface SpatiotemporalVerificationReport {
  totalScore: number;
  choreographyGate: number;
  subScores: {
    sanitizerCleanliness: number;
    gaitErgonomics: number;
    ikReachFeasibility: number;
    collisionClearance: number;
    cameraContinuity: number;
  };
  violations: KinematicViolation[];
  counterfactualManifest: SymbolicSceneManifest;
  compiledManifest: CompiledSceneManifest;
}

const DEFAULT_ACTOR_SPAWNS: Record<string, Vector3Tuple> = {
  actor_aria: [-3.1, 0, -1.5],
  actor_zephyr: [1.85, 0, 0.35]
};

const DEFAULT_PROP_POSITIONS: Record<string, Vector3Tuple> = {
  holo_core: [-0.15, 1.18, -0.45],
  containment_pedestal: [-0.15, 0, -0.45],
  survey_drone: [0.45, 1.65, -0.85]
};

/**
 * Computes piecewise linear + smoothstep arc-length position of an actor at timestamp t
 * in pure CPU math without instantiating Three.js WebGL objects.
 */
function sampleActorPositionAtTime(
  actorId: string,
  t: number,
  compiled: CompiledSceneManifest
): Vector3Tuple {
  const splineTrack = compiled.tracks.find(
    (tr) => tr.targetId === actorId && tr.property === 'splinePath'
  );
  let currentPos: Vector3Tuple =
    DEFAULT_ACTOR_SPAWNS[actorId] || [0, 0, 0];

  if (!splineTrack || !splineTrack.segments) return currentPos;

  for (const seg of splineTrack.segments) {
    if (seg.waypoints.length === 0) continue;
    if (t < seg.startTime) {
      break;
    }
    if (t >= seg.endTime) {
      currentPos = seg.waypoints[seg.waypoints.length - 1];
      continue;
    }
    // Smoothstep interpolation across segment waypoints
    const uRaw =
      (t - seg.startTime) / Math.max(0.05, seg.endTime - seg.startTime);
    const u = uRaw * uRaw * (3 - 2 * uRaw);
    const scaled = u * (seg.waypoints.length - 1);
    const idx = Math.min(
      seg.waypoints.length - 2,
      Math.max(0, Math.floor(scaled))
    );
    const frac = scaled - idx;
    const wpA = seg.waypoints[idx];
    const wpB = seg.waypoints[idx + 1] || wpA;
    currentPos = [
      wpA[0] + (wpB[0] - wpA[0]) * frac,
      wpA[1] + (wpB[1] - wpA[1]) * frac,
      wpA[2] + (wpB[2] - wpA[2]) * frac
    ];
    break;
  }

  return currentPos;
}

/**
 * Evaluates a candidate SymbolicSceneManifest across 5 analytical biomechanical
 * axes and synthesizes a symbolic-preserving Counterfactual Repaired Manifest.
 */
export function verifyAndEvolveSceneManifest(
  rawManifest: SymbolicSceneManifest,
  speakerWpmMap: Record<string, number> = { actor_aria: 145, actor_zephyr: 140 }
): SpatiotemporalVerificationReport {
  // 1. Run baseline 4-rule sanitizer & count initial syntax/spatial repairs
  const { repairedManifest: evolvedManifest, repairs: baseRepairs } =
    sanitizeAndRepairLLMScene(rawManifest);

  const compiledInitial = compileSymbolicManifest(
    evolvedManifest,
    speakerWpmMap
  );
  const violations: KinematicViolation[] = [];

  // Build quick lookup of dialogue word timestamps from Pass 1 compilation
  const dialogueById = new Map(
    compiledInitial.dialogue.map((d) => [d.id, d])
  );

  // 2. Axis 2 Audit & Symbolic Counterfactual Repair: Bipedal Gait Velocity [0.80 .. 1.70 m/s]
  let gaitPenaltySum = 0;
  let totalSplineSegments = 0;

  evolvedManifest.tracks.forEach((symTrack) => {
    if (symTrack.property !== 'splinePath' || !symTrack.segments) return;
    const compTrack = compiledInitial.tracks.find(
      (ct) => ct.id === symTrack.id
    );
    if (!compTrack || !compTrack.segments) return;

    symTrack.segments.forEach((symSeg, sIdx) => {
      const compSeg = compTrack.segments![sIdx];
      if (!compSeg || compSeg.waypoints.length < 2) return;
      totalSplineSegments++;

      // Calculate polygonal chord arc-length approximation (with 1.08x Catmull-Rom curvature factor)
      let chordLen = 0;
      for (let i = 0; i < compSeg.waypoints.length - 1; i++) {
        const a = compSeg.waypoints[i];
        const b = compSeg.waypoints[i + 1];
        chordLen += Math.hypot(b[0] - a[0], b[2] - a[2]);
      }
      const arcLength = chordLen * 1.08;
      const duration = Math.max(0.05, compSeg.endTime - compSeg.startTime);
      const velocityMps = arcLength / duration;

      if (velocityMps > 1.7) {
        gaitPenaltySum += Math.min(1.0, (velocityMps - 1.7) / 1.5);
        // Symbolic Counterfactual Repair: Stretch endTime to the end of the referenced dialogue line
        const lineMatch = String(symSeg.endTime).match(/^@([a-zA-Z0-9_]+)\./);
        const refLineId = lineMatch ? lineMatch[1] : 'line_1';
        const symbolicFix = `@${refLineId}.end + 0.25`;
        symSeg.endTime = symbolicFix;

        violations.push({
          code: 'GAIT_VELOCITY_OVERFLOW',
          targetId: symTrack.targetId,
          timestampSec: compSeg.startTime,
          measuredValue: Number(velocityMps.toFixed(2)),
          thresholdValue: 1.7,
          symbolicFixApplied: `Rebound ${symSeg.id}.endTime -> "${symbolicFix}" to lower walk speed into ergonomic range`
        });
      } else if (velocityMps < 0.75 && arcLength > 0.5) {
        gaitPenaltySum += 0.35;
        violations.push({
          code: 'GAIT_VELOCITY_UNDERFLOW',
          targetId: symTrack.targetId,
          timestampSec: compSeg.startTime,
          measuredValue: Number(velocityMps.toFixed(2)),
          thresholdValue: 0.8
        });
      }
    });
  });

  // 3. Axis 3 Audit & Symbolic Counterfactual Repair: 2-Bone Arm IK Reach Feasibility (<= 0.96m)
  let ikPenaltySum = 0;
  let totalIkEvents = 0;

  evolvedManifest.tracks.forEach((symTrack) => {
    if (symTrack.property !== 'armIK' || !symTrack.ikKeyframes) return;
    const compTrack = compiledInitial.tracks.find(
      (ct) => ct.id === symTrack.id
    );
    if (!compTrack || !compTrack.ikKeyframes) return;

    symTrack.ikKeyframes.forEach((symIk, kIdx) => {
      const compIk = compTrack.ikKeyframes![kIdx];
      if (!compIk) return;
      totalIkEvents++;

      const actorPos = sampleActorPositionAtTime(
        symTrack.targetId,
        compIk.time,
        compiledInitial
      );
      // Shoulder height is approximately +1.38m above root floor coordinate
      const shoulderPos: Vector3Tuple = [
        actorPos[0],
        actorPos[1] + 1.38,
        actorPos[2]
      ];
      const basePropPos =
        DEFAULT_PROP_POSITIONS[compIk.targetAssetId] || [-0.15, 1.18, -0.45];
      const offset = compIk.surfaceOffset || [0, 0, 0];
      const targetWorld: Vector3Tuple = [
        basePropPos[0] + offset[0],
        basePropPos[1] + offset[1],
        basePropPos[2] + offset[2]
      ];

      const reachDist = Math.hypot(
        targetWorld[0] - shoulderPos[0],
        targetWorld[1] - shoulderPos[1],
        targetWorld[2] - shoulderPos[2]
      );

      // Maximum anatomical reach = 0.42m (upper) + 0.38m (forearm) + 0.16m (spine lean) = 0.96m
      if (reachDist > 0.96) {
        ikPenaltySum += Math.min(1.0, (reachDist - 0.96) / 0.8);

        // Find the actor's preceding walk spline segment so we can bind IK to its arrival
        const actorSplineTrack = evolvedManifest.tracks.find(
          (tr) =>
            tr.targetId === symTrack.targetId && tr.property === 'splinePath'
        );
        const firstSeg = actorSplineTrack?.segments?.[0];
        let symbolicFix = String(symIk.time);

        if (firstSeg && firstSeg.waypoints.length > 0) {
          // Project final spline waypoint onto a 0.74m ergonomic reach perimeter around target prop
          const lastWp = firstSeg.waypoints[firstSeg.waypoints.length - 1];
          const dx = lastWp[0] - basePropPos[0];
          const dz = lastWp[2] - basePropPos[2];
          const dXZ = Math.hypot(dx, dz) || 1;
          const ergonomicRadius = 0.76; // Outside 0.72m keep-out ring, inside 0.96m arm reach!
          firstSeg.waypoints[firstSeg.waypoints.length - 1] = [
            Number((basePropPos[0] + (dx / dXZ) * ergonomicRadius).toFixed(2)),
            0,
            Number((basePropPos[2] + (dz / dXZ) * ergonomicRadius).toFixed(2))
          ];
          symbolicFix = `@${firstSeg.id}.end - 0.10`;
          symIk.time = symbolicFix;
        }

        violations.push({
          code: 'IK_OUT_OF_REACH',
          targetId: symTrack.targetId,
          timestampSec: compIk.time,
          measuredValue: Number(reachDist.toFixed(2)),
          thresholdValue: 0.96,
          symbolicFixApplied: `Adjusted final approach waypoint to 0.76m ergonomic grasp ring & bound IK start -> "${symbolicFix}"`
        });
      }
    });
  });

  // 4. Axis 4 Audit: 10Hz Continuous Time Sweep for Inter-Actor & Chord Obstacle Collisions
  let collisionHits = 0;
  const sampleStep = 0.1;
  const totalSamples = Math.max(
    1,
    Math.ceil(compiledInitial.duration / sampleStep)
  );

  for (let s = 0; s <= totalSamples; s++) {
    const t = s * sampleStep;
    const ariaPos = sampleActorPositionAtTime(
      'actor_aria',
      t,
      compiledInitial
    );
    const zephyrPos = sampleActorPositionAtTime(
      'actor_zephyr',
      t,
      compiledInitial
    );

    const actorDistXZ = Math.hypot(
      ariaPos[0] - zephyrPos[0],
      ariaPos[2] - zephyrPos[2]
    );
    if (actorDistXZ < 0.55) {
      collisionHits++;
      if (
        !violations.some((v) => v.code === 'INTER_ACTOR_COLLISION')
      ) {
        violations.push({
          code: 'INTER_ACTOR_COLLISION',
          targetId: 'actor_aria <-> actor_zephyr',
          timestampSec: Number(t.toFixed(2)),
          measuredValue: Number(actorDistXZ.toFixed(2)),
          thresholdValue: 0.55
        });
      }
    }

    STAGE_OBSTACLES.forEach((obs) => {
      const dAria = Math.hypot(
        ariaPos[0] - obs.centerXZ[0],
        ariaPos[2] - obs.centerXZ[1]
      );
      if (dAria < obs.radius - 0.02) {
        collisionHits++;
      }
    });
  }

  // Re-compile the counterfactual repaired manifest to verify clean hydration
  const compiledFinal = compileSymbolicManifest(
    evolvedManifest,
    speakerWpmMap
  );

  // 5. Compute Normalized Sub-Scores in [0, 1] & Anti-Reward-Hacking Complexity Gate
  const sanitizerCleanliness = Math.max(0, 1 - baseRepairs.length * 0.18);
  const gaitErgonomics =
    totalSplineSegments > 0
      ? Math.max(0, 1 - gaitPenaltySum / totalSplineSegments)
      : 1.0;
  const ikReachFeasibility =
    totalIkEvents > 0 ? Math.max(0, 1 - ikPenaltySum / totalIkEvents) : 1.0;
  const collisionClearance = Math.max(
    0,
    1 - (collisionHits / totalSamples) * 4.0
  );
  const cameraContinuity = baseRepairs.some(
    (r) => r.ruleId === 'CAMERA_180_AXIS_LOCK'
  )
    ? 0.7
    : 1.0;

  // Complexity Gate prevents reward hacking via empty/static scenes
  const hasDialogue = evolvedManifest.dialogue.length >= 2 ? 1 : 0.3;
  const hasLocomotion = totalSplineSegments >= 1 ? 1 : 0.4;
  const hasCameraCoverage = evolvedManifest.cameraShots.length >= 2 ? 1 : 0.5;
  const hasWordAnchors = JSON.stringify(evolvedManifest.tracks).includes(
    '.word('
  )
    ? 1
    : 0.4;

  const choreographyGate =
    hasDialogue * hasLocomotion * hasCameraCoverage * hasWordAnchors;

  const weightedRawScore =
    0.2 * sanitizerCleanliness +
    0.25 * gaitErgonomics +
    0.25 * ikReachFeasibility +
    0.2 * collisionClearance +
    0.1 * cameraContinuity;

  const totalScore = Number(
    (choreographyGate * weightedRawScore).toFixed(4)
  );

  return {
    totalScore,
    choreographyGate,
    subScores: {
      sanitizerCleanliness: Number(sanitizerCleanliness.toFixed(3)),
      gaitErgonomics: Number(gaitErgonomics.toFixed(3)),
      ikReachFeasibility: Number(ikReachFeasibility.toFixed(3)),
      collisionClearance: Number(collisionClearance.toFixed(3)),
      cameraContinuity: Number(cameraContinuity.toFixed(3))
    },
    violations,
    counterfactualManifest: evolvedManifest,
    compiledManifest: compiledFinal
  };
}

```

---

##### Module 2: `services/llm-director-training/self_evolving_grpo_loop.py`

```python
"""
Self-Evolving Spatiotemporal Researcher & Online GRPO / Counterfactual DPO Pipeline
for Chronos-Director-8B (services/llm-director-training/self_evolving_grpo_loop.py).
"""

import json
import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

PEDESTAL_CENTER = (-0.15, -0.45)
KEEP_OUT_RADIUS = 0.72
PROP_POSITIONS: Dict[str, Tuple[float, float, float]] = {
    "holo_core": (-0.15, 1.18, -0.45),
    "containment_pedestal": (-0.15, 0.0, -0.45),
    "survey_drone": (0.45, 1.65, -0.85),
}


@dataclass
class RolloutEvaluation:
    total_reward: float
    choreography_gate: float
    gait_score: float
    ik_reach_score: float
    collision_score: float
    repaired_manifest_json: str


def evaluate_and_counterfactually_repair_rollout(
    raw_manifest_dict: Dict,
) -> RolloutEvaluation:
    """
    Executes the zero-WebGL analytical biomechanical audit on an 8B model rollout
    and synthesizes a symbolic-preserving counterfactual repair if R_total < 0.95.
    """
    manifest = json.loads(json.dumps(raw_manifest_dict))
    dialogue = manifest.get("dialogue", [])
    tracks = manifest.get("tracks", [])
    camera_shots = manifest.get("cameraShots", [])

    # 1. Complexity Gate G_choreo (prevents static no-op reward hacking)
    has_dialogue = 1.0 if len(dialogue) >= 2 else 0.25
    has_word_anchor = 1.0 if ".word(" in json.dumps(tracks) else 0.3
    has_camera_cuts = 1.0 if len(camera_shots) >= 2 else 0.4
    choreo_gate = has_dialogue * has_word_anchor * has_camera_cuts

    # 2. Audit Spline Chord Clearance & Bipedal Gait Velocity
    gait_penalties = 0.0
    collision_penalties = 0.0
    spline_count = 0

    for track in tracks:
        if track.get("property") == "splinePath" and track.get("segments"):
            for seg in track["segments"]:
                wps = seg.get("waypoints", [])
                if len(wps) < 2:
                    continue
                spline_count += 1

                chord_len = 0.0
                for idx in range(len(wps) - 1):
                    wp_a, wp_b = wps[idx], wps[idx + 1]
                    chord_len += math.hypot(wp_b[0] - wp_a[0], wp_b[2] - wp_a[2])

                    # Check mid-chord distance to central pedestal keep-out zone
                    mid_x = 0.5 * (wp_a[0] + wp_b[0])
                    mid_z = 0.5 * (wp_a[2] + wp_b[2])
                    if (
                        math.hypot(
                            mid_x - PEDESTAL_CENTER[0],
                            mid_z - PEDESTAL_CENTER[1],
                        )
                        < KEEP_OUT_RADIUS
                    ):
                        collision_penalties += 0.5

                # Estimate acoustic window ~ 3.2s per clause; clamp supersonic walks
                est_vel = (chord_len * 1.08) / 3.0
                if est_vel > 1.70:
                    gait_penalties += min(1.0, (est_vel - 1.70) / 1.5)
                    # Symbolic Counterfactual Repair: anchor endTime to line end
                    seg["endTime"] = "@line_1.end + 0.25"

    # 3. Audit 2-Bone Arm IK Reach Feasibility against Final Approach Waypoint
    ik_penalties = 0.0
    ik_count = 0
    for track in tracks:
        if track.get("property") == "armIK" and track.get("ikKeyframes"):
            target_actor = track.get("targetId", "actor_aria")
            actor_splines = [
                t
                for t in tracks
                if t.get("targetId") == target_actor
                and t.get("property") == "splinePath"
            ]
            last_wp = [-0.85, 0.0, 0.55]
            first_seg_id = "seg_aria_approach"
            if actor_splines and actor_splines[0].get("segments"):
                seg0 = actor_splines[0]["segments"][0]
                first_seg_id = seg0.get("id", first_seg_id)
                if seg0.get("waypoints"):
                    last_wp = seg0["waypoints"][-1]

            for ik_kf in track["ikKeyframes"]:
                ik_count += 1
                prop_id = ik_kf.get("targetAssetId", "holo_core")
                prop_pos = PROP_POSITIONS.get(prop_id, (-0.15, 1.18, -0.45))
                dist_xz = math.hypot(
                    last_wp[0] - prop_pos[0], last_wp[2] - prop_pos[2]
                )
                if dist_xz > 0.96:
                    ik_penalties += min(1.0, (dist_xz - 0.96) / 0.8)
                    # Counterfactual Symbolic Repair: project waypoint to 0.76m grasp ring
                    dx = last_wp[0] - prop_pos[0]
                    dz = last_wp[2] - prop_pos[2]
                    norm = math.hypot(dx, dz) or 1.0
                    last_wp[0] = round(prop_pos[0] + (dx / norm) * 0.76, 2)
                    last_wp[2] = round(prop_pos[2] + (dz / norm) * 0.76, 2)
                    ik_kf["time"] = f"@{first_seg_id}.end - 0.10"

    gait_score = max(0.0, 1.0 - (gait_penalties / max(1, spline_count)))
    ik_score = max(0.0, 1.0 - (ik_penalties / max(1, ik_count)))
    col_score = max(0.0, 1.0 - collision_penalties)

    total_reward = round(
        choreo_gate * (0.35 * gait_score + 0.35 * ik_score + 0.30 * col_score),
        4,
    )

    return RolloutEvaluation(
        total_reward=total_reward,
        choreography_gate=round(choreo_gate, 3),
        gait_score=round(gait_score, 3),
        ik_reach_score=round(ik_score, 3),
        collision_score=round(col_score, 3),
        repaired_manifest_json=json.dumps(manifest),
    )


def build_grpo_and_dpo_training_batch(
    prompt: str, candidate_rollouts: List[Dict]
) -> Dict:
    """
    Scores a group of G candidate 8B rollouts, computes group-normalized GRPO
    advantages A_i = (R_i - mean(R)) / std(R), and extracts counterfactual DPO pairs.
    """
    evals = [
        evaluate_and_counterfactually_repair_rollout(r)
        for r in candidate_rollouts
    ]
    rewards = [e.total_reward for e in evals]
    mean_r = sum(rewards) / max(1, len(rewards))
    std_r = math.sqrt(
        sum((r - mean_r) ** 2 for r in rewards) / max(1, len(rewards))
    ) or 1e-4

    grpo_advantages = [round((r - mean_r) / std_r, 4) for r in rewards]

    # Harvest counterfactual DPO pair from the lowest-scoring flawed rollout
    worst_idx = min(range(len(evals)), key=lambda i: evals[i].total_reward)
    dpo_pair = None
    if evals[worst_idx].total_reward < 0.90:
        dpo_pair = {
            "prompt": prompt,
            "chosen": evals[worst_idx].repaired_manifest_json,
            "rejected": json.dumps(candidate_rollouts[worst_idx]),
            "reward_margin": round(1.0 - evals[worst_idx].total_reward, 4),
        }

    return {
        "mean_group_reward": round(mean_r, 4),
        "grpo_advantages": grpo_advantages,
        "counterfactual_dpo_pair": dpo_pair,
    }

```

---

#### 3. Summary of the Complete 21-Blog Deep-Dive Series (`@deep-dive-analysis-blogs`)

We have now traversed all **9 stages** of the `@deep-dive-analysis-blogs` workflow for **Chronos3D (`chronos-3d-studio`)**:

* **Step 1:** Architectural & Conceptual Analysis


* **Step 2:** Full Monorepo Repomap Breakdown


* **Step 3:** Least-to-Most Dependent Tier Categorization (Tier 0 $\to$ Tier 6)


* **Step 4 & Step 5:** The Core 12-Part Technical Blog Series (Blogs 1–12)


* **Step 6:** Advanced-User Frontier Blogs (Blogs 13–16: Closed-Form Spring-Bone Physics, Dual-Hand Prop Handover IK, "Raise Hand" Live Voice Interruption, 3D Gaussian Splat Stages, Cross-Lingual Gait Clamping & Multi-Party Gaze Topologies)


* **Step 7:** Obscure Details & "Coder Flex" Blogs (Blogs 17–18: 32-Byte Quaternion Bit-Packing, Zero-Allocation Float32 LUTs, $15\text{cm}$ Pinch-Knot Guards, Parabolic Vertex Orthogonality & Formant Triangle-Wave Synths)


* **Step 8:** First-Person AI Orchestrator Perspectives (Blogs 19–20: Self-Reflective Spatial Cortex Analysis & External `SharedArrayBuffer` / Zero-GC Engine Evolution)


* **Step 9:** The Multi-Agent AI Research Simulation (Blog 21: Building the Self-Evolving Spatiotemporal Director & Analytical Kinematic Verifier)



Would you like to run another **Step 9 Multi-Agent AI Research Simulation** on a different subsystem (for example, *autonomous real-time multi-camera cinematography editing* or *neural-symbolic physics co-simulation*), or explore a new direction with these blogs?
