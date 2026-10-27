import re
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    AlignedVisemeCue,
    AlignedWordOffset,
    SynthesizeAlignedRequest,
    SynthesizeAlignedResponse,
)

app = FastAPI(
    title="Chronos3D Neural TTS & Forced Word-Alignment Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def char_to_oculus_viseme(ch: str) -> str:
    c = ch.lower()
    if c == "a":
        return "viseme_aa"
    if c == "e":
        return "viseme_E"
    if c in ("i", "y"):
        return "viseme_I"
    if c == "o":
        return "viseme_O"
    if c in ("u", "w"):
        return "viseme_U"
    if c in ("p", "b", "m"):
        return "viseme_PP"
    if c in ("f", "v"):
        return "viseme_FF"
    if c in ("t", "d"):
        return "viseme_DD"
    if c in ("n", "l"):
        return "viseme_nn"
    if c in ("k", "g", "c"):
        return "viseme_kk"
    if c == "r":
        return "viseme_RR"
    return "viseme_SS"


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "chronos3d-tts-aligner"}


@app.post("/api/v1/synthesize-aligned", response_model=SynthesizeAlignedResponse)
def synthesize_aligned(req: SynthesizeAlignedRequest) -> SynthesizeAlignedResponse:
    raw_tokens = [t for t in req.text.strip().split() if t]
    sec_per_word_avg = 60.0 / float(req.speaking_rate_wpm)

    cursor = 0.0
    words: List[AlignedWordOffset] = []
    visemes: List[AlignedVisemeCue] = []

    for idx, raw_token in enumerate(raw_tokens):
        clean_word = re.sub(r"[^a-zA-Z0-9']", "", raw_token).lower()
        has_comma = bool(re.search(r"[,;:]", raw_token))
        has_stop = bool(re.search(r"[.!?—]", raw_token))

        vowel_clusters = re.findall(r"[aeiouyAEIOUY]+", clean_word)
        syllables = max(1, len(vowel_clusters))
        word_dur = max(0.16, sec_per_word_avg * (0.55 + syllables * 0.32))

        w_start = round(cursor, 3)
        w_end = round(cursor + word_dur, 3)

        words.append(
            AlignedWordOffset(
                word=raw_token,
                clean_word=clean_word,
                index=idx,
                start_offset=w_start,
                end_offset=w_end,
            )
        )

        chars = list(clean_word) or ["a"]
        sec_per_char = word_dur / len(chars)
        for c_idx, ch in enumerate(chars):
            v_name = char_to_oculus_viseme(ch)
            visemes.append(
                AlignedVisemeCue(
                    time_offset=round(w_start + c_idx * sec_per_char, 3),
                    duration=round(sec_per_char * 1.15, 3),
                    viseme=v_name,
                    weight=0.95 if v_name in ("viseme_aa", "viseme_O", "viseme_E") else 0.72,
                )
            )

        pause_after = (
            0.28 * (145.0 / req.speaking_rate_wpm)
            if has_stop
            else 0.15 * (145.0 / req.speaking_rate_wpm)
            if has_comma
            else 0.035
        )
        cursor = w_end + pause_after
        visemes.append(
            AlignedVisemeCue(
                time_offset=round(w_end, 3),
                duration=round(pause_after, 3),
                viseme="viseme_sil",
                weight=0.1,
            )
        )

    return SynthesizeAlignedResponse(
        line_id=req.line_id,
        speaker_id=req.speaker_id,
        duration=round(cursor, 3),
        audio_base64=None,
        words=words,
        visemes=visemes,
    )
