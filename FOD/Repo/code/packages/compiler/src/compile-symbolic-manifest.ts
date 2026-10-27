import {
  CompiledAnchorResolutionLog,
  CompiledDialogueSegment,
  CompiledSceneManifest,
  SymbolicSceneManifest
} from '@chronos3d/schema';
import { evaluateTimeExpression, SymbolTableEntry } from './expression-parser';
import { synthesizeWordTimingsForLine } from './viseme-compiler';

export function compileSymbolicManifest(
  symbolic: SymbolicSceneManifest,
  speakerWpmMap: Record<string, number> = { actor_aria: 145, actor_zephyr: 140 },
  interTurnGapDeltaSec: number = 0
): CompiledSceneManifest {
  const symbolTable = new Map<string, SymbolTableEntry>();
  const resolutionLog: CompiledAnchorResolutionLog[] = [];
  const compiledDialogue: CompiledDialogueSegment[] = [];

  // PASS 1: Compile Sequential Dialogue & Word Boundaries into the Symbol Table
  symbolic.dialogue.forEach((line, idx) => {
    const evalStart = evaluateTimeExpression(line.start, symbolTable);
    const adjustedStart =
      idx === 0
        ? evalStart.seconds
        : Math.max(0, evalStart.seconds + interTurnGapDeltaSec);

    const wpm = speakerWpmMap[line.speakerId] || line.speakingRateWpm || 145;
    const { words, endSec, visemes } = synthesizeWordTimingsForLine(
      line,
      adjustedStart,
      wpm
    );
    const duration = Number((endSec - adjustedStart).toFixed(3));

    symbolTable.set(line.id, {
      id: line.id,
      start: adjustedStart,
      end: endSec,
      duration,
      words
    });

    compiledDialogue.push({
      id: line.id,
      speakerId: line.speakerId,
      speaker: line.speaker,
      symbolicStart: line.start,
      start: adjustedStart,
      end: endSec,
      duration,
      text: line.text,
      words,
      visemes
    });

    resolutionLog.push({
      sourceCategory: 'Dialogue',
      targetLabel: `${line.id} (${line.speaker})`,
      symbolicExpr: String(line.start),
      resolvedSeconds: adjustedStart,
      matchedTokenInfo: `${words.length} words @ ${wpm} WPM -> Ends ${endSec.toFixed(2)}s`
    });
  });

  // PASS 2: Resolve Catmull-Rom Spline Segments & Register Segment Anchors
  const compiledTracks: CompiledSceneManifest['tracks'] = [];

  symbolic.tracks.forEach((track) => {
    if (track.property === 'splinePath' && track.segments) {
      const resolvedSegs = track.segments.map((seg) => {
        const sEval = evaluateTimeExpression(seg.startTime, symbolTable);
        const eEval = evaluateTimeExpression(seg.endTime, symbolTable);
        const startSec = sEval.seconds;
        const endSec = Math.max(startSec + 0.2, eEval.seconds);

        symbolTable.set(seg.id, {
          id: seg.id,
          start: startSec,
          end: endSec,
          duration: endSec - startSec
        });

        resolutionLog.push({
          sourceCategory: 'Spline',
          targetLabel: `${track.targetId} (${seg.id})`,
          symbolicExpr: `${seg.startTime} -> ${seg.endTime}`,
          resolvedSeconds: startSec,
          matchedTokenInfo: `Window [${startSec.toFixed(2)}s - ${endSec.toFixed(2)}s] (${(
            endSec - startSec
          ).toFixed(2)}s walk)`
        });

        return {
          id: seg.id,
          symbolicStart: String(seg.startTime),
          symbolicEnd: String(seg.endTime),
          startTime: startSec,
          endTime: endSec,
          waypoints: seg.waypoints,
          strideLength: seg.strideLength || 1.25,
          inheritStartPose: seg.inheritStartPose
        };
      });

      compiledTracks.push({
        id: track.id,
        targetId: track.targetId,
        property: track.property,
        segments: resolvedSegs
      });
    }
  });

  // PASS 3: Resolve Skeletal Gestures, Gaze, Emotions, Props & 2-Bone Arm IK Keyframes
  symbolic.tracks.forEach((track) => {
    if (track.property === 'armIK' && track.ikKeyframes) {
      const resolvedIk = track.ikKeyframes
        .map((ikKf) => {
          const tEval = evaluateTimeExpression(ikKf.time, symbolTable);
          resolutionLog.push({
            sourceCategory: 'ArmIK',
            targetLabel: `${track.targetId}.armIK (${track.hand || 'right'})`,
            symbolicExpr: String(ikKf.time),
            resolvedSeconds: tEval.seconds,
            matchedTokenInfo: `${tEval.matchedInfo} -> target=${JSON.stringify(ikKf.target)}`
          });
          return {
            symbolicTime: String(ikKf.time),
            time: tEval.seconds,
            target: ikKf.target,
            surfaceOffset: ikKf.surfaceOffset || [0, 0, 0],
            poleOffset: ikKf.poleOffset || [0.25, -0.3, 0.15],
            weight: ikKf.weight,
            crossFade: ikKf.crossFade || 0.35,
            comment: ikKf.comment
          };
        })
        .sort((a, b) => a.time - b.time);

      compiledTracks.push({
        id: track.id,
        targetId: track.targetId,
        property: track.property,
        hand: track.hand || 'right',
        ikKeyframes: resolvedIk
      });
    } else if (track.property !== 'splinePath' && track.keyframes) {
      const resolvedKfs = track.keyframes
        .map((kf) => {
          const tEval = evaluateTimeExpression(kf.time, symbolTable);
          resolutionLog.push({
            sourceCategory: 'Gesture/Prop',
            targetLabel: `${track.targetId}.${track.property} = ${JSON.stringify(
              kf.value
            )}`,
            symbolicExpr: String(kf.time),
            resolvedSeconds: tEval.seconds,
            matchedTokenInfo: tEval.matchedInfo
          });

          return {
            symbolicTime: String(kf.time),
            time: tEval.seconds,
            value: kf.value,
            crossFade: kf.crossFade,
            comment: kf.comment
          };
        })
        .sort((a, b) => a.time - b.time);

      compiledTracks.push({
        id: track.id,
        targetId: track.targetId,
        property: track.property,
        keyframes: resolvedKfs
      });
    }
  });

  // PASS 4: Resolve Declarative Camera Director Shots
  const compiledShots = symbolic.cameraShots.map((shot) => {
    const sEval = evaluateTimeExpression(shot.startTime, symbolTable);
    const eEval = evaluateTimeExpression(shot.endTime, symbolTable);

    resolutionLog.push({
      sourceCategory: 'Camera',
      targetLabel: shot.label,
      symbolicExpr: `${shot.startTime} -> ${shot.endTime}`,
      resolvedSeconds: sEval.seconds,
      matchedTokenInfo: `${sEval.matchedInfo} (${shot.shotType})`
    });

    return {
      id: shot.id,
      label: shot.label,
      symbolicStart: String(shot.startTime),
      symbolicEnd: String(shot.endTime),
      startTime: sEval.seconds,
      endTime: Math.max(sEval.seconds + 0.2, eEval.seconds),
      shotType: shot.shotType,
      subjectId: shot.subjectId,
      secondaryId: shot.secondaryId,
      side: shot.side || 'right',
      dollyMode: shot.dollyMode,
      fov: shot.fov ?? 0,
      transitionDuration: shot.transitionDuration ?? 0
    };
  });

  const maxDialogueEnd = compiledDialogue.reduce(
    (max, d) => Math.max(max, d.end),
    10
  );
  const maxShotEnd = compiledShots.reduce(
    (max, s) => Math.max(max, s.endTime),
    maxDialogueEnd
  );

  return {
    id: symbolic.id,
    title: symbolic.title,
    duration: Number((Math.max(maxDialogueEnd, maxShotEnd) + 0.6).toFixed(2)),
    dialogue: compiledDialogue,
    tracks: compiledTracks,
    cameraShots: compiledShots,
    resolutionLog
  };
}
