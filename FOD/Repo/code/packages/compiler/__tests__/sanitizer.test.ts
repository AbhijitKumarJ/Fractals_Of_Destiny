import { describe, it, expect } from 'vitest';
import { STAGE_OBSTACLES, SymbolicSceneManifest } from '@chronos3d/schema';
import { sanitizeAndRepairLLMScene } from '../src';

describe('@chronos3d/compiler — 8B Self-Healing Sanitizer (sanitizeAndRepairLLMScene)', () => {
  it('repairs unchained dialogue start=0, morphological word stems, pedestal collisions, and 180-degree violations', () => {
    const rawHallucinatedManifest: SymbolicSceneManifest = {
      id: 'hallucinated_8b_scene',
      title: 'Raw 8B Output with 4 Classic Errors',
      dialogue: [
        {
          id: 'line_1',
          speakerId: 'actor_aria',
          speaker: 'ARIA',
          start: 0.2,
          text: 'I am approaching the central pedestal now.'
        },
        {
          id: 'line_2',
          speakerId: 'actor_zephyr',
          speaker: 'ZEPHYR',
          start: 0, // Error 1: Unchained second dialogue line at t=0
          text: 'The energy readings are surging rapidly!'
        }
      ],
      tracks: [
        {
          id: 'track_aria_walk',
          targetId: 'actor_aria',
          property: 'splinePath',
          segments: [
            {
              id: 'seg_collision',
              startTime: '@line_1.start',
              endTime: '@line_1.end',
              waypoints: [
                [-3.0, 0, -1.2],
                [-0.18, 0, -0.42] // Error 2: Inside pedestal keep-out zone (center [-0.15, -0.45], R=0.72)
              ]
            }
          ]
        },
        {
          id: 'track_zephyr_gesture',
          targetId: 'actor_zephyr',
          property: 'animationClip',
          keyframes: [
            {
              time: '@line_2.word("surge") - 0.1', // Error 3: "surge" stem vs spoken "surging"
              value: 'PointRight'
            }
          ]
        }
      ],
      cameraShots: [
        {
          id: 'shot_1',
          label: 'OTS 1',
          startTime: '@line_1.start',
          endTime: '@line_2.start',
          shotType: 'overTheShoulder',
          subjectId: 'actor_aria',
          secondaryId: 'actor_zephyr',
          side: 'right'
        },
        {
          id: 'shot_2',
          label: 'OTS 2 Reverse',
          startTime: '@line_2.start',
          endTime: '@line_2.end',
          shotType: 'overTheShoulder',
          subjectId: 'actor_zephyr',
          secondaryId: 'actor_aria',
          side: 'left' // Error 4: Crossed 180-degree camera axis
        }
      ]
    };

    const { repairedManifest, repairs } = sanitizeAndRepairLLMScene(rawHallucinatedManifest);

    expect(repairs.length).toBe(4);

    // Verify Rule 1: Dialogue chaining
    expect(repairedManifest.dialogue[1].start).toBe('@line_1.end + 0.35');

    // Verify Rule 2: Obstacle radial push-out outside 0.72m radius
    const pushedWp = repairedManifest.tracks[0].segments![0].waypoints[1];
    const pedestal = STAGE_OBSTACLES[0];
    const distFromCenter = Math.hypot(
      pushedWp[0] - pedestal.centerXZ[0],
      pushedWp[2] - pedestal.centerXZ[1]
    );
    expect(distFromCenter).toBeGreaterThanOrEqual(pedestal.radius);

    // Verify Rule 3: Morphological stem fuzzy match ("surge" -> "surging")
    expect(repairedManifest.tracks[1].keyframes![0].time).toBe(
      '@line_2.word("surging") - 0.1'
    );

    // Verify Rule 4: 180-degree camera side lock
    expect(repairedManifest.cameraShots[1].side).toBe('right');
  });
});
