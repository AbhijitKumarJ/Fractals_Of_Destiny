import json
import math
import re
from typing import Any, Dict, List

PEDESTAL_XZ = (-0.15, -0.45)
PEDESTAL_RADIUS = 0.72


def audit_scene_errors(manifest: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    dialogue_words: Dict[str, List[str]] = {}

    for idx, line in enumerate(manifest.get("dialogue", [])):
        if idx > 0 and str(line.get("start")) in ("0", "0.0"):
            errors.append(f"Unchained dialogue {line['id']} at start=0")
        tokens = [
            re.sub(r"[^a-z0-9]", "", w.lower())
            for w in line.get("text", "").split()
        ]
        dialogue_words[line["id"]] = [t for t in tokens if t]

    for track in manifest.get("tracks", []):
        for seg in track.get("segments", []):
            for wp in seg.get("waypoints", []):
                dist = math.hypot(wp[0] - PEDESTAL_XZ[0], wp[2] - PEDESTAL_XZ[1])
                if dist < PEDESTAL_RADIUS:
                    errors.append(f"Waypoint {wp} collides with pedestal ({dist:.2f}m)")

        for kf in track.get("keyframes", []):
            expr = str(kf.get("time", ""))
            m = re.match(r'^@(line_\d+)\.word\(["\']([^"\']+)["\']\)', expr)
            if m:
                line_id, token = m.group(1), m.group(2).lower()
                if token not in dialogue_words.get(line_id, []):
                    errors.append(f"Missing exact word '{token}' in {line_id}")

    return errors


if __name__ == "__main__":
    sample_clean = {
        "dialogue": [
            {"id": "line_1", "start": 0.2, "text": "Walking to the pedestal now."},
            {"id": "line_2", "start": "@line_1.end + 0.35", "text": "Core is surging!"},
        ],
        "tracks": [
            {
                "property": "splinePath",
                "segments": [{"waypoints": [[-3.1, 0, -1.5], [-0.88, 0, 0.45]]}],
            },
            {
                "property": "animationClip",
                "keyframes": [{"time": '@line_2.word("surging")', "value": "PointRight"}],
            },
        ],
    }
    found_errors = audit_scene_errors(sample_clean)
    print(f"Audit completed. Errors found: {len(found_errors)}")
