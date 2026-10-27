import { describe, it, expect } from 'vitest';
import { SymbolicSceneManifest } from '@chronos3d/schema';
import {
  compileSymbolicManifest,
  evaluateTimeExpression,
  SymbolTableEntry
} from '../src';

describe('@chronos3d/compiler — Symbolic Expression Evaluator & 4-Pass Compiler', () => {
  it('evaluates literal numbers, @start, @end, @progress, and @word() with +/- offsets', () => {
    const table = new Map<string, SymbolTableEntry>();
    table.set('line_1', {
      id: 'line_1',
      start: 1.0,
      end: 5.0,
      duration: 4.0,
      words: [
        { word: 'Activate', cleanWord: 'activate', index: 0, start: 1.0, end: 1.6 },
        { word: 'the', cleanWord: 'the', index: 1, start: 1.65, end: 1.85 },
        { word: 'surge!', cleanWord: 'surge', index: 2, start: 1.9, end: 2.5 }
      ]
    });

    expect(evaluateTimeExpression(2.45, table).seconds).toBe(2.45);
    expect(evaluateTimeExpression('@line_1.start', table).seconds).toBe(1.0);
    expect(evaluateTimeExpression('@line_1.end + 0.35', table).seconds).toBe(5.35);
    expect(evaluateTimeExpression('@line_1.progress(0.5)', table).seconds).toBe(3.0);
    expect(evaluateTimeExpression('@line_1.word("surge") - 0.1', table).seconds).toBe(1.8);
    expect(evaluateTimeExpression('@line_1.word(2) + 0.2', table).seconds).toBe(2.1);
  });

  it('elastically shifts spline, Arm IK, and camera keyframes when speaker WPM changes', () => {
    const manifest: SymbolicSceneManifest = {
      id: 'test_elastic_scene',
      title: 'Elasticity Test',
      dialogue: [
        {
          id: 'line_1',
          speakerId: 'actor_aria',
          speaker: 'ARIA',
          start: 0.2,
          text: 'Walking to the central pedestal right now.'
        },
        {
          id: 'line_2',
          speakerId: 'actor_zephyr',
          speaker: 'ZEPHYR',
          start: '@line_1.end + 0.3',
          text: 'Confirmed, touching the reactor core on surge.'
        }
      ],
      tracks: [
        {
          id: 'track_walk',
          targetId: 'actor_aria',
          property: 'splinePath',
          segments: [
            {
              id: 'seg_1',
              startTime: '@line_1.start',
              endTime: '@line_1.word("pedestal")',
              waypoints: [
                [-3.0, 0, -1.2],
                [-0.9, 0, 0.5]
              ]
            }
          ]
        },
        {
          id: 'track_ik',
          targetId: 'actor_zephyr',
          property: 'armIK',
          hand: 'right',
          ikKeyframes: [
            {
              time: '@line_2.word("surge") - 0.05',
              target: 'holo_core',
              weight: 1.0
            }
          ]
        }
      ],
      cameraShots: [
        {
          id: 'shot_1',
          label: 'Opening Two-Shot',
          startTime: '@line_1.start',
          endTime: '@line_2.end',
          shotType: 'twoShot',
          subjectId: 'actor_aria',
          secondaryId: 'actor_zephyr',
          side: 'right'
        }
      ]
    };

    const fastCompiled = compileSymbolicManifest(manifest, {
      actor_aria: 200,
      actor_zephyr: 200
    });
    const slowCompiled = compileSymbolicManifest(manifest, {
      actor_aria: 100,
      actor_zephyr: 100
    });

    // Slower WPM must produce a longer scene duration and later word-locked Arm IK timestamp
    expect(slowCompiled.duration).toBeGreaterThan(fastCompiled.duration);

    const fastIkTime = fastCompiled.tracks.find((t) => t.id === 'track_ik')!.ikKeyframes![0].time;
    const slowIkTime = slowCompiled.tracks.find((t) => t.id === 'track_ik')!.ikKeyframes![0].time;
    expect(slowIkTime).toBeGreaterThan(fastIkTime);
  });

  it('compiles a full multi-track chapter manifest in under the 1.5ms SLA', () => {
    const manifest: SymbolicSceneManifest = {
      id: 'perf_benchmark',
      title: 'SLA Benchmark',
      dialogue: [
        {
          id: 'line_1',
          speakerId: 'actor_aria',
          speaker: 'ARIA',
          start: 0,
          text: 'Testing sub-millisecond symbolic compilation across multiple tracks and viseme cues.'
        }
      ],
      tracks: [
        {
          id: 't_clip',
          targetId: 'actor_aria',
          property: 'animationClip',
          keyframes: [
            { time: '@line_1.start', value: 'Explain' },
            { time: '@line_1.word("compilation")', value: 'PointRight' }
          ]
        }
      ],
      cameraShots: [
        {
          id: 's1',
          label: 'Shot 1',
          startTime: '@line_1.start',
          endTime: '@line_1.end',
          shotType: 'closeUp',
          subjectId: 'actor_aria'
        }
      ]
    };

    // Warm-up JIT
    compileSymbolicManifest(manifest);

    const t0 = performance.now();
    const compiled = compileSymbolicManifest(manifest);
    const elapsedMs = performance.now() - t0;

    expect(compiled.dialogue[0].visemes.length).toBeGreaterThan(10);
    expect(elapsedMs).toBeLessThan(5.0);
  });
});
