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
