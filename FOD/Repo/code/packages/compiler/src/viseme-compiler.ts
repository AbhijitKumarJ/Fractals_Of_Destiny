import {
  SymbolicDialogueLine,
  TTSWordBoundary,
  VisemeCue,
  VisemeName
} from '@chronos3d/schema';

export function charToOculusViseme(ch: string): VisemeName {
  switch (ch.toLowerCase()) {
    case 'a':
      return 'viseme_aa';
    case 'e':
      return 'viseme_E';
    case 'i':
    case 'y':
      return 'viseme_I';
    case 'o':
      return 'viseme_O';
    case 'u':
    case 'w':
      return 'viseme_U';
    case 'p':
    case 'b':
    case 'm':
      return 'viseme_PP';
    case 'f':
    case 'v':
      return 'viseme_FF';
    case 't':
    case 'd':
      return 'viseme_DD';
    case 'n':
    case 'l':
      return 'viseme_nn';
    case 'k':
    case 'g':
    case 'c':
      return 'viseme_kk';
    case 'r':
      return 'viseme_RR';
    default:
      return 'viseme_SS';
  }
}

export function synthesizeWordTimingsForLine(
  line: SymbolicDialogueLine,
  lineStartSec: number,
  wpmOverride: number
): { words: TTSWordBoundary[]; endSec: number; visemes: VisemeCue[] } {
  const words: TTSWordBoundary[] = [];
  const visemes: VisemeCue[] = [];

  if (line.ttsWordOffsets && line.ttsWordOffsets.length > 0) {
    let maxEnd = lineStartSec;
    line.ttsWordOffsets.forEach((item, idx) => {
      const cleanWord = item.word.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
      const wStart = Number((lineStartSec + item.startOffset).toFixed(3));
      const wEnd = Number((lineStartSec + item.endOffset).toFixed(3));
      maxEnd = Math.max(maxEnd, wEnd);

      words.push({
        word: item.word,
        cleanWord,
        index: idx,
        start: wStart,
        end: wEnd
      });

      const chars = cleanWord.split('');
      const wordDur = Math.max(0.08, wEnd - wStart);
      const secPerChar = wordDur / Math.max(1, chars.length);
      chars.forEach((ch, cIdx) => {
        const vName = charToOculusViseme(ch);
        visemes.push({
          time: wStart + cIdx * secPerChar,
          duration: secPerChar * 1.15,
          viseme: vName,
          weight: ['viseme_aa', 'viseme_O', 'viseme_E'].includes(vName) ? 0.95 : 0.72
        });
      });
    });

    return { words, endSec: maxEnd, visemes };
  }

  const rawTokens = line.text.trim().split(/\s+/).filter(Boolean);
  const effectiveWpm = Math.max(60, wpmOverride || line.speakingRateWpm || 145);
  const secPerWordAvg = 60 / effectiveWpm;
  let cursor = lineStartSec;

  rawTokens.forEach((rawToken, idx) => {
    const cleanWord = rawToken.replace(/[^a-zA-Z0-9']/g, '');
    const hasComma = /[,;:]/.test(rawToken);
    const hasSentenceStop = /[.!?—]/.test(rawToken);

    const vowelMatches = cleanWord.match(/[aeiouyAEIOUY]+/g);
    const syllables = Math.max(1, vowelMatches ? vowelMatches.length : 1);
    const wordDur = Math.max(0.16, secPerWordAvg * (0.55 + syllables * 0.32));

    const wStart = cursor;
    const wEnd = cursor + wordDur;

    words.push({
      word: rawToken,
      cleanWord: cleanWord.toLowerCase(),
      index: idx,
      start: Number(wStart.toFixed(3)),
      end: Number(wEnd.toFixed(3))
    });

    const chars = cleanWord.split('');
    const secPerChar = wordDur / Math.max(1, chars.length);
    chars.forEach((ch, cIdx) => {
      const vName = charToOculusViseme(ch);
      visemes.push({
        time: wStart + cIdx * secPerChar,
        duration: secPerChar * 1.15,
        viseme: vName,
        weight: ['viseme_aa', 'viseme_O', 'viseme_E'].includes(vName) ? 0.95 : 0.72
      });
    });

    const pauseAfter = hasSentenceStop
      ? 0.28 * (145 / effectiveWpm)
      : hasComma
      ? 0.15 * (145 / effectiveWpm)
      : 0.035;
    cursor = wEnd + pauseAfter;

    visemes.push({
      time: wEnd,
      duration: pauseAfter,
      viseme: 'viseme_sil',
      weight: 0.1
    });
  });

  return {
    words,
    endSec: Number(cursor.toFixed(3)),
    visemes
  };
}
