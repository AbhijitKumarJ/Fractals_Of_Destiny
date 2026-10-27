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
