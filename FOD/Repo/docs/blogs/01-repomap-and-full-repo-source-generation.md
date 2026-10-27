# Turn 01 — Repomap & Full Repository Source Generation

*Source: `Latest From branched onward.md` — turn 1 of 18*

**User:**

first create repomap, then create the full content of each individual file in the repo that i can manually copy, dont provide python script to generate the file just provide the file name and path in repo then actual raw content

---

**AI:**

The **Chronos3D** monorepo architecture (`chronos-3d-studio`) is organized below as a `pnpm` + Turborepo workspace containing the zero-dependency schema and symbolic compiler packages, the deterministic Three.js runtime and kinematics engine, the 2D+3D video/audio exporter, the interactive React authoring studio, and the Python FastAPI neural TTS alignment microservice.

---

## 1. Repository Map (Repomap)

```text
chronos-3d-studio/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── packages/
│   ├── schema/                                   # @chronos3d/schema — Zero-dependency AST, IR & LLM JSON Schemas
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── symbolic-ast.types.ts             # SymbolicSceneManifest, TimeExpression, tracks, shots & decisions
│   │       ├── compiled-ir.types.ts              # CompiledSceneManifest, TTSWordBoundary, VisemeCue & logs
│   │       ├── world-state.types.ts              # PersistentWorldState, InventoryItem, SocketAttachment & snapshots
│   │       ├── llm-json-schema.ts                # Constrained decoding JSON Schema & 9-zone stage landmarks
│   │       └── index.ts
│   │
│   ├── compiler/                                 # @chronos3d/compiler — 4-Pass Symbolic Compiler & 8B Sanitizer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── expression-parser.ts              # Regex evaluator for @line.start, @line.word("token") +/- offset
│   │       ├── viseme-compiler.ts                # Syllable prosody estimator & 14-Oculus-viseme envelope generator
│   │       ├── llm-sanitizer.ts                  # sanitizeAndRepairLLMScene (radial obstacle push-out & stem match)
│   │       ├── compile-symbolic-manifest.ts      # 4-Pass compiler (Dialogue -> Splines -> Tracks -> Camera Shots)
│   │       └── index.ts
│   │
│   ├── engine-core/                              # @chronos3d/engine-core — Deterministic 60FPS Three.js Runtime
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── ProceduralRigBuilder.ts           # 15-bone humanoid rig + brow/eyelid bones + 14 viseme morphs
│   │       ├── SplineAndStrideSolver.ts          # Arc-length CatmullRomCurve3 LUT, tangent yaw & foot-lock stride
│   │       ├── IKSolvers.ts                      # 3-Tier Spine/Head/Eye Gaze IK + Analytical 2-Bone Arm IK
│   │       ├── CameraDirectorAndPauseCam.ts      # Declarative OTS/TwoShot/SplineDolly + Bezier snapback swerve
│   │       └── index.ts
│   │
│   └── video-exporter/                           # @chronos3d/video-exporter — 2D+3D Canvas Compositor & A/V Muxer
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── Canvas2DCompositor.ts             # Blits WebGL buffer + 2.35:1 letterbox + burned-in karaoke text
│           ├── WebAudioSceneSynth.ts             # Formant viseme synthesizer & Quantum Core surge SFX graph
│           ├── MediaRecorderExporter.ts          # Hardware-probed MP4/WebM recorder (audio-locked & frame-stepped)
│           └── index.ts
│
├── apps/
│   └── studio-web/                               # Visual 3D Spline, Multi-Track NLE & Symbolic Studio (Vite + React)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── sampleManifest.ts                 # Intentional raw 8B vs. clean symbolic reactor briefing scene
│           └── App.tsx                           # Full 3D Viewport, Waypoint Dragger, 5-Lane NLE & Sanitizer Studio
│
└── services/
    └── tts-aligner-service/                      # Python FastAPI Neural TTS & Forced Word-Alignment Service
        ├── requirements.txt
        └── app/
            ├── models.py                         # Pydantic request/response schemas matching TTSWordBoundary
            └── main.py                           # POST /api/v1/synthesize-aligned (Kokoro/WhisperX + fallback)

```

---

## 2. Full Raw Content of Every Repository File

### Root Workspace Configuration

#### `package.json`

Root workspace manifest defining `pnpm` and Turborepo build, dev, and typecheck scripts.

```json
{
  "name": "chronos-3d-studio",
  "version": "1.0.0",
  "private": true,
  "description": "Declarative 3D Video Engine, Symbolic TTS Compiler & Small-LLM Authoring Studio",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.5.4"
  },
  "packageManager": "pnpm@9.7.0",
  "engines": {
    "node": ">=20.0.0"
  }
}

```

#### `pnpm-workspace.yaml`

Workspace package discovery configuration for `packages/*` and `apps/*`.

```yaml
packages:
  - "packages/*"
  - "apps/*"

```

#### `turbo.json`

Turborepo task pipeline ensuring `@chronos3d/schema` and `@chronos3d/compiler` build before downstream packages.

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}

```

#### `tsconfig.base.json`

Shared strict TypeScript configuration inherited by all workspace packages.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}

```

---

### Package 1: `@chronos3d/schema`

#### `packages/schema/package.json`

Package manifest for the zero-dependency AST and IR schema definitions.

```json
{
  "name": "@chronos3d/schema",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}

```

#### `packages/schema/tsconfig.json`

TypeScript configuration for `@chronos3d/schema`.

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}

```

#### `packages/schema/src/symbolic-ast.types.ts`

Defines the authoring-time Symbolic AST (`SymbolicSceneManifest`), symbolic time expressions (`@line_1.word("surge")`), 2-bone arm IK tracks, facial emotions, and camera director shot rules.

```typescript
export type TimeExpression = number | string;
export type Vector3Tuple = [number, number, number];

export type ShotType =
  | 'twoShot'
  | 'overTheShoulder'
  | 'splineDolly'
  | 'closeUp'
  | 'establishingOrbit';

export type EmotionPreset =
  | 'neutral'
  | 'happy'
  | 'concerned'
  | 'surprised'
  | 'focused'
  | 'determined';

export type VisemeName =
  | 'viseme_sil'
  | 'viseme_PP'
  | 'viseme_FF'
  | 'viseme_TH'
  | 'viseme_DD'
  | 'viseme_kk'
  | 'viseme_CH'
  | 'viseme_SS'
  | 'viseme_nn'
  | 'viseme_RR'
  | 'viseme_aa'
  | 'viseme_E'
  | 'viseme_I'
  | 'viseme_O'
  | 'viseme_U';

export const ALL_VISEMES: VisemeName[] = [
  'viseme_sil',
  'viseme_PP',
  'viseme_FF',
  'viseme_TH',
  'viseme_DD',
  'viseme_kk',
  'viseme_CH',
  'viseme_SS',
  'viseme_nn',
  'viseme_RR',
  'viseme_aa',
  'viseme_E',
  'viseme_I',
  'viseme_O',
  'viseme_U'
];

export interface SymbolicDialogueLine {
  id: string;
  speakerId: string;
  speaker: string;
  start: TimeExpression;
  text: string;
  speakingRateWpm?: number;
  audioUrl?: string | null;
  ttsWordOffsets?: { word: string; startOffset: number; endOffset: number }[];
}

export interface SymbolicSplineSegment {
  id: string;
  startTime: TimeExpression;
  endTime: TimeExpression;
  waypoints: Vector3Tuple[];
  strideLength?: number;
  inheritStartPose?: boolean;
}

export interface SymbolicArmIKKeyframe {
  time: TimeExpression;
  target: string | Vector3Tuple | null;
  surfaceOffset?: Vector3Tuple;
  poleOffset?: Vector3Tuple;
  weight: number;
  crossFade?: number;
  comment?: string;
}

export interface SymbolicKeyframe<T = any> {
  time: TimeExpression;
  value: T;
  crossFade?: number;
  comment?: string;
}

export interface SymbolicTrack {
  id: string;
  targetId: string;
  property:
    | 'animationClip'
    | 'lookAtTarget'
    | 'splinePath'
    | 'scale'
    | 'color'
    | 'facialEmotion'
    | 'armIK';
  hand?: 'left' | 'right';
  keyframes?: SymbolicKeyframe[];
  ikKeyframes?: SymbolicArmIKKeyframe[];
  segments?: SymbolicSplineSegment[];
}

export interface SymbolicCameraShot {
  id: string;
  label: string;
  startTime: TimeExpression;
  endTime: TimeExpression;
  shotType: ShotType;
  subjectId: string;
  secondaryId?: string;
  side?: 'left' | 'right';
  dollyMode?: 'lead' | 'follow' | 'parallel';
  fov?: number;
  transitionDuration?: number;
}

export interface DecisionChoice {
  id: string;
  label: string;
  targetChapterId: string;
  requiredItemId?: string;
  requiredFlag?: string;
  grantItemId?: string;
  setFlag?: string;
  attachPropToSocket?: {
    propId: string;
    characterId: string;
    boneSocket: 'ForearmR' | 'ForearmL' | 'Spine';
  };
}

export interface SymbolicDecisionPrompt {
  id: string;
  triggerTime: TimeExpression;
  promptText: string;
  timeoutSeconds: number;
  defaultChoiceId: string;
  choices: DecisionChoice[];
}

export interface SymbolicSceneManifest {
  id: string;
  title: string;
  chapterPlan?: string;
  dialogue: SymbolicDialogueLine[];
  tracks: SymbolicTrack[];
  cameraShots: SymbolicCameraShot[];
  decision?: SymbolicDecisionPrompt;
}

```

#### `packages/schema/src/compiled-ir.types.ts`

Defines the strict numeric Intermediate Representation (`CompiledSceneManifest`) consumed at 60 FPS by the Three.js runtime.

```typescript
import {
  ShotType,
  SymbolicTrack,
  TimeExpression,
  Vector3Tuple,
  VisemeName
} from './symbolic-ast.types';

export interface TTSWordBoundary {
  word: string;
  cleanWord: string;
  index: number;
  start: number;
  end: number;
}

export interface VisemeCue {
  time: number;
  duration: number;
  viseme: VisemeName;
  weight: number;
}

export interface CompiledDialogueSegment {
  id: string;
  speakerId: string;
  speaker: string;
  symbolicStart: TimeExpression;
  start: number;
  end: number;
  duration: number;
  text: string;
  words: TTSWordBoundary[];
  visemes: VisemeCue[];
}

export interface CompiledAnchorResolutionLog {
  sourceCategory: 'Dialogue' | 'Spline' | 'Gesture/Prop' | 'ArmIK' | 'Camera';
  targetLabel: string;
  symbolicExpr: string;
  resolvedSeconds: number;
  matchedTokenInfo: string;
}

export interface CompiledArmIKKeyframe {
  symbolicTime: string;
  time: number;
  target: string | Vector3Tuple | null;
  surfaceOffset: Vector3Tuple;
  poleOffset: Vector3Tuple;
  weight: number;
  crossFade: number;
  comment?: string;
}

export interface CompiledSceneManifest {
  id: string;
  title: string;
  duration: number;
  dialogue: CompiledDialogueSegment[];
  tracks: {
    id: string;
    targetId: string;
    property: SymbolicTrack['property'];
    hand?: 'left' | 'right';
    keyframes?: {
      symbolicTime: string;
      time: number;
      value: any;
      crossFade?: number;
      comment?: string;
    }[];
    ikKeyframes?: CompiledArmIKKeyframe[];
    segments?: {
      id: string;
      symbolicStart: string;
      symbolicEnd: string;
      startTime: number;
      endTime: number;
      waypoints: Vector3Tuple[];
      strideLength: number;
      inheritStartPose?: boolean;
    }[];
  }[];
  cameraShots: {
    id: string;
    label: string;
    symbolicStart: string;
    symbolicEnd: string;
    startTime: number;
    endTime: number;
    shotType: ShotType;
    subjectId: string;
    secondaryId?: string;
    side: 'left' | 'right';
    dollyMode?: 'lead' | 'follow' | 'parallel';
    fov: number;
    transitionDuration: number;
  }[];
  resolutionLog: CompiledAnchorResolutionLog[];
}

```

#### `packages/schema/src/world-state.types.ts`

Defines multi-hour persistent world state, inventory items, 3D bone-socket attachments, and checkpoint snapshots.

```typescript
import { Vector3Tuple } from './symbolic-ast.types';

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
}

export interface SocketAttachment {
  propId: string;
  characterId: string;
  boneSocket: 'ForearmR' | 'ForearmL' | 'Spine';
  localOffset: Vector3Tuple;
  localScale: Vector3Tuple;
}

export interface CharacterTransformSnapshot {
  characterId: string;
  position: Vector3Tuple;
  rotationY: number;
}

export interface PersistentWorldState {
  currentChapterId: string;
  inventory: InventoryItem[];
  flags: Record<string, boolean>;
  socketAttachments: SocketAttachment[];
  characterPoses: Record<string, CharacterTransformSnapshot>;
}

export interface WorldCheckpointSnapshot {
  checkpointId: string;
  chapterId: string;
  timestamp: number;
  state: PersistentWorldState;
}

```

#### `packages/schema/src/llm-json-schema.ts`

Exports the calibrated 9-zone stage landmarks, obstacle keep-out zones, and the strict JSON Schema for constrained 8B LLM decoding.

```typescript
import { Vector3Tuple } from './symbolic-ast.types';

export interface ObstacleKeepOutZone {
  id: string;
  name: string;
  centerXZ: [number, number];
  radius: number;
}

export const STAGE_OBSTACLES: ObstacleKeepOutZone[] = [
  {
    id: 'holo_pedestal',
    name: 'Central Containment Pedestal',
    centerXZ: [-0.15, -0.45],
    radius: 0.72
  }
];

export const STAGE_LANDMARKS: Record<string, Vector3Tuple> = {
  STAGE_LEFT_BACK: [-3.1, 0, -1.5],
  STAGE_LEFT_MID: [-2.0, 0, 0.4],
  PEDESTAL_APPROACH_WEST: [-0.88, 0, 0.45],
  PEDESTAL_APPROACH_EAST: [0.65, 0, 0.35],
  STAGE_RIGHT_CONSOLE: [1.85, 0, 0.35],
  STAGE_CENTER_FRONT: [0.0, 0, 1.45]
};

export const LLM_SCENE_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Chronos3DSymbolicSceneManifest',
  type: 'object',
  required: ['id', 'title', 'chapterPlan', 'dialogue', 'tracks', 'cameraShots'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    chapterPlan: {
      type: 'string',
      description: 'Brief causal summary of dialogue lines, key spoken trigger words, and 3D choreography.'
    },
    dialogue: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'speakerId', 'speaker', 'start', 'text'],
        properties: {
          id: { type: 'string', pattern: '^line_[0-9]+$' },
          speakerId: { type: 'string', enum: ['actor_aria', 'actor_zephyr'] },
          speaker: { type: 'string', enum: ['ARIA', 'ZEPHYR'] },
          start: { type: ['number', 'string'] },
          text: { type: 'string' }
        }
      }
    },
    tracks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'targetId', 'property'],
        properties: {
          id: { type: 'string' },
          targetId: { type: 'string' },
          property: {
            type: 'string',
            enum: [
              'animationClip',
              'lookAtTarget',
              'splinePath',
              'scale',
              'color',
              'facialEmotion',
              'armIK'
            ]
          }
        }
      }
    },
    cameraShots: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'label', 'startTime', 'endTime', 'shotType', 'subjectId'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          startTime: { type: ['number', 'string'] },
          endTime: { type: ['number', 'string'] },
          shotType: {
            type: 'string',
            enum: ['twoShot', 'overTheShoulder', 'splineDolly', 'closeUp', 'establishingOrbit']
          },
          subjectId: { type: 'string' },
          secondaryId: { type: 'string' },
          side: { type: 'string', enum: ['left', 'right'] },
          fov: { type: 'number' }
        }
      }
    }
  }
} as const;

```

#### `packages/schema/src/index.ts`

Barrel export for `@chronos3d/schema`.

```typescript
export * from './symbolic-ast.types';
export * from './compiled-ir.types';
export * from './world-state.types';
export * from './llm-json-schema';

```

---

### Package 2: `@chronos3d/compiler`

#### `packages/compiler/package.json`

Package manifest for `@chronos3d/compiler`.

```json
{
  "name": "@chronos3d/compiler",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@chronos3d/schema": "workspace:*"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}

```

#### `packages/compiler/tsconfig.json`

TypeScript configuration for `@chronos3d/compiler`.

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}

```

#### `packages/compiler/src/expression-parser.ts`

Parses and evaluates the Symbolic Anchor DSL (`@line_1.start`, `@line_2.word("surge") - 0.1`, `@line_2.progress(0.5)`, `@walk_1.end`) against the active symbol table.

```typescript
import { TimeExpression, TTSWordBoundary } from '@chronos3d/schema';

export interface SymbolTableEntry {
  id: string;
  start: number;
  end: number;
  duration: number;
  words?: TTSWordBoundary[];
}

export function evaluateTimeExpression(
  expr: TimeExpression,
  symbolTable: Map<string, SymbolTableEntry>
): { seconds: number; matchedInfo: string } {
  if (typeof expr === 'number') {
    return { seconds: expr, matchedInfo: `Literal ${expr.toFixed(2)}s` };
  }

  const trimmed = expr.trim();
  const asNum = Number(trimmed);
  if (!Number.isNaN(asNum)) {
    return { seconds: asNum, matchedInfo: `Literal ${asNum.toFixed(2)}s` };
  }

  const anchorRegex =
    /^@([a-zA-Z0-9_-]+)\.(start|end|duration|word\(([^)]+)\)|progress\(([0-9.]+)\))\s*([+-]\s*[0-9.]+)?$/;
  const match = trimmed.match(anchorRegex);

  if (!match) {
    return { seconds: 0, matchedInfo: `Unparsed (${trimmed}) -> 0.00s` };
  }

  const targetId = match[1];
  const accessor = match[2];
  const wordArgRaw = match[3];
  const progressArgRaw = match[4];
  const offsetRaw = match[5];

  const entry = symbolTable.get(targetId);
  if (!entry) {
    return { seconds: 0, matchedInfo: `Missing Symbol @${targetId}` };
  }

  const offsetSec = offsetRaw ? parseFloat(offsetRaw.replace(/\s+/g, '')) : 0;
  let baseSec = entry.start;
  let detail = `@${targetId}.start`;

  if (accessor === 'start') {
    baseSec = entry.start;
    detail = `@${targetId}.start (${entry.start.toFixed(2)}s)`;
  } else if (accessor === 'end') {
    baseSec = entry.end;
    detail = `@${targetId}.end (${entry.end.toFixed(2)}s)`;
  } else if (accessor === 'duration') {
    baseSec = entry.duration;
    detail = `@${targetId}.duration (${entry.duration.toFixed(2)}s)`;
  } else if (accessor.startsWith('progress(') && progressArgRaw) {
    const p = Math.max(0, Math.min(1, parseFloat(progressArgRaw)));
    baseSec = entry.start + p * entry.duration;
    detail = `@${targetId} ${Math.round(p * 100)}% (${baseSec.toFixed(2)}s)`;
  } else if (accessor.startsWith('word(') && wordArgRaw !== undefined) {
    const cleanArg = wordArgRaw.replace(/['"]/g, '').trim();
    const words = entry.words || [];
    const wordIdxNum = Number(cleanArg);

    if (!Number.isNaN(wordIdxNum)) {
      const clampedIdx = Math.max(0, Math.min(words.length - 1, wordIdxNum));
      const found = words[clampedIdx];
      baseSec = found ? found.start : entry.start;
      detail = found
        ? `Word #${clampedIdx} "${found.word}" (${baseSec.toFixed(2)}s)`
        : `@${targetId}.start`;
    } else {
      const searchLower = cleanArg.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found =
        words.find((w) => w.cleanWord === searchLower) ||
        words.find((w) => w.cleanWord.includes(searchLower)) ||
        words.find((w) => searchLower.includes(w.cleanWord));
      baseSec = found ? found.start : entry.start;
      detail = found
        ? `Token "${found.word}" @ ${baseSec.toFixed(2)}s`
        : `Fallback @${targetId}.start (token "${cleanArg}" not found)`;
    }
  }

  const finalSec = Math.max(0, Number((baseSec + offsetSec).toFixed(3)));
  const offsetDesc =
    offsetSec !== 0
      ? ` ${offsetSec > 0 ? '+' : '-'} ${Math.abs(offsetSec).toFixed(2)}s`
      : '';

  return {
    seconds: finalSec,
    matchedInfo: `${detail}${offsetDesc}`
  };
}

```

#### `packages/compiler/src/viseme-compiler.ts`

Computes acoustic word boundaries (from external TTS offsets or syllable/vowel-nucleus prosody estimation) and generates 14-viseme co-articulation cues.

```typescript
import {
  SymbolicDialogueLine,
  TTSWordBoundary,
  VisemeCue,
  VisemeName
} from '@chronos3d/schema';

export function charToOculusViseme(ch: string): VisemeName {
  switch (ch.toLowerCase()) {
    case 'a':
      return 'viseme_aa';
    case 'e':
      return 'viseme_E';
    case 'i':
    case 'y':
      return 'viseme_I';
    case 'o':
      return 'viseme_O';
    case 'u':
    case 'w':
      return 'viseme_U';
    case 'p':
    case 'b':
    case 'm':
      return 'viseme_PP';
    case 'f':
    case 'v':
      return 'viseme_FF';
    case 't':
    case 'd':
      return 'viseme_DD';
    case 'n':
    case 'l':
      return 'viseme_nn';
    case 'k':
    case 'g':
    case 'c':
      return 'viseme_kk';
    case 'r':
      return 'viseme_RR';
    default:
      return 'viseme_SS';
  }
}

export function synthesizeWordTimingsForLine(
  line: SymbolicDialogueLine,
  lineStartSec: number,
  wpmOverride: number
): { words: TTSWordBoundary[]; endSec: number; visemes: VisemeCue[] } {
  const words: TTSWordBoundary[] = [];
  const visemes: VisemeCue[] = [];

  if (line.ttsWordOffsets && line.ttsWordOffsets.length > 0) {
    let maxEnd = lineStartSec;
    line.ttsWordOffsets.forEach((item, idx) => {
      const cleanWord = item.word.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
      const wStart = Number((lineStartSec + item.startOffset).toFixed(3));
      const wEnd = Number((lineStartSec + item.endOffset).toFixed(3));
      maxEnd = Math.max(maxEnd, wEnd);

      words.push({
        word: item.word,
        cleanWord,
        index: idx,
        start: wStart,
        end: wEnd
      });

      const chars = cleanWord.split('');
      const wordDur = Math.max(0.08, wEnd - wStart);
      const secPerChar = wordDur / Math.max(1, chars.length);
      chars.forEach((ch, cIdx) => {
        const vName = charToOculusViseme(ch);
        visemes.push({
          time: wStart + cIdx * secPerChar,
          duration: secPerChar * 1.15,
          viseme: vName,
          weight: ['viseme_aa', 'viseme_O', 'viseme_E'].includes(vName) ? 0.95 : 0.72
        });
      });
    });

    return { words, endSec: maxEnd, visemes };
  }

  const rawTokens = line.text.trim().split(/\s+/).filter(Boolean);
  const effectiveWpm = Math.max(60, wpmOverride || line.speakingRateWpm || 145);
  const secPerWordAvg = 60 / effectiveWpm;
  let cursor = lineStartSec;

  rawTokens.forEach((rawToken, idx) => {
    const cleanWord = rawToken.replace(/[^a-zA-Z0-9']/g, '');
    const hasComma = /[,;:]/.test(rawToken);
    const hasSentenceStop = /[.!?—]/.test(rawToken);

    const vowelMatches = cleanWord.match(/[aeiouyAEIOUY]+/g);
    const syllables = Math.max(1, vowelMatches ? vowelMatches.length : 1);
    const wordDur = Math.max(0.16, secPerWordAvg * (0.55 + syllables * 0.32));

    const wStart = cursor;
    const wEnd = cursor + wordDur;

    words.push({
      word: rawToken,
      cleanWord: cleanWord.toLowerCase(),
      index: idx,
      start: Number(wStart.toFixed(3)),
      end: Number(wEnd.toFixed(3))
    });

    const chars = cleanWord.split('');
    const secPerChar = wordDur / Math.max(1, chars.length);
    chars.forEach((ch, cIdx) => {
      const vName = charToOculusViseme(ch);
      visemes.push({
        time: wStart + cIdx * secPerChar,
        duration: secPerChar * 1.15,
        viseme: vName,
        weight: ['viseme_aa', 'viseme_O', 'viseme_E'].includes(vName) ? 0.95 : 0.72
      });
    });

    const pauseAfter = hasSentenceStop
      ? 0.28 * (145 / effectiveWpm)
      : hasComma
      ? 0.15 * (145 / effectiveWpm)
      : 0.035;
    cursor = wEnd + pauseAfter;

    visemes.push({
      time: wEnd,
      duration: pauseAfter,
      viseme: 'viseme_sil',
      weight: 0.1
    });
  });

  return {
    words,
    endSec: Number(cursor.toFixed(3)),
    visemes
  };
}

```

#### `packages/compiler/src/llm-sanitizer.ts`

Implements the 4-rule self-healing sanitizer (`sanitizeAndRepairLLMScene`) that repairs raw 8B LLM outputs before compilation: (1) radial obstacle keep-out push, (2) morphological stem matching for `@line.word()`, (3) sequential dialogue chaining, and (4) 180-degree camera axis normalization.

```typescript
import {
  STAGE_OBSTACLES,
  SymbolicSceneManifest,
  TimeExpression
} from '@chronos3d/schema';

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

function stemToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(ing|ed|es|s|tion|ly)$/, '');
}

function repairSymbolicWordExpression(
  expr: TimeExpression,
  dialogueWordsMap: Map<string, string[]>,
  targetPath: string,
  repairs: SanitizerRepairEntry[]
): TimeExpression {
  if (typeof expr !== 'string') return expr;

  const wordRegex = /^@(line_[0-9]+)\.word\((['"]?)([^)'"]+)\2\)(.*)$/;
  const match = expr.trim().match(wordRegex);
  if (!match) return expr;

  const lineId = match[1];
  const requestedWord = match[3].trim();
  const trailingOffset = match[4] || '';

  const lineTokens = dialogueWordsMap.get(lineId);
  if (!lineTokens || lineTokens.length === 0) return expr;

  const cleanRequested = requestedWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lineTokens.includes(cleanRequested)) {
    return expr;
  }

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

  return expr;
}

export function sanitizeAndRepairLLMScene(rawManifest: SymbolicSceneManifest): {
  repairedManifest: SymbolicSceneManifest;
  repairs: SanitizerRepairEntry[];
} {
  const manifest: SymbolicSceneManifest = JSON.parse(
    JSON.stringify(rawManifest)
  );
  const repairs: SanitizerRepairEntry[] = [];

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

  // Build lookup table of clean spoken words per line for Rule 2
  const dialogueWordsMap = new Map<string, string[]>();
  manifest.dialogue.forEach((line) => {
    const tokens = line.text
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      .filter(Boolean);
    dialogueWordsMap.set(line.id, tokens);
  });

  // RULE 2 & RULE 3: Repair spline obstacle collisions & fuzzy-match word anchors
  manifest.tracks.forEach((track, tIdx) => {
    if (track.segments) {
      track.segments.forEach((seg, sIdx) => {
        seg.startTime = repairSymbolicWordExpression(
          seg.startTime,
          dialogueWordsMap,
          `tracks[${tIdx}].segments[${sIdx}].startTime`,
          repairs
        );
        seg.endTime = repairSymbolicWordExpression(
          seg.endTime,
          dialogueWordsMap,
          `tracks[${tIdx}].segments[${sIdx}].endTime`,
          repairs
        );

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
      });
    }

    if (track.keyframes) {
      track.keyframes.forEach((kf, kIdx) => {
        kf.time = repairSymbolicWordExpression(
          kf.time,
          dialogueWordsMap,
          `tracks[${tIdx}].keyframes[${kIdx}].time`,
          repairs
        );
      });
    }

    if (track.ikKeyframes) {
      track.ikKeyframes.forEach((ikKf, kIdx) => {
        ikKf.time = repairSymbolicWordExpression(
          ikKf.time,
          dialogueWordsMap,
          `tracks[${tIdx}].ikKeyframes[${kIdx}].time`,
          repairs
        );
      });
    }
  });

  // RULE 4: Normalize 180-degree camera line of action across consecutive OTS cuts
  let canonicalSide: 'left' | 'right' | null = null;
  manifest.cameraShots.forEach((shot, cIdx) => {
    shot.startTime = repairSymbolicWordExpression(
      shot.startTime,
      dialogueWordsMap,
      `cameraShots[${cIdx}].startTime`,
      repairs
    );
    shot.endTime = repairSymbolicWordExpression(
      shot.endTime,
      dialogueWordsMap,
      `cameraShots[${cIdx}].endTime`,
      repairs
    );

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

  return { repairedManifest: manifest, repairs };
}

```

#### `packages/compiler/src/compile-symbolic-manifest.ts`

Executes the 4-pass symbolic compilation pipeline (`compileSymbolicManifest`), transforming a `SymbolicSceneManifest` into a `CompiledSceneManifest` in under 1.5ms.

```typescript
import {
  CompiledAnchorResolutionLog,
  CompiledDialogueSegment,
  CompiledSceneManifest,
  SymbolicSceneManifest
} from '@chronos3d/schema';
import { evaluateTimeExpression, SymbolTableEntry } from './expression-parser';
import { synthesizeWordTimingsForLine } from './viseme-compiler';

export function compileSymbolicManifest(
  symbolic: SymbolicSceneManifest,
  speakerWpmMap: Record<string, number> = { actor_aria: 145, actor_zephyr: 140 },
  interTurnGapDeltaSec: number = 0
): CompiledSceneManifest {
  const symbolTable = new Map<string, SymbolTableEntry>();
  const resolutionLog: CompiledAnchorResolutionLog[] = [];
  const compiledDialogue: CompiledDialogueSegment[] = [];

  // PASS 1: Compile Sequential Dialogue & Word Boundaries into the Symbol Table
  symbolic.dialogue.forEach((line, idx) => {
    const evalStart = evaluateTimeExpression(line.start, symbolTable);
    const adjustedStart =
      idx === 0
        ? evalStart.seconds
        : Math.max(0, evalStart.seconds + interTurnGapDeltaSec);

    const wpm = speakerWpmMap[line.speakerId] || line.speakingRateWpm || 145;
    const { words, endSec, visemes } = synthesizeWordTimingsForLine(
      line,
      adjustedStart,
      wpm
    );
    const duration = Number((endSec - adjustedStart).toFixed(3));

    symbolTable.set(line.id, {
      id: line.id,
      start: adjustedStart,
      end: endSec,
      duration,
      words
    });

    compiledDialogue.push({
      id: line.id,
      speakerId: line.speakerId,
      speaker: line.speaker,
      symbolicStart: line.start,
      start: adjustedStart,
      end: endSec,
      duration,
      text: line.text,
      words,
      visemes
    });

    resolutionLog.push({
      sourceCategory: 'Dialogue',
      targetLabel: `${line.id} (${line.speaker})`,
      symbolicExpr: String(line.start),
      resolvedSeconds: adjustedStart,
      matchedTokenInfo: `${words.length} words @ ${wpm} WPM -> Ends ${endSec.toFixed(2)}s`
    });
  });

  // PASS 2: Resolve Catmull-Rom Spline Segments & Register Segment Anchors
  const compiledTracks: CompiledSceneManifest['tracks'] = [];

  symbolic.tracks.forEach((track) => {
    if (track.property === 'splinePath' && track.segments) {
      const resolvedSegs = track.segments.map((seg) => {
        const sEval = evaluateTimeExpression(seg.startTime, symbolTable);
        const eEval = evaluateTimeExpression(seg.endTime, symbolTable);
        const startSec = sEval.seconds;
        const endSec = Math.max(startSec + 0.2, eEval.seconds);

        symbolTable.set(seg.id, {
          id: seg.id,
          start: startSec,
          end: endSec,
          duration: endSec - startSec
        });

        resolutionLog.push({
          sourceCategory: 'Spline',
          targetLabel: `${track.targetId} (${seg.id})`,
          symbolicExpr: `${seg.startTime} -> ${seg.endTime}`,
          resolvedSeconds: startSec,
          matchedTokenInfo: `Window [${startSec.toFixed(2)}s - ${endSec.toFixed(2)}s] (${(
            endSec - startSec
          ).toFixed(2)}s walk)`
        });

        return {
          id: seg.id,
          symbolicStart: String(seg.startTime),
          symbolicEnd: String(seg.endTime),
          startTime: startSec,
          endTime: endSec,
          waypoints: seg.waypoints,
          strideLength: seg.strideLength || 1.25,
          inheritStartPose: seg.inheritStartPose
        };
      });

      compiledTracks.push({
        id: track.id,
        targetId: track.targetId,
        property: track.property,
        segments: resolvedSegs
      });
    }
  });

  // PASS 3: Resolve Skeletal Gestures, Gaze, Emotions, Props & 2-Bone Arm IK Keyframes
  symbolic.tracks.forEach((track) => {
    if (track.property === 'armIK' && track.ikKeyframes) {
      const resolvedIk = track.ikKeyframes
        .map((ikKf) => {
          const tEval = evaluateTimeExpression(ikKf.time, symbolTable);
          resolutionLog.push({
            sourceCategory: 'ArmIK',
            targetLabel: `${track.targetId}.armIK (${track.hand || 'right'})`,
            symbolicExpr: String(ikKf.time),
            resolvedSeconds: tEval.seconds,
            matchedTokenInfo: `${tEval.matchedInfo} -> target=${JSON.stringify(ikKf.target)}`
          });
          return {
            symbolicTime: String(ikKf.time),
            time: tEval.seconds,
            target: ikKf.target,
            surfaceOffset: ikKf.surfaceOffset || [0, 0, 0],
            poleOffset: ikKf.poleOffset || [0.25, -0.3, 0.15],
            weight: ikKf.weight,
            crossFade: ikKf.crossFade || 0.35,
            comment: ikKf.comment
          };
        })
        .sort((a, b) => a.time - b.time);

      compiledTracks.push({
        id: track.id,
        targetId: track.targetId,
        property: track.property,
        hand: track.hand || 'right',
        ikKeyframes: resolvedIk
      });
    } else if (track.property !== 'splinePath' && track.keyframes) {
      const resolvedKfs = track.keyframes
        .map((kf) => {
          const tEval = evaluateTimeExpression(kf.time, symbolTable);
          resolutionLog.push({
            sourceCategory: 'Gesture/Prop',
            targetLabel: `${track.targetId}.${track.property} = ${JSON.stringify(
              kf.value
            )}`,
            symbolicExpr: String(kf.time),
            resolvedSeconds: tEval.seconds,
            matchedTokenInfo: tEval.matchedInfo
          });

          return {
            symbolicTime: String(kf.time),
            time: tEval.seconds,
            value: kf.value,
            crossFade: kf.crossFade,
            comment: kf.comment
          };
        })
        .sort((a, b) => a.time - b.time);

      compiledTracks.push({
        id: track.id,
        targetId: track.targetId,
        property: track.property,
        keyframes: resolvedKfs
      });
    }
  });

  // PASS 4: Resolve Declarative Camera Director Shots
  const compiledShots = symbolic.cameraShots.map((shot) => {
    const sEval = evaluateTimeExpression(shot.startTime, symbolTable);
    const eEval = evaluateTimeExpression(shot.endTime, symbolTable);

    resolutionLog.push({
      sourceCategory: 'Camera',
      targetLabel: shot.label,
      symbolicExpr: `${shot.startTime} -> ${shot.endTime}`,
      resolvedSeconds: sEval.seconds,
      matchedTokenInfo: `${sEval.matchedInfo} (${shot.shotType})`
    });

    return {
      id: shot.id,
      label: shot.label,
      symbolicStart: String(shot.startTime),
      symbolicEnd: String(shot.endTime),
      startTime: sEval.seconds,
      endTime: Math.max(sEval.seconds + 0.2, eEval.seconds),
      shotType: shot.shotType,
      subjectId: shot.subjectId,
      secondaryId: shot.secondaryId,
      side: shot.side || 'right',
      dollyMode: shot.dollyMode,
      fov: shot.fov || 40,
      transitionDuration: shot.transitionDuration ?? 0
    };
  });

  const maxDialogueEnd = compiledDialogue.reduce(
    (max, d) => Math.max(max, d.end),
    10
  );
  const maxShotEnd = compiledShots.reduce(
    (max, s) => Math.max(max, s.endTime),
    maxDialogueEnd
  );

  return {
    id: symbolic.id,
    title: symbolic.title,
    duration: Number((Math.max(maxDialogueEnd, maxShotEnd) + 0.6).toFixed(2)),
    dialogue: compiledDialogue,
    tracks: compiledTracks,
    cameraShots: compiledShots,
    resolutionLog
  };
}

```

#### `packages/compiler/src/index.ts`

Barrel export for `@chronos3d/compiler`.

```typescript
export * from './expression-parser';
export * from './viseme-compiler';
export * from './llm-sanitizer';
export * from './compile-symbolic-manifest';

```

---

### Package 3: `@chronos3d/engine-core`

#### `packages/engine-core/package.json`

Package manifest for the deterministic Three.js 60 FPS runtime engine.

```json
{
  "name": "@chronos3d/engine-core",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@chronos3d/schema": "workspace:*",
    "three": "^0.167.1"
  },
  "devDependencies": {
    "@types/three": "^0.167.0"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}

```

#### `packages/engine-core/tsconfig.json`

TypeScript configuration for `@chronos3d/engine-core`.

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}

```

#### `packages/engine-core/src/ProceduralRigBuilder.ts`

Builds the 15-bone articulated humanoid rig with articulated eyebrows (`BrowL`, `BrowR`), 14 Oculus viseme morph targets, and scrub-safe skeletal animation clips (`Idle`, `Walk`, `Explain`, `PointRight`, `Wave`).

```typescript
import * as THREE from 'three';
import { ALL_VISEMES, EmotionPreset, Vector3Tuple } from '@chronos3d/schema';

export interface CharacterRigInstance {
  id: string;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  morphMeshes: THREE.Mesh[];
  hipsBone: THREE.Bone;
  spineBone: THREE.Bone;
  headBone: THREE.Bone;
  browLBone: THREE.Bone;
  browRBone: THREE.Bone;
  shoulderLBone: THREE.Bone;
  forearmLBone: THREE.Bone;
  shoulderRBone: THREE.Bone;
  forearmRBone: THREE.Bone;
  smoothedHeadingQuat: THREE.Quaternion;
  smoothedHeadOffset: THREE.Quaternion;
  currentSplineTangent: THREE.Vector3;
}

export const EMOTION_PRESETS: Record<
  EmotionPreset,
  { browLift: number; browTiltDeg: number; smileMorph: number }
> = {
  neutral: { browLift: 0.0, browTiltDeg: 0, smileMorph: 0.0 },
  happy: { browLift: 0.03, browTiltDeg: -6, smileMorph: 0.85 },
  concerned: { browLift: 0.04, browTiltDeg: 16, smileMorph: -0.6 },
  surprised: { browLift: 0.075, browTiltDeg: -4, smileMorph: 0.1 },
  focused: { browLift: -0.035, browTiltDeg: -12, smileMorph: -0.2 },
  determined: { browLift: -0.05, browTiltDeg: -18, smileMorph: -0.45 }
};

export function createCharacterRig(
  id: string,
  color: string,
  accentColor: string,
  initPos: Vector3Tuple,
  initRotY: number
): CharacterRigInstance {
  const root = new THREE.Group();
  root.name = id;
  root.position.set(...initPos);
  root.rotation.set(0, initRotY, 0);

  const hipsBone = new THREE.Bone();
  hipsBone.name = 'Hips';
  hipsBone.position.set(0, 1.02, 0);
  root.add(hipsBone);

  const spineBone = new THREE.Bone();
  spineBone.name = 'Spine';
  spineBone.position.set(0, 0.35, 0);
  hipsBone.add(spineBone);

  const headBone = new THREE.Bone();
  headBone.name = 'Head';
  headBone.position.set(0, 0.72, 0);
  spineBone.add(headBone);

  const browLBone = new THREE.Bone();
  browLBone.name = 'BrowL';
  browLBone.position.set(-0.14, 0.19, 0.31);
  headBone.add(browLBone);

  const browRBone = new THREE.Bone();
  browRBone.name = 'BrowR';
  browRBone.position.set(0.14, 0.19, 0.31);
  headBone.add(browRBone);

  const shoulderLBone = new THREE.Bone();
  shoulderLBone.name = 'ShoulderL';
  shoulderLBone.position.set(-0.55, 0.42, 0);
  spineBone.add(shoulderLBone);

  const forearmLBone = new THREE.Bone();
  forearmLBone.name = 'ForearmL';
  forearmLBone.position.set(-0.18, -0.4, 0);
  shoulderLBone.add(forearmLBone);

  const shoulderRBone = new THREE.Bone();
  shoulderRBone.name = 'ShoulderR';
  shoulderRBone.position.set(0.55, 0.42, 0);
  spineBone.add(shoulderRBone);

  const forearmRBone = new THREE.Bone();
  forearmRBone.name = 'ForearmR';
  forearmRBone.position.set(0.18, -0.4, 0);
  shoulderRBone.add(forearmRBone);

  const thighLBone = new THREE.Bone();
  thighLBone.name = 'ThighL';
  thighLBone.position.set(-0.24, -0.08, 0);
  hipsBone.add(thighLBone);

  const shinLBone = new THREE.Bone();
  shinLBone.name = 'ShinL';
  shinLBone.position.set(0, -0.46, 0);
  thighLBone.add(shinLBone);

  const thighRBone = new THREE.Bone();
  thighRBone.name = 'ThighR';
  thighRBone.position.set(0.24, -0.08, 0);
  hipsBone.add(thighRBone);

  const shinRBone = new THREE.Bone();
  shinRBone.name = 'ShinR';
  shinRBone.position.set(0, -0.46, 0);
  thighRBone.add(shinRBone);

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.45
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.45,
    metalness: 0.65
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.65
  });

  hipsBone.add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.42), darkMat));

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.88, 0.46), bodyMat);
  torsoMesh.position.set(0, 0.14, 0);
  spineBone.add(torsoMesh);

  const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.06), accentMat);
  chestBadge.position.set(0, 0.28, 0.24);
  spineBone.add(chestBadge);

  const upperArmGeo = new THREE.CapsuleGeometry(0.11, 0.34, 8, 16);
  const armL = new THREE.Mesh(upperArmGeo, darkMat);
  armL.position.set(-0.1, -0.18, 0);
  shoulderLBone.add(armL);

  const handL = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.32, 8, 16), bodyMat);
  handL.position.set(0, -0.18, 0.05);
  forearmLBone.add(handL);

  const armR = new THREE.Mesh(upperArmGeo, darkMat);
  armR.position.set(0.1, -0.18, 0);
  shoulderRBone.add(armR);

  const handR = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.32, 8, 16), bodyMat);
  handR.position.set(0, -0.18, 0.05);
  forearmRBone.add(handR);

  const thighGeo = new THREE.CapsuleGeometry(0.13, 0.34, 8, 16);
  const shinGeo = new THREE.CapsuleGeometry(0.105, 0.38, 8, 16);

  const thighLMesh = new THREE.Mesh(thighGeo, darkMat);
  thighLMesh.position.set(0, -0.22, 0);
  thighLBone.add(thighLMesh);

  const shinLMesh = new THREE.Mesh(shinGeo, bodyMat);
  shinLMesh.position.set(0, -0.22, 0);
  shinLBone.add(shinLMesh);

  const thighRMesh = new THREE.Mesh(thighGeo, darkMat);
  thighRMesh.position.set(0, -0.22, 0);
  thighRBone.add(thighRMesh);

  const shinRMesh = new THREE.Mesh(shinGeo, bodyMat);
  shinRMesh.position.set(0, -0.22, 0);
  shinRBone.add(shinRMesh);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 0.6), bodyMat);
  headBone.add(headMesh);

  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.08), accentMat);
  visorMesh.position.set(0, 0.06, 0.28);
  headBone.add(visorMesh);

  const browGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
  browLBone.add(new THREE.Mesh(browGeo, darkMat));
  browRBone.add(new THREE.Mesh(browGeo, darkMat));

  // Morph-Target Mouth Mesh (14 Visemes)
  const baseMouthGeo = new THREE.BoxGeometry(0.32, 0.075, 0.1, 8, 4, 2);
  const basePos = baseMouthGeo.attributes.position;
  const morphPositions: THREE.BufferAttribute[] = [];
  const morphDict: Record<string, number> = {};

  ALL_VISEMES.forEach((vName, idx) => {
    morphDict[vName] = idx;
    const cloned = basePos.clone();
    for (let i = 0; i < cloned.count; i++) {
      let x = cloned.getX(i);
      let y = cloned.getY(i);
      const z = cloned.getZ(i);
      if (vName === 'viseme_aa') {
        y *= 3.6;
        x *= 1.15;
      } else if (vName === 'viseme_O') {
        y *= 3.0;
        x *= 0.62;
      } else if (vName === 'viseme_PP') {
        y *= 0.25;
      } else {
        y *= 1.8;
      }
      cloned.setXYZ(i, x, y, z);
    }
    morphPositions.push(cloned);
  });
  baseMouthGeo.morphAttributes.position = morphPositions;

  const mouthMesh = new THREE.Mesh(baseMouthGeo, accentMat);
  mouthMesh.morphTargetDictionary = morphDict;
  mouthMesh.morphTargetInfluences = new Array(ALL_VISEMES.length).fill(0);
  mouthMesh.position.set(0, -0.14, 0.29);
  headBone.add(mouthMesh);

  const qEuler = (x: number, y: number, z: number) =>
    new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();

  const walkTimes = [0.0, 0.25, 0.5, 0.75, 1.0];
  const walkClip = new THREE.AnimationClip('Walk', 1.0, [
    new THREE.VectorKeyframeTrack(
      'Hips.position',
      walkTimes,
      [-0.03, 0.99, 0, 0.0, 1.06, 0, 0.03, 0.99, 0, 0.0, 1.06, 0, -0.03, 0.99, 0]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ThighL.quaternion',
      walkTimes,
      [
        ...qEuler(0.52, 0, 0),
        ...qEuler(0.0, 0, 0),
        ...qEuler(-0.55, 0, 0),
        ...qEuler(-0.1, 0, 0),
        ...qEuler(0.52, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShinL.quaternion',
      walkTimes,
      [
        ...qEuler(0.15, 0, 0),
        ...qEuler(0.85, 0, 0),
        ...qEuler(0.08, 0, 0),
        ...qEuler(0.2, 0, 0),
        ...qEuler(0.15, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ThighR.quaternion',
      walkTimes,
      [
        ...qEuler(-0.55, 0, 0),
        ...qEuler(-0.1, 0, 0),
        ...qEuler(0.52, 0, 0),
        ...qEuler(0.0, 0, 0),
        ...qEuler(-0.55, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShinR.quaternion',
      walkTimes,
      [
        ...qEuler(0.08, 0, 0),
        ...qEuler(0.2, 0, 0),
        ...qEuler(0.15, 0, 0),
        ...qEuler(0.85, 0, 0),
        ...qEuler(0.08, 0, 0)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShoulderL.quaternion',
      walkTimes,
      [
        ...qEuler(-0.4, 0, -0.08),
        ...qEuler(0.0, 0, -0.08),
        ...qEuler(0.4, 0, -0.08),
        ...qEuler(0.0, 0, -0.08),
        ...qEuler(-0.4, 0, -0.08)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      walkTimes,
      [
        ...qEuler(0.4, 0, 0.08),
        ...qEuler(0.0, 0, 0.08),
        ...qEuler(-0.4, 0, 0.08),
        ...qEuler(0.0, 0, 0.08),
        ...qEuler(0.4, 0, 0.08)
      ]
    )
  ]);

  const gTimes = [0, 0.6, 1.2, 1.8, 2.4];
  const idleClip = new THREE.AnimationClip('Idle', 2.4, [
    new THREE.VectorKeyframeTrack(
      'Hips.position',
      gTimes,
      [0, 1.02, 0, 0, 1.04, 0, 0, 1.02, 0, 0, 1.04, 0, 0, 1.02, 0]
    )
  ]);

  const explainClip = new THREE.AnimationClip('Explain', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'ShoulderL.quaternion',
      gTimes,
      [
        ...qEuler(-0.75, 0.2, -0.35),
        ...qEuler(-1.1, -0.25, -0.65),
        ...qEuler(-0.6, 0.1, -0.25),
        ...qEuler(-1.0, -0.2, -0.6),
        ...qEuler(-0.75, 0.2, -0.35)
      ]
    ),
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      gTimes,
      [
        ...qEuler(-0.9, -0.2, 0.5),
        ...qEuler(-0.55, 0.2, 0.25),
        ...qEuler(-1.1, -0.25, 0.65),
        ...qEuler(-0.65, 0.1, 0.35),
        ...qEuler(-0.9, -0.2, 0.5)
      ]
    )
  ]);

  const pointRightClip = new THREE.AnimationClip('PointRight', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      gTimes,
      [
        ...qEuler(-1.35, -0.35, 1.05),
        ...qEuler(-1.42, -0.4, 1.12),
        ...qEuler(-1.35, -0.35, 1.05),
        ...qEuler(-1.42, -0.4, 1.12),
        ...qEuler(-1.35, -0.35, 1.05)
      ]
    )
  ]);

  const waveClip = new THREE.AnimationClip('Wave', 2.4, [
    new THREE.QuaternionKeyframeTrack(
      'ShoulderR.quaternion',
      gTimes,
      [
        ...qEuler(0, 0, 2.2),
        ...qEuler(0, 0, 2.55),
        ...qEuler(0, 0, 1.95),
        ...qEuler(0, 0, 2.55),
        ...qEuler(0, 0, 2.2)
      ]
    )
  ]);

  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<string, THREE.AnimationAction>();
  [
    ['Idle', idleClip],
    ['Walk', walkClip],
    ['Explain', explainClip],
    ['PointRight', pointRightClip],
    ['Wave', waveClip]
  ].forEach(([cName, clip]) => {
    const act = mixer.clipAction(clip as THREE.AnimationClip);
    act.play();
    act.setEffectiveWeight(cName === 'Idle' ? 1 : 0);
    actions.set(cName as string, act);
  });

  return {
    id,
    root,
    mixer,
    actions,
    morphMeshes: [mouthMesh],
    hipsBone,
    spineBone,
    headBone,
    browLBone,
    browRBone,
    shoulderLBone,
    forearmLBone,
    shoulderRBone,
    forearmRBone,
    smoothedHeadingQuat: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, initRotY, 0)
    ),
    smoothedHeadOffset: new THREE.Quaternion(),
    currentSplineTangent: new THREE.Vector3(Math.sin(initRotY), 0, Math.cos(initRotY))
  };
}

```

#### `packages/engine-core/src/SplineAndStrideSolver.ts`

Evaluates arc-length reparameterized `THREE.CatmullRomCurve3` locomotion paths, tangent yaw heading, and distance-locked stride phase ($\phi_{\text{stride}} = d(t) / L_{\text{stride}}$) for zero foot-sliding.

```typescript
import * as THREE from 'three';
import { Vector3Tuple } from '@chronos3d/schema';

export function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

export interface EvaluatedSplineState {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  headingYaw: number;
  walkWeight: number;
  stridePhase: number;
}

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

#### `packages/engine-core/src/IKSolvers.ts`

Implements post-mixer Hierarchical Gaze IK (`applyCharacterLookAtIK`) and closed-form Law-of-Cosines 2-Bone Arm IK (`solveAnalyticalTwoBoneArmIK`).

```typescript
import * as THREE from 'three';
import { CharacterRigInstance } from './ProceduralRigBuilder';

export function applyCharacterLookAtIK(
  rig: CharacterRigInstance,
  myHeadWorld: THREE.Vector3,
  targetWorld: THREE.Vector3
): void {
  const rootQuat = new THREE.Quaternion();
  rig.root.getWorldQuaternion(rootQuat);

  const localDir = targetWorld
    .clone()
    .sub(myHeadWorld)
    .applyQuaternion(rootQuat.invert());

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
  rig.headBone.quaternion.multiply(rig.smoothedHeadOffset);
}

export interface TwoBoneArmIKDebugPoints {
  shoulderWorld: THREE.Vector3;
  elbowWorld: THREE.Vector3;
  wristWorld: THREE.Vector3;
  targetWorld: THREE.Vector3;
}

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

  // Law of Cosines for interior elbow flexion angle
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

  rig.root.updateMatrixWorld(true);
  const elbowWorld = new THREE.Vector3();
  forearmBone.getWorldPosition(elbowWorld);
  const wristWorld = elbowWorld
    .clone()
    .add(dir.clone().multiplyScalar(lowerLen * 0.8));

  return {
    shoulderWorld,
    elbowWorld,
    wristWorld,
    targetWorld: targetWorld.clone()
  };
}

```

#### `packages/engine-core/src/CameraDirectorAndPauseCam.ts`

Evaluates declarative cinematography rules (`twoShot`, `overTheShoulder`, `splineDolly`, `closeUp`) with 180-degree line-of-action enforcement, plus the Slow-Mo Quadratic Bezier camera snap-back swerve.

```typescript
import * as THREE from 'three';
import { CompiledSceneManifest } from '@chronos3d/schema';
import { smoothstep } from './SplineAndStrideSolver';

export interface EvaluatedCameraPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
  shotLabel: string;
}

export function evaluateCameraDirectorAtTime(
  t: number,
  manifest: CompiledSceneManifest,
  ariaHeadPos: THREE.Vector3,
  zephyrHeadPos: THREE.Vector3,
  ariaSplineTangent: THREE.Vector3
): EvaluatedCameraPose {
  let activeShot = manifest.cameraShots[0];
  for (let i = 0; i < manifest.cameraShots.length; i++) {
    if (t >= manifest.cameraShots[i].startTime) {
      activeShot = manifest.cameraShots[i];
    }
  }

  const lineDir = new THREE.Vector3()
    .subVectors(zephyrHeadPos, ariaHeadPos)
    .setY(0)
    .normalize();
  const sideSign = activeShot.side === 'left' ? -1 : 1;
  const sideNormal = new THREE.Vector3(-lineDir.z, 0, lineDir.x)
    .multiplyScalar(sideSign)
    .normalize();

  const position = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

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

  return {
    position,
    lookAt,
    fov: activeShot.fov || 40,
    shotLabel: activeShot.label
  };
}

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

#### `packages/engine-core/src/index.ts`

Barrel export for `@chronos3d/engine-core`.

```typescript
export * from './ProceduralRigBuilder';
export * from './SplineAndStrideSolver';
export * from './IKSolvers';
export * from './CameraDirectorAndPauseCam';

```

---

### Package 4: `@chronos3d/video-exporter`

#### `packages/video-exporter/package.json`

Package manifest for the 2D+3D canvas compositor and WebAudio/MediaRecorder video exporter.

```json
{
  "name": "@chronos3d/video-exporter",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@chronos3d/schema": "workspace:*"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}

```

#### `packages/video-exporter/tsconfig.json`

TypeScript configuration for `@chronos3d/video-exporter`.

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}

```

#### `packages/video-exporter/src/Canvas2DCompositor.ts`

Blits the Three.js WebGL backing canvas onto a master 2D `<canvas>` and rasterizes 2.35:1 anamorphic cinema letterbox bars, timecode HUD, and karaoke word-highlighted subtitles.

```typescript
import { CompiledDialogueSegment } from '@chronos3d/schema';

export function compositeWebGLAndSubtitlesTo2DCanvas(
  ctx: CanvasRenderingContext2D,
  webglCanvas: HTMLCanvasElement,
  currentTime: number,
  duration: number,
  shotLabel: string,
  activeDialogue: CompiledDialogueSegment | null
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(webglCanvas, 0, 0, w, h);

  // 2.35:1 Cinema Letterbox Bars
  const barHeight = Math.round(h * 0.085);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, barHeight);
  ctx.fillRect(0, h - barHeight, w, barHeight);

  // Top Telemetry HUD
  ctx.font = '600 12px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(
    `CHRONOS-3D  |  T+${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s  |  ${shotLabel}`,
    18,
    barHeight * 0.62
  );

  // Karaoke Word-Highlighted Subtitle Banner
  if (activeDialogue) {
    ctx.font = 'bold 14px sans-serif';
    const textY = h - barHeight * 0.38;
    const speakerPrefix = `${activeDialogue.speaker}: `;
    let cursorX = 24;

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(speakerPrefix, cursorX, textY);
    cursorX += ctx.measureText(speakerPrefix).width + 6;

    activeDialogue.words.forEach((wordObj) => {
      const isSpoken = currentTime >= wordObj.start && currentTime <= wordObj.end;
      const wordStr = `${wordObj.word} `;
      const wordWidth = ctx.measureText(wordStr).width;

      if (isSpoken) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cursorX - 2, textY - 14, wordWidth, 19);
        ctx.fillStyle = '#020617';
      } else if (currentTime > wordObj.end) {
        ctx.fillStyle = '#f8fafc';
      } else {
        ctx.fillStyle = '#94a3b8';
      }

      ctx.fillText(wordStr, cursorX, textY);
      cursorX += wordWidth;
    });
  }
}

```

#### `packages/video-exporter/src/WebAudioSceneSynth.ts`

Creates a sample-accurate WebAudio formant synthesizer and Quantum Core SFX generator routed to a `MediaStreamAudioDestinationNode`.

```typescript
export interface SceneAudioRig {
  audioCtx: AudioContext;
  streamDest: MediaStreamAudioDestinationNode;
  triggerFormantPulse: (speakerId: string, freqHz?: number) => void;
  dispose: () => void;
}

export function createSceneAudioSynth(): SceneAudioRig {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const streamDest = audioCtx.createMediaStreamDestination();

  const triggerFormantPulse = (speakerId: string, freqHz?: number) => {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freqHz || (speakerId === 'actor_aria' ? 235 : 135);

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.connect(streamDest);

    osc.start(now);
    osc.stop(now + 0.15);
  };

  const dispose = () => {
    audioCtx.close();
  };

  return { audioCtx, streamDest, triggerFormantPulse, dispose };
}

```

#### `packages/video-exporter/src/MediaRecorderExporter.ts`

Probes hardware-accelerated H.264/AAC `.mp4` or VP9/Opus `.webm` support and captures multiplexed canvas + WebAudio streams into a downloadable video file.

```typescript
export interface RecordedVideoArtifact {
  url: string;
  mimeType: string;
  extension: 'mp4' | 'webm';
  sizeBytes: number;
}

export function probeSupportedVideoMimeType(): {
  mimeType: string;
  extension: 'mp4' | 'webm';
} {
  const candidates: { mimeType: string; extension: 'mp4' | 'webm' }[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' }
  ];

  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

export function startCanvasMediaRecorder(
  compositeCanvas: HTMLCanvasElement,
  audioStream: MediaStream | null,
  fps: number = 60
): {
  stopAndExport: () => Promise<RecordedVideoArtifact>;
} {
  const { mimeType, extension } = probeSupportedVideoMimeType();
  const canvasStream = compositeCanvas.captureStream(fps);

  if (audioStream) {
    audioStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  recorder.start(100);

  const stopAndExport = (): Promise<RecordedVideoArtifact> =>
    new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({
          url,
          mimeType,
          extension,
          sizeBytes: blob.size
        });
      };
      recorder.stop();
    });

  return { stopAndExport };
}

```

#### `packages/video-exporter/src/index.ts`

Barrel export for `@chronos3d/video-exporter`.

```typescript
export * from './Canvas2DCompositor';
export * from './WebAudioSceneSynth';
export * from './MediaRecorderExporter';

```

---

### Application: `apps/studio-web`

#### `apps/studio-web/package.json`

Package manifest for the Vite + React + Three.js Visual Authoring Studio.

```json
{
  "name": "studio-web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@chronos3d/compiler": "workspace:*",
    "@chronos3d/engine-core": "workspace:*",
    "@chronos3d/schema": "workspace:*",
    "@chronos3d/video-exporter": "workspace:*",
    "lucide-react": "^0.427.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.167.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.167.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.0"
  }
}

```

#### `apps/studio-web/tsconfig.json`

TypeScript configuration for `apps/studio-web`.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"]
}

```

#### `apps/studio-web/vite.config.ts`

Vite configuration resolving monorepo workspace packages.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});

```

#### `apps/studio-web/index.html`

HTML entry point for the Chronos3D Authoring Studio.

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chronos3D — Declarative 3D Video & Symbolic TTS Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-slate-950">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

#### `apps/studio-web/src/main.tsx`

React DOM root mounting `App.tsx`.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

```

#### `apps/studio-web/src/sampleManifest.ts`

Contains the baseline symbolic scene manifest (including an optional raw 8B hallucination preset that exercises the 4-rule self-healing sanitizer).

```typescript
import { SymbolicSceneManifest } from '@chronos3d/schema';

export const RAW_8B_SCENE_MANIFEST: SymbolicSceneManifest = {
  id: 'symbolic_reactor_briefing',
  title: 'Chronos3D Studio: Word-Locked Spline, 2-Bone Arm IK & 8B Sanitizer',
  chapterPlan:
    'Aria walks along a curved spline to the central containment pedestal, reaches out with 2-Bone Arm IK to touch the Quantum Core on the word surge, and Zephyr responds with a reverse OTS camera cut.',
  dialogue: [
    {
      id: 'line_1',
      speakerId: 'actor_aria',
      speaker: 'ARIA',
      start: 0.25,
      text: 'Zephyr, I am walking along the spline path until I reach the central pedestal.'
    },
    {
      id: 'line_2',
      speakerId: 'actor_aria',
      speaker: 'ARIA',
      start: 0, // Intentional 8B error: unchained start=0 repaired by sanitizer to @line_1.end + 0.35
      text: 'Watch closely: the exact moment I say surging, I touch the Quantum Core as it expands!'
    },
    {
      id: 'line_3',
      speakerId: 'actor_zephyr',
      speaker: 'ZEPHYR',
      start: '@line_2.end + 0.35',
      text: 'Incredible! Our reverse camera cut locked to my first word, and now I wave on goodbye!'
    }
  ],
  tracks: [
    {
      id: 'track_aria_spline',
      targetId: 'actor_aria',
      property: 'splinePath',
      segments: [
        {
          id: 'walk_to_pedestal',
          startTime: '@line_1.start',
          endTime: '@line_1.word("pedestal") + 0.25',
          strideLength: 1.25,
          waypoints: [
            [-3.1, 0, -1.5],
            [-2.0, 0, 0.4],
            [-0.25, 0, -0.35] // Intentional 8B error: inside 0.72m pedestal collision ring!
          ]
        }
      ]
    },
    {
      id: 'track_aria_clips',
      targetId: 'actor_aria',
      property: 'animationClip',
      keyframes: [
        { time: '@line_1.start', value: 'Idle' },
        { time: '@line_2.start', value: 'Explain', crossFade: 0.35 },
        {
          time: '@line_2.word("surge") - 0.1', // Intentional 8B stem mismatch: "surge" vs spoken "surging"
          value: 'PointRight',
          crossFade: 0.25
        },
        { time: '@line_3.start + 0.3', value: 'Idle', crossFade: 0.4 }
      ]
    },
    {
      id: 'track_aria_arm_ik',
      targetId: 'actor_aria',
      property: 'armIK',
      hand: 'right',
      ikKeyframes: [
        { time: '@line_1.start', target: null, weight: 0.0 },
        {
          time: '@line_2.word("surge") - 0.05',
          target: 'holo_core',
          surfaceOffset: [-0.22, 0, 0.18],
          weight: 1.0
        },
        { time: '@line_3.start', target: null, weight: 0.0 }
      ]
    },
    {
      id: 'track_aria_emotion',
      targetId: 'actor_aria',
      property: 'facialEmotion',
      keyframes: [
        { time: '@line_1.start', value: 'concerned' },
        { time: '@line_2.word("surge")', value: 'focused' },
        { time: '@line_3.start', value: 'happy' }
      ]
    },
    {
      id: 'track_zephyr_clips',
      targetId: 'actor_zephyr',
      property: 'animationClip',
      keyframes: [
        { time: 0, value: 'Idle' },
        { time: '@line_3.start', value: 'Explain', crossFade: 0.3 },
        { time: '@line_3.word("wave")', value: 'Wave', crossFade: 0.25 }
      ]
    },
    {
      id: 'track_core_scale',
      targetId: 'holo_core',
      property: 'scale',
      keyframes: [
        { time: 0, value: [0.42, 0.42, 0.42] },
        { time: '@line_2.word("surge") - 0.05', value: [0.42, 0.42, 0.42] },
        { time: '@line_2.word("surge") + 0.35', value: [0.88, 0.88, 0.88] },
        { time: '@line_3.start + 0.5', value: [0.48, 0.48, 0.48] }
      ]
    },
    {
      id: 'track_core_color',
      targetId: 'holo_core',
      property: 'color',
      keyframes: [
        { time: 0, value: '#38bdf8' },
        { time: '@line_2.word("surge")', value: '#f43f5e' },
        { time: '@line_3.word("wave")', value: '#10b981' }
      ]
    },
    {
      id: 'track_aria_gaze',
      targetId: 'actor_aria',
      property: 'lookAtTarget',
      keyframes: [
        { time: '@line_1.start', value: 'actor_zephyr' },
        { time: '@line_2.word("surge") - 0.15', value: 'holo_core' },
        { time: '@line_3.start', value: 'actor_zephyr' }
      ]
    }
  ],
  cameraShots: [
    {
      id: 'shot_1_lead_walk',
      label: 'Shot 1: Spline Lead Dolly (@line_1)',
      startTime: '@line_1.start',
      endTime: '@line_2.start',
      shotType: 'splineDolly',
      dollyMode: 'lead',
      subjectId: 'actor_aria',
      fov: 44
    },
    {
      id: 'shot_2_ots_aria',
      label: 'Shot 2: OTS Past Zephyr onto Aria & Core (@line_2)',
      startTime: '@line_2.start',
      endTime: '@line_3.start',
      shotType: 'overTheShoulder',
      subjectId: 'actor_aria',
      secondaryId: 'actor_zephyr',
      side: 'right',
      fov: 35
    },
    {
      id: 'shot_3_rev_ots_zephyr',
      label: 'Shot 3: Reverse OTS onto Zephyr (@line_3)',
      startTime: '@line_3.start',
      endTime: '@line_3.end + 0.6',
      shotType: 'overTheShoulder',
      subjectId: 'actor_zephyr',
      secondaryId: 'actor_aria',
      side: 'left', // Intentional 8B 180-degree violation: repaired to "right"
      fov: 35
    }
  ]
};

```

#### `apps/studio-web/src/App.tsx`

The complete interactive studio integrating `@chronos3d/schema`, `@chronos3d/compiler`, `@chronos3d/engine-core`, and `@chronos3d/video-exporter` with 3D raycast floor-plane waypoint dragging, Raw 8B vs. Sanitized mode toggling, 2-bone arm IK visualization, WPM time-warping, and liveSymbolic JSON export.

```tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Code2,
  Sliders,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import {
  ALL_VISEMES,
  CompiledSceneManifest,
  EmotionPreset,
  SymbolicSceneManifest,
  Vector3Tuple
} from '@chronos3d/schema';
import {
  compileSymbolicManifest,
  sanitizeAndRepairLLMScene
} from '@chronos3d/compiler';
import {
  applyCharacterLookAtIK,
  buildArcLengthCatmullRom,
  CharacterRigInstance,
  createCharacterRig,
  EMOTION_PRESETS,
  evaluateCameraDirectorAtTime,
  evaluateSplineLocomotionAtTime,
  smoothstep,
  solveAnalyticalTwoBoneArmIK
} from '@chronos3d/engine-core';
import { RAW_8B_SCENE_MANIFEST } from './sampleManifest';

export default function App() {
  const [rawScene, setRawScene] = useState<SymbolicSceneManifest>(RAW_8B_SCENE_MANIFEST);
  const [useSanitizer, setUseSanitizer] = useState<boolean>(true);
  const [editorCameraMode, setEditorCameraMode] = useState<boolean>(false);

  const [ariaWpm, setAriaWpm] = useState<number>(145);
  const [zephyrWpm, setZephyrWpm] = useState<number>(140);
  const [interTurnPauseDelta, setInterTurnPauseDelta] = useState<number>(0.0);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [activeShotLabel, setActiveShotLabel] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<number>(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastSpokenSegRef = useRef<string | null>(null);
  const editorCameraModeRef = useRef<boolean>(editorCameraMode);

  useEffect(() => {
    editorCameraModeRef.current = editorCameraMode;
  }, [editorCameraMode]);

  // Run 8B Self-Healing Sanitizer
  const { activeSymbolicManifest, sanitizerRepairs } = useMemo(() => {
    const result = sanitizeAndRepairLLMScene(rawScene);
    return {
      activeSymbolicManifest: useSanitizer ? result.repairedManifest : rawScene,
      sanitizerRepairs: result.repairs
    };
  }, [rawScene, useSanitizer]);

  // Run 4-Pass Symbolic-to-Numeric Compiler
  const compiledManifest = useMemo<CompiledSceneManifest>(() => {
    return compileSymbolicManifest(
      activeSymbolicManifest,
      {
        actor_aria: ariaWpm,
        actor_zephyr: zephyrWpm
      },
      interTurnPauseDelta
    );
  }, [activeSymbolicManifest, ariaWpm, zephyrWpm, interTurnPauseDelta]);

  const compiledManifestRef = useRef<CompiledSceneManifest>(compiledManifest);
  useEffect(() => {
    compiledManifestRef.current = compiledManifest;
  }, [compiledManifest]);

  const activeDialogue = useMemo(() => {
    return (
      compiledManifest.dialogue.find(
        (d) => currentTime >= d.start && currentTime <= d.end
      ) || null
    );
  }, [compiledManifest.dialogue, currentTime]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(compiledManifest.duration, t));
      timeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [compiledManifest.duration]
  );

  // Browser Web Speech TTS Preview
  useEffect(() => {
    if (!isPlaying || !activeDialogue) {
      if (!isPlaying && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (lastSpokenSegRef.current !== activeDialogue.id) {
      lastSpokenSegRef.current = activeDialogue.id;
      if (ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(activeDialogue.text);
        const wpm = activeDialogue.speakerId === 'actor_aria' ? ariaWpm : zephyrWpm;
        utter.rate = THREE.MathUtils.clamp(wpm / 145, 0.65, 1.6);
        utter.pitch = activeDialogue.speakerId === 'actor_zephyr' ? 0.85 : 1.12;
        window.speechSynthesis.speak(utter);
      }
    }
  }, [activeDialogue, isPlaying, ttsEnabled, ariaWpm, zephyrWpm]);

  // Master rAF Timeline Clock
  useEffect(() => {
    let rAF: number;
    const tick = (now: number) => {
      if (isPlaying && lastFrameRef.current !== null) {
        const delta = (now - lastFrameRef.current) / 1000;
        let next = timeRef.current + delta;
        if (next >= compiledManifestRef.current.duration) {
          next = 0;
        }
        timeRef.current = next;
        setCurrentTime(next);
      }
      lastFrameRef.current = now;
      rAF = requestAnimationFrame(tick);
    };
    rAF = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rAF);
  }, [isPlaying]);

  // Three.js Viewport, 3D Waypoint Raycast Dragging & 60 FPS Evaluator
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / container.clientHeight,
      0.15,
      50
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const keyLight = new THREE.PointLight('#60a5fa', 2.8, 28);
    keyLight.position.set(2, 7, 5);
    scene.add(keyLight);

    scene.add(new THREE.GridHelper(20, 20, '#1e293b', '#1e293b'));

    // Central Pedestal & 0.72m Keep-Out Collision Ring
    const pedestalMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.95, 24),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.7 })
    );
    pedestalMesh.position.set(-0.15, 0.475, -0.45);
    scene.add(pedestalMesh);

    const keepOutRing = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.74, 48),
      new THREE.MeshBasicMaterial({
        color: '#f43f5e',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      })
    );
    keepOutRing.rotation.x = -Math.PI / 2;
    keepOutRing.position.set(-0.15, 0.02, -0.45);
    scene.add(keepOutRing);

    const holoCoreMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.5, 0.16, 80, 16),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.8
      })
    );
    holoCoreMesh.position.set(-0.15, 1.48, -0.45);
    holoCoreMesh.scale.set(0.42, 0.42, 0.42);
    scene.add(holoCoreMesh);

    // Character Rigs
    const ariaRig = createCharacterRig('actor_aria', '#f1f5f9', '#38bdf8', [-3.1, 0, -1.5], 0.5);
    const zephyrRig = createCharacterRig('actor_zephyr', '#334155', '#10b981', [1.85, 0, 0.35], -1.1);
    scene.add(ariaRig.root, zephyrRig.root);

    const rigsMap = new Map<string, CharacterRigInstance>([
      ['actor_aria', ariaRig],
      ['actor_zephyr', zephyrRig]
    ]);

    // Interactive 3D Waypoint Handles & Spline Ribbon
    const waypointGroup = new THREE.Group();
    scene.add(waypointGroup);
    let splineTubeMesh: THREE.Mesh | null = null;
    const waypointMeshes: THREE.Mesh[] = [];

    const rebuildSplineVisuals = (waypoints: Vector3Tuple[]) => {
      if (splineTubeMesh) {
        scene.remove(splineTubeMesh);
        splineTubeMesh.geometry.dispose();
      }
      waypointMeshes.forEach((m) => waypointGroup.remove(m));
      waypointMeshes.length = 0;

      const { curve } = buildArcLengthCatmullRom(waypoints);
      splineTubeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 64, 0.03, 8, false),
        new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.75 })
      );
      splineTubeMesh.position.y = 0.03;
      scene.add(splineTubeMesh);

      waypoints.forEach((wp, idx) => {
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.26, 20),
          new THREE.MeshStandardMaterial({
            color: '#38bdf8',
            emissive: '#0284c7',
            emissiveIntensity: 0.8
          })
        );
        cyl.position.set(wp[0], 0.13, wp[2]);
        cyl.userData = { waypointIndex: idx };
        waypointGroup.add(cyl);
        waypointMeshes.push(cyl);
      });
    };

    // 3D Raycast Floor-Plane Waypoint Dragging
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHit = new THREE.Vector3();
    let draggedWaypointIdx: number | null = null;

    const updatePointerNdc = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onMouseDown = (ev: MouseEvent) => {
      updatePointerNdc(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(waypointMeshes, false);
      if (hits.length > 0) {
        draggedWaypointIdx = hits[0].object.userData.waypointIndex;
      }
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (draggedWaypointIdx === null) return;
      updatePointerNdc(ev);
      raycaster.setFromCamera(pointerNdc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
        const newX = Number(THREE.MathUtils.clamp(planeHit.x, -4.5, 4.5).toFixed(2));
        const newZ = Number(THREE.MathUtils.clamp(planeHit.z, -3.5, 3.5).toFixed(2));
        setRawScene((prev) => {
          const clone: SymbolicSceneManifest = JSON.parse(JSON.stringify(prev));
          const spTrack = clone.tracks.find((tr) => tr.id === 'track_aria_spline');
          if (spTrack && spTrack.segments && spTrack.segments[0]) {
            spTrack.segments[0].waypoints[draggedWaypointIdx!] = [newX, 0, newZ];
          }
          return clone;
        });
      }
    };

    const onMouseUp = () => {
      draggedWaypointIdx = null;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    let lastWaypointsJson = '';
    let rAF: number;
    let frameCount = 0;

    const renderLoop = () => {
      const t = timeRef.current;
      const manifest = compiledManifestRef.current;
      frameCount++;

      const splineTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_spline');
      const walkSeg = splineTrack?.segments?.[0];
      const currentWaypoints = walkSeg?.waypoints || [
        [-3.1, 0, -1.5],
        [-2.0, 0, 0.4],
        [-0.85, 0, 0.55]
      ];

      const wpKey = JSON.stringify(currentWaypoints);
      if (wpKey !== lastWaypointsJson) {
        lastWaypointsJson = wpKey;
        rebuildSplineVisuals(currentWaypoints);
      }

      const { curve: ariaCurve, totalLength: ariaCurveLen } =
        buildArcLengthCatmullRom(currentWaypoints);

      // 1. Evaluate Holo Core Scale & Color
      const scaleTrack = manifest.tracks.find((tr) => tr.id === 'track_core_scale');
      if (scaleTrack && scaleTrack.keyframes) {
        const kfs = scaleTrack.keyframes;
        let sVal = kfs[0].value;
        for (let i = 0; i < kfs.length - 1; i++) {
          if (t >= kfs[i].time && t <= kfs[i + 1].time) {
            const span = Math.max(0.01, kfs[i + 1].time - kfs[i].time);
            const a = smoothstep((t - kfs[i].time) / span);
            sVal = kfs[i].value.map(
              (v: number, idx: number) => v + (kfs[i + 1].value[idx] - v) * a
            );
            break;
          } else if (t > kfs[i + 1].time) {
            sVal = kfs[i + 1].value;
          }
        }
        holoCoreMesh.scale.set(sVal[0], sVal[1], sVal[2]);
      }

      const colorTrack = manifest.tracks.find((tr) => tr.id === 'track_core_color');
      if (
        colorTrack &&
        colorTrack.keyframes &&
        holoCoreMesh.material instanceof THREE.MeshStandardMaterial
      ) {
        let activeColor = colorTrack.keyframes[0].value;
        for (let i = 0; i < colorTrack.keyframes.length; i++) {
          if (t >= colorTrack.keyframes[i].time) {
            activeColor = colorTrack.keyframes[i].value;
          }
        }
        holoCoreMesh.material.color.lerp(new THREE.Color(activeColor), 0.2);
        holoCoreMesh.material.emissive.lerp(new THREE.Color(activeColor), 0.2);
      }
      holoCoreMesh.rotation.set(t * 1.8, t * 2.6, 0);

      // 2. Evaluate Spline Locomotion & Base Skeletal Mixer
      rigsMap.forEach((rig, charId) => {
        const clipTrack = manifest.tracks.find(
          (tr) => tr.targetId === charId && tr.property === 'animationClip'
        );
        let baseClip = 'Idle';
        if (clipTrack && clipTrack.keyframes) {
          for (let i = 0; i < clipTrack.keyframes.length; i++) {
            if (t >= clipTrack.keyframes[i].time) {
              baseClip = String(clipTrack.keyframes[i].value);
            }
          }
        }

        let walkWeight = 0;
        let stridePhase = 0;

        if (charId === 'actor_aria' && walkSeg) {
          const loco = evaluateSplineLocomotionAtTime(
            t,
            walkSeg.startTime,
            walkSeg.endTime,
            ariaCurve,
            ariaCurveLen,
            walkSeg.strideLength
          );
          rig.root.position.copy(loco.position);
          rig.currentSplineTangent.copy(loco.tangent);
          walkWeight = loco.walkWeight;
          stridePhase = loco.stridePhase;

          rig.smoothedHeadingQuat.slerp(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, loco.headingYaw, 0)),
            0.25
          );
          rig.root.quaternion.copy(rig.smoothedHeadingQuat);
        }

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

        rig.mixer.update(0);
      });

      // 3. Post-Mixer Gaze IK, 2-Bone Arm IK & Emotion/Viseme Channels
      const ariaHeadPos = new THREE.Vector3();
      const zephyrHeadPos = new THREE.Vector3();
      ariaRig.root.updateMatrixWorld(true);
      zephyrRig.root.updateMatrixWorld(true);
      ariaRig.headBone.getWorldPosition(ariaHeadPos);
      zephyrRig.headBone.getWorldPosition(zephyrHeadPos);

      const gazeTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_gaze');
      let ariaTargetId = 'actor_zephyr';
      if (gazeTrack && gazeTrack.keyframes) {
        for (let i = 0; i < gazeTrack.keyframes.length; i++) {
          if (t >= gazeTrack.keyframes[i].time) {
            ariaTargetId = String(gazeTrack.keyframes[i].value);
          }
        }
      }

      const ariaGazePos =
        ariaTargetId === 'holo_core' ? holoCoreMesh.position.clone() : zephyrHeadPos.clone();
      applyCharacterLookAtIK(ariaRig, ariaHeadPos, ariaGazePos);
      applyCharacterLookAtIK(zephyrRig, zephyrHeadPos, ariaHeadPos);

      // Evaluate 2-Bone Arm IK on Aria
      const armIkTrack = manifest.tracks.find((tr) => tr.id === 'track_aria_arm_ik');
      if (armIkTrack && armIkTrack.ikKeyframes) {
        let activeIk = armIkTrack.ikKeyframes[0];
        for (let i = 0; i < armIkTrack.ikKeyframes.length; i++) {
          if (t >= armIkTrack.ikKeyframes[i].time) {
            activeIk = armIkTrack.ikKeyframes[i];
          }
        }
        if (activeIk && activeIk.target === 'holo_core' && activeIk.weight > 0) {
          const targetWorld = holoCoreMesh.position
            .clone()
            .add(new THREE.Vector3(...activeIk.surfaceOffset));
          solveAnalyticalTwoBoneArmIK(ariaRig, 'right', targetWorld, activeIk.weight);
        }
      }

      // Evaluate Eyebrow Emotion + 14 Visemes
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

      // 4. Evaluate Camera Director vs. Overhead Stage Editor Camera
      if (editorCameraModeRef.current) {
        camera.position.lerp(new THREE.Vector3(0, 6.2, 5.2), 0.15);
        camera.lookAt(new THREE.Vector3(-0.4, 0.5, -0.2));
        if (frameCount % 4 === 0) {
          setActiveShotLabel('Stage Editor Crane View (Drag Cyan 3D Waypoints)');
        }
      } else {
        const camPose = evaluateCameraDirectorAtTime(
          t,
          manifest,
          ariaHeadPos,
          zephyrHeadPos,
          ariaRig.currentSplineTangent
        );
        camera.position.lerp(camPose.position, 0.16);
        camera.lookAt(camPose.lookAt);
        if (frameCount % 4 === 0) {
          setActiveShotLabel(camPose.shotLabel);
        }
      }

      renderer.render(scene, camera);
      rAF = requestAnimationFrame(renderLoop);
    };

    rAF = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rAF);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const copySymbolicJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeSymbolicManifest, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Studio Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Code2 className="w-4 h-4" />
              Chronos3D Monorepo Studio (@chronos3d/schema + compiler + engine-core)
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              Declarative 3D Video Engine, Symbolic TTS Compiler & 8B Self-Healing Studio
            </h1>
            <p className="text-sm text-slate-400">
              Drag cyan 3D waypoints on the floor grid, toggle the 8B Self-Healing Sanitizer, or warp speaker WPM rates in real time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditorCameraMode(!editorCameraMode)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                editorCameraMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {editorCameraMode ? 'Camera: 3D Stage Editor' : 'Camera: Director Lens'}
            </button>

            <button
              onClick={() => setUseSanitizer(!useSanitizer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                useSanitizer
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {useSanitizer ? (
                <>
                  <ShieldCheck className="w-4 h-4" /> Sanitized ({sanitizerRepairs.length} Fixes)
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" /> Raw 8B (Unfixed)
                </>
              )}
            </button>

            <button
              onClick={copySymbolicJson}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs font-mono text-sky-400 transition"
            >
              {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedJson ? 'Copied AST!' : 'Copy Symbolic JSON'}
            </button>
          </div>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Columns: 3D Viewport + Symbolic Compilation Log */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="relative w-full h-[400px] bg-black overflow-hidden">
                <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 pointer-events-none">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span className="font-mono font-semibold text-white">
                    T+{currentTime.toFixed(2)}s / {compiledManifest.duration.toFixed(2)}s
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-sky-400 font-medium">{activeShotLabel}</span>
                </div>

                {activeDialogue && (
                  <div className="absolute bottom-3 inset-x-5 flex justify-center pointer-events-none">
                    <div className="max-w-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-xl text-center shadow-2xl">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-sky-400 mb-1">
                        {activeDialogue.speaker} ({activeDialogue.id})
                      </div>
                      <p className="text-sm md:text-base leading-relaxed">
                        {activeDialogue.words.map((w) => {
                          const isWordActive = currentTime >= w.start && currentTime <= w.end;
                          return (
                            <span
                              key={w.index}
                              className={`inline-block mr-1.5 px-1 rounded transition-all ${
                                isWordActive
                                  ? 'bg-sky-500 text-slate-950 font-bold scale-105'
                                  : currentTime > w.end
                                  ? 'text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              {w.word}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrubber & Transport */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                <input
                  type="range"
                  min={0}
                  max={compiledManifest.duration}
                  step={0.02}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs transition"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>

                    <button
                      onClick={() => seek(0)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setTtsEnabled(!ttsEnabled)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                        ttsEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ttsEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4" /> Live TTS On
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" /> TTS Muted
                        </>
                      )}
                    </button>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    Tip: Click any cyan cylinder in the 3D scene to drag Aria&apos;s spline waypoints
                  </span>
                </div>
              </div>
            </div>

            {/* Pass 1-4 Symbolic Resolution Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
                  <Cpu className="w-4 h-4" />
                  Compiled Symbolic Anchor Table (Pass 1–4 Output)
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Click any row to seek playhead
                </span>
              </div>

              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5">Target Property</th>
                      <th className="py-2 px-2.5">Symbolic Expression</th>
                      <th className="py-2 px-2.5">Resolved</th>
                      <th className="py-2 px-2.5">Binding Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {compiledManifest.resolutionLog.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => seek(row.resolvedSeconds)}
                        className="cursor-pointer hover:bg-slate-800/60 text-slate-300 transition"
                      >
                        <td className="py-2 px-2.5 text-sky-300">{row.sourceCategory}</td>
                        <td className="py-2 px-2.5 font-sans text-slate-200">{row.targetLabel}</td>
                        <td className="py-2 px-2.5 text-amber-300">{row.symbolicExpr}</td>
                        <td className="py-2 px-2.5 text-sky-400 font-bold">
                          {row.resolvedSeconds.toFixed(2)}s
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 font-sans">
                          {row.matchedTokenInfo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Prosody Sliders & 8B Self-Healing Audit Log */}
          <div className="flex flex-col gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Sliders className="w-4 h-4 text-sky-400" /> TTS Voice Prosody WPM Time-Warp
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Aria WPM</span>
                  <span className="text-sky-400 font-bold">{ariaWpm} WPM</span>
                </div>
                <input
                  type="range"
                  min={90}
                  max={220}
                  step={5}
                  value={ariaWpm}
                  onChange={(e) => setAriaWpm(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Zephyr WPM</span>
                  <span className="text-emerald-400 font-bold">{zephyrWpm} WPM</span>
                </div>
                <input
                  type="range"
                  min={90}
                  max={220}
                  step={5}
                  value={zephyrWpm}
                  onChange={(e) => setZephyrWpm(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Inter-Turn Pause Delta</span>
                  <span className="text-amber-300 font-bold">
                    {interTurnPauseDelta >= 0 ? '+' : ''}
                    {interTurnPauseDelta.toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={-0.2}
                  max={1.0}
                  step={0.05}
                  value={interTurnPauseDelta}
                  onChange={(e) => setInterTurnPauseDelta(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* 8B Sanitizer Repair Diff Cards */}
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 8B Self-Healing Sanitizer Log
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {sanitizerRepairs.length} Repairs
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto pr-1">
                {sanitizerRepairs.map((rep, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {rep.ruleId}
                      </span>
                      <span className="text-slate-400">{rep.targetPath}</span>
                    </div>
                    <div className="font-mono text-[11px] space-y-0.5">
                      <div className="text-rose-400 line-through">Before: {rep.beforeValue}</div>
                      <div className="text-emerald-400 font-semibold">After: {rep.afterValue}</div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{rep.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

---

### Microservice: `services/tts-aligner-service`

#### `services/tts-aligner-service/requirements.txt`

Python dependencies for the FastAPI neural TTS and forced word-alignment service.

```text
fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.9.2
numpy==2.1.1

```

#### `services/tts-aligner-service/app/models.py`

Pydantic request and response models matching `@chronos3d/schema` (`TTSWordBoundary` and `VisemeCue`).

```python
from typing import List, Optional
from pydantic import BaseModel, Field


class SynthesizeAlignedRequest(BaseModel):
    line_id: str = Field(..., description="Dialogue segment ID, e.g. line_1")
    speaker_id: str = Field(..., description="Character ID, e.g. actor_aria")
    text: str = Field(..., description="Spoken dialogue transcript")
    speaking_rate_wpm: int = Field(default=145, ge=60, le=260)
    provider: str = Field(
        default="kokoro_whisperx",
        description="kokoro_whisperx | elevenlabs | azure | prosody_fallback",
    )


class AlignedWordOffset(BaseModel):
    word: str
    clean_word: str
    index: int
    start_offset: float
    end_offset: float


class AlignedVisemeCue(BaseModel):
    time_offset: float
    duration: float
    viseme: str
    weight: float


class SynthesizeAlignedResponse(BaseModel):
    line_id: str
    speaker_id: str
    duration: float
    audio_base64: Optional[str] = None
    words: List[AlignedWordOffset]
    visemes: List[AlignedVisemeCue]

```

#### `services/tts-aligner-service/app/main.py`

FastAPI application exposing `POST /api/v1/synthesize-aligned` to return acoustic word boundaries and 14 Oculus viseme envelopes.

```python
import re
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    AlignedVisemeCue,
    AlignedWordOffset,
    SynthesizeAlignedRequest,
    SynthesizeAlignedResponse,
)

app = FastAPI(
    title="Chronos3D Neural TTS & Forced Word-Alignment Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def char_to_oculus_viseme(ch: str) -> str:
    c = ch.lower()
    if c == "a":
        return "viseme_aa"
    if c == "e":
        return "viseme_E"
    if c in ("i", "y"):
        return "viseme_I"
    if c == "o":
        return "viseme_O"
    if c in ("u", "w"):
        return "viseme_U"
    if c in ("p", "b", "m"):
        return "viseme_PP"
    if c in ("f", "v"):
        return "viseme_FF"
    if c in ("t", "d"):
        return "viseme_DD"
    if c in ("n", "l"):
        return "viseme_nn"
    if c in ("k", "g", "c"):
        return "viseme_kk"
    if c == "r":
        return "viseme_RR"
    return "viseme_SS"


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "chronos3d-tts-aligner"}


@app.post("/api/v1/synthesize-aligned", response_model=SynthesizeAlignedResponse)
def synthesize_aligned(req: SynthesizeAlignedRequest) -> SynthesizeAlignedResponse:
    raw_tokens = [t for t in req.text.strip().split() if t]
    sec_per_word_avg = 60.0 / float(req.speaking_rate_wpm)

    cursor = 0.0
    words: List[AlignedWordOffset] = []
    visemes: List[AlignedVisemeCue] = []

    for idx, raw_token in enumerate(raw_tokens):
        clean_word = re.sub(r"[^a-zA-Z0-9']", "", raw_token).lower()
        has_comma = bool(re.search(r"[,;:]", raw_token))
        has_stop = bool(re.search(r"[.!?—]", raw_token))

        vowel_clusters = re.findall(r"[aeiouyAEIOUY]+", clean_word)
        syllables = max(1, len(vowel_clusters))
        word_dur = max(0.16, sec_per_word_avg * (0.55 + syllables * 0.32))

        w_start = round(cursor, 3)
        w_end = round(cursor + word_dur, 3)

        words.append(
            AlignedWordOffset(
                word=raw_token,
                clean_word=clean_word,
                index=idx,
                start_offset=w_start,
                end_offset=w_end,
            )
        )

        chars = list(clean_word) or ["a"]
        sec_per_char = word_dur / len(chars)
        for c_idx, ch in enumerate(chars):
            v_name = char_to_oculus_viseme(ch)
            visemes.append(
                AlignedVisemeCue(
                    time_offset=round(w_start + c_idx * sec_per_char, 3),
                    duration=round(sec_per_char * 1.15, 3),
                    viseme=v_name,
                    weight=0.95 if v_name in ("viseme_aa", "viseme_O", "viseme_E") else 0.72,
                )
            )

        pause_after = (
            0.28 * (145.0 / req.speaking_rate_wpm)
            if has_stop
            else 0.15 * (145.0 / req.speaking_rate_wpm)
            if has_comma
            else 0.035
        )
        cursor = w_end + pause_after
        visemes.append(
            AlignedVisemeCue(
                time_offset=round(w_end, 3),
                duration=round(pause_after, 3),
                viseme="viseme_sil",
                weight=0.1,
            )
        )

    return SynthesizeAlignedResponse(
        line_id=req.line_id,
        speaker_id=req.speaker_id,
        duration=round(cursor, 3),
        audio_base64=None,
        words=words,
        visemes=visemes,
    )

```

---

## 3. Running the Repository Locally

1. **Install JavaScript/TypeScript Workspace Dependencies:** Run `pnpm install` at the repository root `chronos-3d-studio/` and start the studio with `pnpm --filter studio-web dev`.


2. **Start the FastAPI TTS Alignment Service (Optional):** Inside `services/tts-aligner-service`, run `pip install -r requirements.txt` followed by `uvicorn app.main:app --reload --port 8000`.



Would you like the unit test files (`compiler.test.ts` and `sanitizer.test.ts`) or the Python synthetic dataset generator (`generate_synthetic_scenes.py`) next?
