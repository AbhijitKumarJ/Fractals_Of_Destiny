import re
from typing import Dict, List, Tuple
from ..models import AlignedVisemeCue, AlignedWordOffset


def map_elevenlabs_char_timestamps(
    alignment_payload: Dict[str, List]
) -> Tuple[List[AlignedWordOffset], List[AlignedVisemeCue], float]:
    chars: List[str] = alignment_payload.get("characters", [])
    starts: List[float] = alignment_payload.get("character_start_times_seconds", [])
    ends: List[float] = alignment_payload.get("character_end_times_seconds", [])

    words: List[AlignedWordOffset] = []
    visemes: List[AlignedVisemeCue] = []

    current_chars: List[str] = []
    word_start = 0.0
    word_end = 0.0
    word_idx = 0

    for ch, s_sec, e_sec in zip(chars, starts, ends):
        if ch.isspace():
            if current_chars:
                raw_word = "".join(current_chars)
                clean_word = re.sub(r"[^a-zA-Z0-9']", "", raw_word).lower()
                words.append(
                    AlignedWordOffset(
                        word=raw_word,
                        clean_word=clean_word,
                        index=word_idx,
                        start_offset=round(word_start, 3),
                        end_offset=round(word_end, 3),
                    )
                )
                word_idx += 1
                current_chars = []
        else:
            if not current_chars:
                word_start = s_sec
            current_chars.append(ch)
            word_end = e_sec
            visemes.append(
                AlignedVisemeCue(
                    time_offset=round(s_sec, 3),
                    duration=round(max(0.03, e_sec - s_sec), 3),
                    viseme="viseme_aa" if ch.lower() in "aeiou" else "viseme_SS",
                    weight=0.85,
                )
            )

    if current_chars:
        raw_word = "".join(current_chars)
        clean_word = re.sub(r"[^a-zA-Z0-9']", "", raw_word).lower()
        words.append(
            AlignedWordOffset(
                word=raw_word,
                clean_word=clean_word,
                index=word_idx,
                start_offset=round(word_start, 3),
                end_offset=round(word_end, 3),
            )
        )

    total_dur = round(ends[-1], 3) if ends else 0.0
    return words, visemes, total_dur
