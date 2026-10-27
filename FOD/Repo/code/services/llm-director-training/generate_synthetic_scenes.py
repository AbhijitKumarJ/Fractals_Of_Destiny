import json
import math
import random
from typing import Dict, List, Tuple

PEDESTAL_CENTER = (-0.15, -0.45)
KEEP_OUT_RADIUS = 0.72

SAFE_LANDMARKS: Dict[str, List[float]] = {
    "STAGE_LEFT_BACK": [-3.1, 0.0, -1.5],
    "STAGE_LEFT_MID": [-2.0, 0.0, 0.4],
    "PEDESTAL_APPROACH_WEST": [-0.88, 0.0, 0.45],
    "PEDESTAL_APPROACH_EAST": [0.65, 0.0, 0.35],
    "STAGE_RIGHT_CONSOLE": [1.85, 0.0, 0.35],
    "STAGE_CENTER_FRONT": [0.0, 0.0, 1.45],
}

SCENARIO_TEMPLATES: List[Tuple[str, str, str, str]] = [
    (
        "Aria walks to the pedestal to inspect the unstable core while Zephyr monitors from the console.",
        "Zephyr, I am walking toward the central pedestal to inspect the anomaly.",
        "Watch closely as the core begins surging with unstable plasma!",
        "surging",
    ),
    (
        "Aria approaches the Quantum Core and reaches out to calibrate the harmonic stabilizer.",
        "I am moving into position beside the containment pedestal now.",
        "The moment I touch the stabilizer, the harmonic field locks!",
        "stabilizer",
    ),
    (
        "Aria walks from stage left to the pedestal and activates the emerald containment shield.",
        "Walking across the lab deck to the central containment unit.",
        "Activating the emerald shield matrix on my mark!",
        "shield",
    ),
]


def is_waypoint_collision_free(wp: List[float]) -> bool:
    dx = wp[0] - PEDESTAL_CENTER[0]
    dz = wp[2] - PEDESTAL_CENTER[1]
    return math.hypot(dx, dz) >= KEEP_OUT_RADIUS


def build_synthetic_example(idx: int) -> Dict[str, str]:
    prompt_desc, line1_text, line2_text, trigger_word = random.choice(SCENARIO_TEMPLATES)
    color_hex = random.choice(["#f43f5e", "#10b981", "#facc15", "#38bdf8"])
    emotion = random.choice(["focused", "concerned", "surprised", "determined"])

    waypoints = [
        SAFE_LANDMARKS["STAGE_LEFT_BACK"],
        SAFE_LANDMARKS["STAGE_LEFT_MID"],
        SAFE_LANDMARKS["PEDESTAL_APPROACH_WEST"],
    ]
    assert all(is_waypoint_collision_free(w) for w in waypoints)

    manifest = {
        "id": f"synth_scene_{idx:04d}",
        "title": f"Synthetic Training Scene #{idx}",
        "chapterPlan": prompt_desc,
        "dialogue": [
            {
                "id": "line_1",
                "speakerId": "actor_aria",
                "speaker": "ARIA",
                "start": 0.25,
                "text": line1_text,
            },
            {
                "id": "line_2",
                "speakerId": "actor_aria",
                "speaker": "ARIA",
                "start": "@line_1.end + 0.35",
                "text": line2_text,
            },
            {
                "id": "line_3",
                "speakerId": "actor_zephyr",
                "speaker": "ZEPHYR",
                "start": "@line_2.end + 0.35",
                "text": "Telemetry confirmed! The containment readings are locked.",
            },
        ],
        "tracks": [
            {
                "id": "track_aria_spline",
                "targetId": "actor_aria",
                "property": "splinePath",
                "segments": [
                    {
                        "id": "walk_1",
                        "startTime": "@line_1.start",
                        "endTime": "@line_1.end",
                        "strideLength": 1.25,
                        "waypoints": waypoints,
                    }
                ],
            },
            {
                "id": "track_aria_arm_ik",
                "targetId": "actor_aria",
                "property": "armIK",
                "hand": "right",
                "ikKeyframes": [
                    {"time": "@line_1.start", "target": None, "weight": 0.0},
                    {
                        "time": f'@line_2.word("{trigger_word}") - 0.05',
                        "target": "holo_core",
                        "surfaceOffset": [-0.22, 0.0, 0.18],
                        "weight": 1.0,
                    },
                    {"time": "@line_3.start", "target": None, "weight": 0.0},
                ],
            },
            {
                "id": "track_aria_emotion",
                "targetId": "actor_aria",
                "property": "facialEmotion",
                "keyframes": [
                    {"time": "@line_1.start", "value": "neutral"},
                    {"time": f'@line_2.word("{trigger_word}")', "value": emotion},
                ],
            },
            {
                "id": "track_core_color",
                "targetId": "holo_core",
                "property": "color",
                "keyframes": [
                    {"time": 0, "value": "#38bdf8"},
                    {"time": f'@line_2.word("{trigger_word}")', "value": color_hex},
                ],
            },
        ],
        "cameraShots": [
            {
                "id": "shot_1",
                "label": "Spline Lead Walk",
                "startTime": "@line_1.start",
                "endTime": "@line_2.start",
                "shotType": "splineDolly",
                "dollyMode": "lead",
                "subjectId": "actor_aria",
                "side": "right",
                "fov": 44,
            },
            {
                "id": "shot_2",
                "label": "OTS Past Zephyr onto Aria",
                "startTime": "@line_2.start",
                "endTime": "@line_3.start",
                "shotType": "overTheShoulder",
                "subjectId": "actor_aria",
                "secondaryId": "actor_zephyr",
                "side": "right",
                "fov": 35,
            },
            {
                "id": "shot_3",
                "label": "Reverse OTS onto Zephyr",
                "startTime": "@line_3.start",
                "endTime": "@line_3.end + 0.5",
                "shotType": "overTheShoulder",
                "subjectId": "actor_zephyr",
                "secondaryId": "actor_aria",
                "side": "right",
                "fov": 35,
            },
        ],
    }

    return {
        "instruction": prompt_desc,
        "output": json.dumps(manifest),
    }


if __name__ == "__main__":
    dataset = [build_synthetic_example(i) for i in range(1, 251)]
    with open("synthetic_chronos3d_train.jsonl", "w", encoding="utf-8") as f:
        for row in dataset:
            f.write(json.dumps(row) + "\n")
    print(f"Generated {len(dataset)} verified collision-free scenes.")
