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
