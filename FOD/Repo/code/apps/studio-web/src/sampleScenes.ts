import { SymbolicSceneManifest } from '@chronos3d/schema';
import { RAW_8B_SCENE_MANIFEST } from './sampleManifest';

export interface SceneLibraryEntry {
  id: string;
  label: string;
  tagline: string;
  manifest: SymbolicSceneManifest;
}

const NEBULA_STANDOFF: SymbolicSceneManifest = {
  id: 'symbolic_nebula_standoff',
  title: 'Nebula Standoff: OTS Action Grammar, Dual Splines & Silence-vs-Hail Branch',
  chapterPlan:
    'Aria scouts in from stage left, Zephyr steps into a cold-reactor bluff, shots alternate OTS and land a closeUp on the bluff before a twoShot decision moment.',
  dialogue: [
    {
      id: 'line_1',
      speakerId: 'actor_aria',
      speaker: 'ARIA',
      start: 0.2,
      text: 'Captain, an encrypted hail from the freighter. They know exactly where we are hiding.'
    },
    {
      id: 'line_2',
      speakerId: 'actor_zephyr',
      speaker: 'ZEPHYR',
      start: '@line_1.end + 0.4',
      text: 'Then we answer on my terms. I am dropping shield power so they read us as a derelict.'
    },
    {
      id: 'line_3',
      speakerId: 'actor_aria',
      speaker: 'ARIA',
      start: '@line_2.end + 0.3',
      text: 'A derelict with a running reactor? Nobody buys that at two hundred meters.'
    },
    {
      id: 'line_4',
      speakerId: 'actor_zephyr',
      speaker: 'ZEPHYR',
      start: '@line_3.end + 0.35',
      text: 'They will if the reactor reads cold. Hold the act and trust the dark.'
    }
  ],
  tracks: [
    {
      id: 'track_aria_spline',
      targetId: 'actor_aria',
      property: 'splinePath',
      segments: [
        {
          id: 'aria_scout_in',
          startTime: '@line_1.start',
          endTime: '@line_1.word("exact") + 0.2',
          strideLength: 1.15,
          waypoints: [
            [-3.1, 0, -1.5],
            [-2.5, 0, -1.0],
            [-2.1, 0, -0.7]
          ]
        }
      ]
    },
    {
      id: 'track_zephyr_spline',
      targetId: 'actor_zephyr',
      property: 'splinePath',
      segments: [
        {
          id: 'zephyr_steps_in',
          startTime: '@line_2.start',
          endTime: '@line_2.end',
          strideLength: 1.05,
          waypoints: [
            [1.85, 0, 0.35],
            [1.35, 0, 0.75],
            [1.15, 0, 0.45]
          ]
        }
      ]
    },
    {
      id: 'track_aria_clips',
      targetId: 'actor_aria',
      property: 'animationClip',
      keyframes: [
        { time: '@line_1.start', value: 'Explain', crossFade: 0.4 },
        { time: '@line_2.start', value: 'Idle', crossFade: 0.5 },
        { time: '@line_3.start', value: 'Explain', crossFade: 0.4 },
        { time: '@line_4.start', value: 'Idle', crossFade: 0.5 }
      ]
    },
    {
      id: 'track_zephyr_clips',
      targetId: 'actor_zephyr',
      property: 'animationClip',
      keyframes: [
        { time: 0, value: 'Idle' },
        { time: '@line_2.start', value: 'Explain', crossFade: 0.35 },
        { time: '@line_2.word("derelict")', value: 'PointRight', crossFade: 0.2 },
        { time: '@line_3.start', value: 'Idle', crossFade: 0.3 },
        { time: '@line_4.word("Hold")', value: 'PointRight', crossFade: 0.2 }
      ]
    },
    {
      id: 'track_aria_gaze',
      targetId: 'actor_aria',
      property: 'lookAtTarget',
      keyframes: [
        { time: '@line_1.start', value: 'actor_zephyr' },
        { time: '@line_3.start', value: 'holo_core' },
        { time: '@line_4.start', value: 'actor_zephyr' }
      ]
    },
    {
      id: 'track_aria_emotion',
      targetId: 'actor_aria',
      property: 'facialEmotion',
      keyframes: [
        { time: '@line_1.start', value: 'concerned' },
        { time: '@line_2.word("terms")', value: 'focused' },
        { time: '@line_3.start', value: 'surprised' },
        { time: '@line_4.start', value: 'determined' }
      ]
    },
    {
      id: 'track_aria_arm_ik',
      targetId: 'actor_aria',
      property: 'armIK',
      hand: 'right',
      ikKeyframes: [
        { time: '@line_1.start', target: null, weight: 0 },
        {
          time: '@line_3.start + 0.1',
          target: 'holo_core',
          surfaceOffset: [-0.22, 0, 0.18],
          weight: 0.85
        },
        { time: '@line_4.start', target: null, weight: 0 }
      ]
    }
  ],
  cameraShots: [
    {
      id: 'shot_1_lead_scout',
      label: 'Shot 1: Spline Lead — Aria scouts in',
      startTime: '@line_1.start',
      endTime: '@line_1.end',
      shotType: 'splineDolly',
      dollyMode: 'lead',
      subjectId: 'actor_aria',
      side: 'left',
      fov: 46,
      transitionDuration: 0
    },
    {
      id: 'shot_2_ots_zephyr',
      label: 'Shot 2: OTS behind Aria — the bluff',
      startTime: '@line_1.end',
      endTime: '@line_2.end',
      shotType: 'overTheShoulder',
      subjectId: 'actor_zephyr',
      secondaryId: 'actor_aria',
      side: 'right',
      fov: 35,
      transitionDuration: 0.9
    },
    {
      id: 'shot_3_rev_ots_aria',
      label: 'Shot 3: Reverse OTS — her doubt',
      startTime: '@line_2.end',
      endTime: '@line_3.end',
      shotType: 'overTheShoulder',
      subjectId: 'actor_aria',
      secondaryId: 'actor_zephyr',
      side: 'right',
      fov: 35,
      transitionDuration: 0.9
    },
    {
      id: 'shot_4_closeup_bluff',
      label: 'Shot 4: Close-up — trust the dark',
      startTime: '@line_3.end',
      endTime: '@line_4.end',
      shotType: 'closeUp',
      subjectId: 'actor_zephyr',
      secondaryId: 'actor_aria',
      side: 'right',
      fov: 34,
      transitionDuration: 0.7
    },
    {
      id: 'shot_5_two_shot_decision',
      label: 'Shot 5: Two-shot — the decision frame',
      startTime: '@line_4.end',
      endTime: '@line_4.end + 2.4',
      shotType: 'twoShot',
      subjectId: 'actor_aria',
      secondaryId: 'actor_zephyr',
      side: 'right',
      fov: 46,
      transitionDuration: 1.0
    }
  ],
  decision: {
    id: 'decision_dark_hail',
    triggerTime: '@line_3.end + 0.3',
    promptText:
      "Zephyr's cold-reactor act is running. Stay silent and hold the bluff, or break silence and hail them first?",
    timeoutSeconds: 10,
    defaultChoiceId: 'choice_stay_dark',
    choices: [
      {
        id: 'choice_stay_dark',
        label: 'Stay silent — the bluff holds (sets silent_running)',
        targetChapterId: 'chapter_dark',
        setFlag: 'silent_running'
      },
      {
        id: 'choice_hail_first',
        label: 'Hail them first — grab the initiative (grants hail key)',
        targetChapterId: 'chapter_hail',
        grantItemId: 'hail_key',
        setFlag: 'comms_open'
      }
    ]
  }
};

const MARS_DISPATCH: SymbolicSceneManifest = {
  id: 'symbolic_mars_dispatch',
  title: 'Mars Dispatch: Follow-Dolly Sci-Doc, Parallel Track & Early-Window Branch',
  chapterPlan:
    'Aria walks out on a follow dolly, Zephyr warns of a squall, a parallel track rides her to the console, a closeUp lands the call, and an establishing orbit sends the rover.',
  dialogue: [
    {
      id: 'line_1',
      speakerId: 'actor_aria',
      speaker: 'ARIA',
      start: 0.3,
      text: 'Mission clock is green. Today the rover leaves the bay and touches Martian regolith for the first time.'
    },
    {
      id: 'line_2',
      speakerId: 'actor_zephyr',
      speaker: 'ZEPHYR',
      start: '@line_1.end + 0.5',
      text: 'Dust telemetry says a squall is forming east of the landing ellipse.'
    },
    {
      id: 'line_3',
      speakerId: 'actor_aria',
      speaker: 'ARIA',
      start: '@line_2.end + 0.4',
      text: 'A squall we can outrun. Opening the bay and arming the deploy sequence now.'
    },
    {
      id: 'line_4',
      speakerId: 'actor_zephyr',
      speaker: 'ZEPHYR',
      start: '@line_3.end + 0.4',
      text: 'Wind margins are thin. Your call, Commander.'
    }
  ],
  tracks: [
    {
      id: 'track_aria_spline',
      targetId: 'actor_aria',
      property: 'splinePath',
      segments: [
        {
          id: 'aria_walkout',
          startTime: '@line_1.start',
          endTime: '@line_2.start',
          strideLength: 1.3,
          waypoints: [
            [-3.1, 0, -1.5],
            [-2.3, 0, -0.6],
            [-1.55, 0, -0.2]
          ]
        }
      ]
    },
    {
      id: 'track_aria_clips',
      targetId: 'actor_aria',
      property: 'animationClip',
      keyframes: [
        { time: '@line_1.start', value: 'Explain', crossFade: 0.5 },
        { time: '@line_2.start', value: 'Idle', crossFade: 0.5 },
        { time: '@line_3.start', value: 'Explain', crossFade: 0.45 },
        { time: '@line_4.start', value: 'Idle', crossFade: 0.5 }
      ]
    },
    {
      id: 'track_zephyr_clips',
      targetId: 'actor_zephyr',
      property: 'animationClip',
      keyframes: [
        { time: 0, value: 'Idle' },
        { time: '@line_2.start', value: 'PointRight', crossFade: 0.4 },
        { time: '@line_3.start', value: 'Explain', crossFade: 0.4 },
        { time: '@line_4.start', value: 'Idle', crossFade: 0.5 }
      ]
    },
    {
      id: 'track_aria_gaze',
      targetId: 'actor_aria',
      property: 'lookAtTarget',
      keyframes: [
        { time: '@line_1.start', value: 'holo_core' },
        { time: '@line_2.start', value: 'actor_zephyr' },
        { time: '@line_3.start', value: 'holo_core' },
        { time: '@line_4.start', value: 'auto' }
      ]
    },
    {
      id: 'track_aria_emotion',
      targetId: 'actor_aria',
      property: 'facialEmotion',
      keyframes: [
        { time: '@line_1.start', value: 'happy' },
        { time: '@line_2.start', value: 'concerned' },
        { time: '@line_3.start', value: 'determined' },
        { time: '@line_4.start', value: 'focused' }
      ]
    },
    {
      id: 'track_aria_arm_ik',
      targetId: 'actor_aria',
      property: 'armIK',
      hand: 'right',
      ikKeyframes: [
        { time: '@line_1.start', target: null, weight: 0 },
        {
          time: '@line_3.start + 0.25',
          target: 'holo_core',
          surfaceOffset: [-0.22, 0, 0.18],
          weight: 0.9
        },
        { time: '@line_4.end', target: null, weight: 0 }
      ]
    },
    {
      id: 'track_core_scale',
      targetId: 'holo_core',
      property: 'scale',
      keyframes: [
        { time: 0, value: [0.42, 0.42, 0.42] },
        { time: '@line_3.start + 0.25', value: [0.72, 0.72, 0.72], crossFade: 0.3 },
        { time: '@line_4.end', value: [0.5, 0.5, 0.5], crossFade: 0.4 }
      ]
    },
    {
      id: 'track_core_color',
      targetId: 'holo_core',
      property: 'color',
      keyframes: [
        { time: 0, value: '#38bdf8' },
        { time: '@line_3.start + 0.25', value: '#f59e0b' },
        { time: '@line_4.end', value: '#38bdf8' }
      ]
    }
  ],
  cameraShots: [
    {
      id: 'shot_1_follow_walkout',
      label: 'Shot 1: Follow dolly — walkout',
      startTime: '@line_1.start',
      endTime: '@line_1.end',
      shotType: 'splineDolly',
      dollyMode: 'follow',
      subjectId: 'actor_aria',
      side: 'left',
      fov: 46,
      transitionDuration: 0
    },
    {
      id: 'shot_2_ots_zephyr',
      label: 'Shot 2: OTS — squall warning',
      startTime: '@line_1.end',
      endTime: '@line_2.end',
      shotType: 'overTheShoulder',
      subjectId: 'actor_zephyr',
      secondaryId: 'actor_aria',
      side: 'right',
      fov: 35,
      transitionDuration: 0.9
    },
    {
      id: 'shot_3_parallel_ride',
      label: 'Shot 3: Parallel track — mission stride',
      startTime: '@line_2.end',
      endTime: '@line_3.end',
      shotType: 'splineDolly',
      dollyMode: 'parallel',
      subjectId: 'actor_aria',
      side: 'left',
      fov: 44,
      transitionDuration: 1.0
    },
    {
      id: 'shot_4_closeup_call',
      label: 'Shot 4: Close-up — the call',
      startTime: '@line_3.end',
      endTime: '@line_4.end',
      shotType: 'closeUp',
      subjectId: 'actor_aria',
      secondaryId: 'actor_zephyr',
      side: 'right',
      fov: 34,
      transitionDuration: 0.7
    },
    {
      id: 'shot_5_orbit_send',
      label: 'Shot 5: Establishing orbit — the send-off',
      startTime: '@line_4.end',
      endTime: '@line_4.end + 3.2',
      shotType: 'establishingOrbit',
      subjectId: 'actor_aria',
      side: 'left',
      fov: 50,
      transitionDuration: 1.2
    }
  ],
  decision: {
    id: 'decision_early_window',
    triggerTime: '@line_3.end + 0.3',
    promptText: 'Deploy the rover into the early window, or hold and wait out the squall?',
    timeoutSeconds: 12,
    defaultChoiceId: 'choice_deploy_now',
    choices: [
      {
        id: 'choice_deploy_now',
        label: 'Deploy now — race the squall (grants deploy key, sets early_window)',
        targetChapterId: 'chapter_launch',
        grantItemId: 'deploy_key',
        setFlag: 'early_window'
      },
      {
        id: 'choice_wait_out',
        label: 'Wait out the squall — safe but slow',
        targetChapterId: 'chapter_wait'
      }
    ]
  }
};

export const SCENE_LIBRARY: SceneLibraryEntry[] = [
  {
    id: 'reactor_briefing',
    label: 'Reactor Briefing (classic 8B demo)',
    tagline: 'Word-locked spline walk, surge touch, reverse OTS — includes intentional 8B defects',
    manifest: RAW_8B_SCENE_MANIFEST
  },
  {
    id: 'nebula_standoff',
    label: 'Nebula Standoff (OTS action)',
    tagline: 'Bluff confrontation: lead dolly, OTS pair, closeUp and a two-shot decision',
    manifest: NEBULA_STANDOFF
  },
  {
    id: 'mars_dispatch',
    label: 'Mars Dispatch (sci-doc)',
    tagline: 'Follow dolly walkout, parallel ride, deploy close-up, orbit send-off',
    manifest: MARS_DISPATCH
  }
];
