import { CompiledDialogueSegment } from '@chronos3d/schema';

export function compositeWebGLAndSubtitlesTo2DCanvas(
  ctx: CanvasRenderingContext2D,
  webglCanvas: HTMLCanvasElement,
  currentTime: number,
  duration: number,
  shotLabel: string,
  activeDialogue: CompiledDialogueSegment | null
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(webglCanvas, 0, 0, w, h);

  // 2.35:1 Cinema Letterbox Bars
  const barHeight = Math.round(h * 0.085);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, barHeight);
  ctx.fillRect(0, h - barHeight, w, barHeight);

  // Top Telemetry HUD
  ctx.font = '600 12px monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(
    `CHRONOS-3D  |  T+${currentTime.toFixed(2)}s / ${duration.toFixed(2)}s  |  ${shotLabel}`,
    18,
    barHeight * 0.62
  );

  // Karaoke Word-Highlighted Subtitle Banner
  if (activeDialogue) {
    ctx.font = 'bold 14px sans-serif';
    const textY = h - barHeight * 0.38;
    const speakerPrefix = `${activeDialogue.speaker}: `;
    let cursorX = 24;

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(speakerPrefix, cursorX, textY);
    cursorX += ctx.measureText(speakerPrefix).width + 6;

    activeDialogue.words.forEach((wordObj) => {
      const isSpoken = currentTime >= wordObj.start && currentTime <= wordObj.end;
      const wordStr = `${wordObj.word} `;
      const wordWidth = ctx.measureText(wordStr).width;

      if (isSpoken) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cursorX - 2, textY - 14, wordWidth, 19);
        ctx.fillStyle = '#020617';
      } else if (currentTime > wordObj.end) {
        ctx.fillStyle = '#f8fafc';
      } else {
        ctx.fillStyle = '#94a3b8';
      }

      ctx.fillText(wordStr, cursorX, textY);
      cursorX += wordWidth;
    });
  }
}
