import {
  STAGE_OBSTACLES,
  SymbolicSceneManifest,
  TimeExpression
} from '@chronos3d/schema';

export interface SanitizerRepairEntry {
  ruleId:
    | 'OBSTACLE_PUSH_OUT'
    | 'WORD_STEM_FUZZY_MATCH'
    | 'DIALOGUE_CHAIN_REPAIR'
    | 'CAMERA_180_AXIS_LOCK';
  targetPath: string;
  beforeValue: string;
  afterValue: string;
  explanation: string;
}

function stemToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(ing|ed|es|s|tion|ly)$/, '');
}

function repairSymbolicWordExpression(
  expr: TimeExpression,
  dialogueWordsMap: Map<string, string[]>,
  targetPath: string,
  repairs: SanitizerRepairEntry[]
): TimeExpression {
  if (typeof expr !== 'string') return expr;

  const wordRegex = /^@(line_[0-9]+)\.word\((['"]?)([^)'"]+)\2\)(.*)$/;
  const match = expr.trim().match(wordRegex);
  if (!match) return expr;

  const lineId = match[1];
  const requestedWord = match[3].trim();
  const trailingOffset = match[4] || '';

  const lineTokens = dialogueWordsMap.get(lineId);
  if (!lineTokens || lineTokens.length === 0) return expr;

  const cleanRequested = requestedWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lineTokens.includes(cleanRequested)) {
    return expr;
  }

  const reqStem = stemToken(cleanRequested);
  const fuzzyMatch = lineTokens.find((tok) => {
    const tokStem = stemToken(tok);
    return (
      (reqStem.length >= 3 && tokStem.startsWith(reqStem)) ||
      (tokStem.length >= 3 && reqStem.startsWith(tokStem)) ||
      tok.includes(cleanRequested)
    );
  });

  if (fuzzyMatch) {
    const repaired = `@${lineId}.word("${fuzzyMatch}")${trailingOffset}`;
    repairs.push({
      ruleId: 'WORD_STEM_FUZZY_MATCH',
      targetPath,
      beforeValue: String(expr),
      afterValue: repaired,
      explanation: `Matched morphological stem "${requestedWord}" -> spoken token "${fuzzyMatch}" in @${lineId}`
    });
    return repaired;
  }

  return expr;
}

export function sanitizeAndRepairLLMScene(rawManifest: SymbolicSceneManifest): {
  repairedManifest: SymbolicSceneManifest;
  repairs: SanitizerRepairEntry[];
} {
  const manifest: SymbolicSceneManifest = JSON.parse(
    JSON.stringify(rawManifest)
  );
  const repairs: SanitizerRepairEntry[] = [];

  // RULE 1: Auto-chain sequential dialogue lines if an 8B model emitted start: 0 on line_2+
  manifest.dialogue.forEach((line, idx) => {
    if (idx > 0 && (line.start === 0 || line.start === '0' || line.start === '0.0')) {
      const prevId = manifest.dialogue[idx - 1].id;
      const chained = `@${prevId}.end + 0.35`;
      repairs.push({
        ruleId: 'DIALOGUE_CHAIN_REPAIR',
        targetPath: `dialogue[${idx}].start (${line.id})`,
        beforeValue: String(line.start),
        afterValue: chained,
        explanation: `Prevented overlapping speech by chaining ${line.id} after @${prevId}.end`
      });
      line.start = chained;
    }
  });

  // Build lookup table of clean spoken words per line for Rule 2
  const dialogueWordsMap = new Map<string, string[]>();
  manifest.dialogue.forEach((line) => {
    const tokens = line.text
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      .filter(Boolean);
    dialogueWordsMap.set(line.id, tokens);
  });

  // RULE 2 & RULE 3: Repair spline obstacle collisions & fuzzy-match word anchors
  manifest.tracks.forEach((track, tIdx) => {
    if (track.segments) {
      track.segments.forEach((seg, sIdx) => {
        seg.startTime = repairSymbolicWordExpression(
          seg.startTime,
          dialogueWordsMap,
          `tracks[${tIdx}].segments[${sIdx}].startTime`,
          repairs
        );
        seg.endTime = repairSymbolicWordExpression(
          seg.endTime,
          dialogueWordsMap,
          `tracks[${tIdx}].segments[${sIdx}].endTime`,
          repairs
        );

        seg.waypoints = seg.waypoints.map((wp, wIdx) => {
          let [x, y, z] = wp;
          STAGE_OBSTACLES.forEach((obs) => {
            const dx = x - obs.centerXZ[0];
            const dz = z - obs.centerXZ[1];
            const dist = Math.hypot(dx, dz);
            if (dist < obs.radius) {
              const normX = dist > 0.001 ? dx / dist : -1;
              const normZ = dist > 0.001 ? dz / dist : 1;
              const safeDist = obs.radius + 0.06;
              const pushedX = Number((obs.centerXZ[0] + normX * safeDist).toFixed(2));
              const pushedZ = Number((obs.centerXZ[1] + normZ * safeDist).toFixed(2));
              repairs.push({
                ruleId: 'OBSTACLE_PUSH_OUT',
                targetPath: `${seg.id}.waypoints[${wIdx}]`,
                beforeValue: `[${x}, ${y}, ${z}]`,
                afterValue: `[${pushedX}, ${y}, ${pushedZ}]`,
                explanation: `Pushed waypoint radially outside ${obs.name} (${obs.radius}m keep-out zone)`
              });
              x = pushedX;
              z = pushedZ;
            }
          });
          return [x, y, z];
        });
      });
    }

    if (track.keyframes) {
      track.keyframes.forEach((kf, kIdx) => {
        kf.time = repairSymbolicWordExpression(
          kf.time,
          dialogueWordsMap,
          `tracks[${tIdx}].keyframes[${kIdx}].time`,
          repairs
        );
      });
    }

    if (track.ikKeyframes) {
      track.ikKeyframes.forEach((ikKf, kIdx) => {
        ikKf.time = repairSymbolicWordExpression(
          ikKf.time,
          dialogueWordsMap,
          `tracks[${tIdx}].ikKeyframes[${kIdx}].time`,
          repairs
        );
      });
    }
  });

  // RULE 4: Normalize 180-degree camera line of action across consecutive OTS cuts
  let canonicalSide: 'left' | 'right' | null = null;
  manifest.cameraShots.forEach((shot, cIdx) => {
    shot.startTime = repairSymbolicWordExpression(
      shot.startTime,
      dialogueWordsMap,
      `cameraShots[${cIdx}].startTime`,
      repairs
    );
    shot.endTime = repairSymbolicWordExpression(
      shot.endTime,
      dialogueWordsMap,
      `cameraShots[${cIdx}].endTime`,
      repairs
    );

    if (shot.shotType === 'overTheShoulder' || shot.shotType === 'twoShot') {
      if (!canonicalSide) {
        canonicalSide = shot.side || 'right';
        shot.side = canonicalSide;
      } else if (shot.side && shot.side !== canonicalSide) {
        repairs.push({
          ruleId: 'CAMERA_180_AXIS_LOCK',
          targetPath: `cameraShots[${cIdx}].side (${shot.id})`,
          beforeValue: shot.side,
          afterValue: canonicalSide,
          explanation: `Normalized camera side to "${canonicalSide}" to prevent crossing the 180-degree line of action`
        });
        shot.side = canonicalSide;
      }
    }
  });

  return { repairedManifest: manifest, repairs };
}
