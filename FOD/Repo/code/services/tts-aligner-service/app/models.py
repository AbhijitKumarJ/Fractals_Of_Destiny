from typing import List, Optional
from pydantic import BaseModel, Field


class SynthesizeAlignedRequest(BaseModel):
    line_id: str = Field(..., description="Dialogue segment ID, e.g. line_1")
    speaker_id: str = Field(..., description="Character ID, e.g. actor_aria")
    text: str = Field(..., description="Spoken dialogue transcript")
    speaking_rate_wpm: int = Field(default=145, ge=60, le=260)
    provider: str = Field(
        default="kokoro_whisperx",
        description="kokoro_whisperx | elevenlabs | azure | prosody_fallback",
    )


class AlignedWordOffset(BaseModel):
    word: str
    clean_word: str
    index: int
    start_offset: float
    end_offset: float


class AlignedVisemeCue(BaseModel):
    time_offset: float
    duration: float
    viseme: str
    weight: float


class SynthesizeAlignedResponse(BaseModel):
    line_id: str
    speaker_id: str
    duration: float
    audio_base64: Optional[str] = None
    words: List[AlignedWordOffset]
    visemes: List[AlignedVisemeCue]
