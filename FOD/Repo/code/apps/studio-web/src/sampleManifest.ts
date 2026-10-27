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
      id: 'track_zephyr_spline',
      targetId: 'actor_zephyr',
      property: 'splinePath',
      segments: [
        {
          id: 'zephyr_side_step',
          startTime: '@line_2.start',
          endTime: '@line_2.end',
          strideLength: 1.1,
          waypoints: [
            [1.85, 0, 0.35],
            [1.05, 0, 0.85],
            [1.3, 0, 0.15]
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
      fov: 35,
      transitionDuration: 1.0
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
      fov: 35,
      transitionDuration: 0.8
    },
    {
      id: 'shot_4_establishing_orbit',
      label: 'Shot 4: Establishing Orbit Finale',
      startTime: '@line_3.end + 0.6',
      endTime: '@line_3.end + 3.4',
      shotType: 'establishingOrbit',
      subjectId: 'actor_aria',
      side: 'left',
      fov: 50,
      transitionDuration: 1.4
    }
  ],
  decision: {
    id: 'decision_reactor_override',
    triggerTime: '@line_2.end + 0.4',
    promptText: 'The reactor is surging. Override the safeties, or hold the protocol?',
    timeoutSeconds: 12,
    defaultChoiceId: 'choice_hold_protocol',
    choices: [
      {
        id: 'choice_override',
        label: 'Override — push the surge (grants override key, sets surge flag)',
        targetChapterId: 'chapter_override',
        grantItemId: 'override_key',
        setFlag: 'surge_approved'
      },
      {
        id: 'choice_hold_protocol',
        label: 'Hold protocol — stay the course',
        targetChapterId: 'chapter_hold'
      }
    ]
  }
};
