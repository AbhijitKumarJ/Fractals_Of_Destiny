from typing import Dict, List
from ..models import AlignedVisemeCue

AZURE_TO_OCULUS_VISEME: Dict[int, str] = {
    0: "viseme_sil",
    1: "viseme_aa",
    2: "viseme_aa",
    3: "viseme_O",
    4: "viseme_E",
    5: "viseme_RR",
    6: "viseme_I",
    7: "viseme_U",
    8: "viseme_O",
    9: "viseme_aa",
    10: "viseme_O",
    11: "viseme_aa",
    12: "viseme_kk",
    13: "viseme_RR",
    14: "viseme_nn",
    15: "viseme_SS",
    16: "viseme_CH",
    17: "viseme_TH",
    18: "viseme_FF",
    19: "viseme_DD",
    20: "viseme_kk",
    21: "viseme_PP",
}


def map_azure_viseme_events(
    azure_events: List[Dict[str, float]]
) -> List[AlignedVisemeCue]:
    cues: List[AlignedVisemeCue] = []
    for idx, ev in enumerate(azure_events):
        viseme_id = int(ev.get("viseme_id", 0))
        t_sec = float(ev.get("audio_offset_sec", 0.0))
        next_t = (
            float(azure_events[idx + 1]["audio_offset_sec"])
            if idx + 1 < len(azure_events)
            else t_sec + 0.08
        )
        v_name = AZURE_TO_OCULUS_VISEME.get(viseme_id, "viseme_SS")
        cues.append(
            AlignedVisemeCue(
                time_offset=round(t_sec, 3),
                duration=round(max(0.03, next_t - t_sec), 3),
                viseme=v_name,
                weight=0.1 if v_name == "viseme_sil" else 0.9,
            )
        )
    return cues
