import { TimeExpression, TTSWordBoundary } from '@chronos3d/schema';

export interface SymbolTableEntry {
  id: string;
  start: number;
  end: number;
  duration: number;
  words?: TTSWordBoundary[];
}

export function evaluateTimeExpression(
  expr: TimeExpression,
  symbolTable: Map<string, SymbolTableEntry>
): { seconds: number; matchedInfo: string } {
  if (typeof expr === 'number') {
    return { seconds: expr, matchedInfo: `Literal ${expr.toFixed(2)}s` };
  }

  const trimmed = expr.trim();
  const asNum = Number(trimmed);
  if (!Number.isNaN(asNum)) {
    return { seconds: asNum, matchedInfo: `Literal ${asNum.toFixed(2)}s` };
  }

  const anchorRegex =
    /^@([a-zA-Z0-9_-]+)\.(start|end|duration|word\(([^)]+)\)|progress\(([0-9.]+)\))\s*([+-]\s*[0-9.]+)?$/;
  const match = trimmed.match(anchorRegex);

  if (!match) {
    return { seconds: 0, matchedInfo: `Unparsed (${trimmed}) -> 0.00s` };
  }

  const targetId = match[1];
  const accessor = match[2];
  const wordArgRaw = match[3];
  const progressArgRaw = match[4];
  const offsetRaw = match[5];

  const entry = symbolTable.get(targetId);
  if (!entry) {
    return { seconds: 0, matchedInfo: `Missing Symbol @${targetId}` };
  }

  const offsetSec = offsetRaw ? parseFloat(offsetRaw.replace(/\s+/g, '')) : 0;
  let baseSec = entry.start;
  let detail = `@${targetId}.start`;

  if (accessor === 'start') {
    baseSec = entry.start;
    detail = `@${targetId}.start (${entry.start.toFixed(2)}s)`;
  } else if (accessor === 'end') {
    baseSec = entry.end;
    detail = `@${targetId}.end (${entry.end.toFixed(2)}s)`;
  } else if (accessor === 'duration') {
    baseSec = entry.duration;
    detail = `@${targetId}.duration (${entry.duration.toFixed(2)}s)`;
  } else if (accessor.startsWith('progress(') && progressArgRaw) {
    const p = Math.max(0, Math.min(1, parseFloat(progressArgRaw)));
    baseSec = entry.start + p * entry.duration;
    detail = `@${targetId} ${Math.round(p * 100)}% (${baseSec.toFixed(2)}s)`;
  } else if (accessor.startsWith('word(') && wordArgRaw !== undefined) {
    const cleanArg = wordArgRaw.replace(/['"]/g, '').trim();
    const words = entry.words || [];
    const wordIdxNum = Number(cleanArg);

    if (!Number.isNaN(wordIdxNum)) {
      const clampedIdx = Math.max(0, Math.min(words.length - 1, wordIdxNum));
      const found = words[clampedIdx];
      baseSec = found ? found.start : entry.start;
      detail = found
        ? `Word #${clampedIdx} "${found.word}" (${baseSec.toFixed(2)}s)`
        : `@${targetId}.start`;
    } else {
      const searchLower = cleanArg.toLowerCase().replace(/[^a-z0-9]/g, '');
      const found =
        words.find((w) => w.cleanWord === searchLower) ||
        words.find((w) => w.cleanWord.includes(searchLower)) ||
        words.find((w) => searchLower.includes(w.cleanWord));
      baseSec = found ? found.start : entry.start;
      detail = found
        ? `Token "${found.word}" @ ${baseSec.toFixed(2)}s`
        : `Fallback @${targetId}.start (token "${cleanArg}" not found)`;
    }
  }

  const finalSec = Math.max(0, Number((baseSec + offsetSec).toFixed(3)));
  const offsetDesc =
    offsetSec !== 0
      ? ` ${offsetSec > 0 ? '+' : '-'} ${Math.abs(offsetSec).toFixed(2)}s`
      : '';

  return {
    seconds: finalSec,
    matchedInfo: `${detail}${offsetDesc}`
  };
}
