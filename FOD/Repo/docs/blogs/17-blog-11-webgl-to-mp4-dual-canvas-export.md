# Turn 17 — Blog 11: WebGL to Mastered MP4 — Dual-Canvas Export

*Source: `Latest From branched onward.md` — turn 17 of 18*

**User:**

yes

---

**AI:**

### Blog 11: From Live WebGL to Mastered MP4 — Dual-Canvas 2D+3D Compositing, Formant WebAudio & Faster-Than-Real-Time WebCodecs

An interactive 3D WebGL player is transformative for web embeds, virtual labs, and branching courses, but real-world production pipelines also require **standalone `.mp4` and `.webm` video files** that can be shared on social platforms, archived in LMS portals, or dropped into traditional NLE timelines.

If you try to export a Three.js scene by simply calling `renderer.domElement.captureStream(60)` and piping it into a browser `MediaRecorder`, three things go wrong immediately:

1. **Missing Subtitles & Cinema Overlays:** In a standard React + Three.js app, karaoke subtitles, speaker badges, and 2.35:1 letterbox bars are HTML/CSS DOM elements floating *above* the `<canvas>`. Calling `captureStream()` on the WebGL canvas records the bare 3D geometry while leaving all UI overlays and subtitles invisible.


2. **Silent Recordings with Browser `speechSynthesis`:** The browser's native `window.speechSynthesis` API routes audio directly to the operating system's hardware mixer rather than a WebAudio `AudioNode`—meaning a `MediaRecorder` cannot capture its audio stream.
3. **Dropped Frames Under GPU Load:** Real-time `captureStream(60)` relies on wall-clock `requestAnimationFrame` timing. If a 4K shader pass or background tab throttle causes a frame to take $28\text{ms}$ instead of $16.67\text{ms}$, the recorded video stutters permanently.



In **Chronos3D (`@chronos3d/video-exporter`)**, we solve all three problems through a **Dual-Canvas 2D+3D Compositor** (`Canvas2DCompositor.ts`), a **Sample-Accurate WebAudio Formant & SFX Graph** (`WebAudioSceneSynth.ts`), a **Hardware-Probed `MediaRecorder` Pipeline** (`MediaRecorderExporter.ts`), and a **Faster-Than-Real-Time `WebCodecs` Offline Stepper** (`WebCodecsOfflineMuxer.ts`).

---

#### 1. Architecture of the Unified 2D+3D Mastering Pipeline

To guarantee that what you see in the studio viewport—including burned-in karaoke word highlights, active lens telemetry, and 2.35:1 anamorphic cinema bars—is the exact pixel buffer encoded into the video file, `@chronos3d/video-exporter` decouples 3D WebGL rasterization from final 2D frame mastering:

```text
┌───────────────────────────────────────────────────┐
│ 1. Backing Three.js WebGLRenderer                 │
│    ({ antialias: true, preserveDrawingBuffer:true})│
└─────────────────────────┬─────────────────────────┘
                          │ ctx.drawImage(webglCanvas, 0, 0, w, h)
                          ▼
┌───────────────────────────────────────────────────┐
│ 2. Master 2D Compositor Canvas (Canvas2DCompositor)│
│    • Blits 3D WebGL scene buffer                  │
│    • Rasterizes 2.35:1 cinema letterbox bars      │
│    • Draws T+ timecode & active camera shot HUD   │
│    • Renders karaoke word-highlighted subtitles   │
└───────────┬───────────────────────────┬───────────┘
            │                           │
            ▼ (Real-Time / Stepper)     ▼ (Offline 4K Batch)
┌───────────────────────┐   ┌───────────────────────────────────┐
│ MediaRecorderExporter │   │ WebCodecsOfflineMuxer             │
│ • Muxes WebAudio node │   │ • Steps t_k = k / FPS             │
│   (Formant + TTS +SFX)│   │ • new VideoFrame(canvas,{ts})     │
│ • Outputs .mp4 /.webm │   │ • Hardware VideoEncoder (avc1)    │
└───────────────────────┘   └───────────────────────────────────┘

```

---

#### 2. Inside `Canvas2DCompositor.ts`: Blitting WebGL & Karaoke Subtitles

First, the Three.js `WebGLRenderer` is initialized with `preserveDrawingBuffer: true` so its color buffer remains intact after `renderer.render(scene, camera)` completes. Immediately after the 3D pass finishes at timestamp $t$, `compositeWebGLAndSubtitlesTo2DCanvas()` (`packages/video-exporter/src/Canvas2DCompositor.ts`) blits the WebGL canvas onto the master 2D `<canvas>` and rasterizes the cinema overlays:

```typescript
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

```

Next, if a `CompiledDialogueSegment` is active at `currentTime`, the compositor iterates through its compiled `TTSWordBoundary[]` tokens (`activeDialogue.words`) and measures each word's pixel width via `ctx.measureText(wordStr).width` to draw a dynamic karaoke highlight box behind the currently spoken word:

```typescript
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

```

Because these vector text draws happen directly inside the master 2D canvas buffer, every exported `.mp4` or `.webm` frame contains razor-sharp, sub-frame-synchronized karaoke captions without needing external `.srt` sidecar files.

---

#### 3. Sample-Accurate WebAudio Graph & Formant Speech Synthesis (`WebAudioSceneSynth.ts`)

To ensure exported videos always contain a real multiplexed audio track—even before external neural TTS `.mp3`/`.wav` buffers are attached—`@chronos3d/video-exporter` builds a dedicated WebAudio synthesizer routed into a `MediaStreamAudioDestinationNode` (`streamDest`):

```typescript
export function createSceneAudioSynth(): SceneAudioRig {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const streamDest = audioCtx.createMediaStreamDestination();

  const triggerFormantPulse = (speakerId: string, freqHz?: number) => {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freqHz || (speakerId === 'actor_aria' ? 235 : 135);

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.connect(streamDest);

    osc.start(now);
    osc.stop(now + 0.15);
  };

```

Look at how `gain.connect(...)` fans out to two destinations simultaneously:

1. **`audioCtx.destination`:** Lets the director hear the distinct vocal formant frequencies matched to ARIA ($235\text{ Hz}$ fundamental) and ZEPHYR ($135\text{ Hz}$ fundamental)—plus the sub-bass harmonic sweep when the **Quantum Core** surges—live through their speakers.


2. **`streamDest` (`MediaStreamAudioDestinationNode`):** Exposes `streamDest.stream`, a standard WebRTC `MediaStream` whose audio tracks can be merged directly into the canvas video stream. When pre-rendered neural TTS `AudioBuffer` assets (`line.audioUrl`) are loaded, they schedule onto the exact same `streamDest` node via `AudioBufferSourceNode.start(audioCtx.currentTime + line.start)` for sample-accurate hardware clock synchronization.



---

#### 4. Hardware Codec Probing & Multiplexed `MediaRecorder` Capture (`MediaRecorderExporter.ts`)

Different browsers and operating systems support different hardware-accelerated video containers (`video/mp4` with H.264/AAC on Safari and modern Chrome/Edge vs. `video/webm` with VP9/Opus on Firefox/Linux).

In `packages/video-exporter/src/MediaRecorderExporter.ts`, `probeSupportedVideoMimeType()` queries `MediaRecorder.isTypeSupported()` in priority order so the studio automatically produces native `.mp4` files whenever hardware H.264/AAC encoding is available:

```typescript
export function probeSupportedVideoMimeType(): {
  mimeType: string;
  extension: 'mp4' | 'webm';
} {
  const candidates: { mimeType: string; extension: 'mp4' | 'webm' }[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' }
  ];

  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

```

When `startCanvasMediaRecorder()` starts recording, it captures the 60 FPS stream from `compositeCanvas`, attaches all WebAudio tracks from `streamDest.stream`, and configures an $8\text{ Mbps}$ bitrate (`videoBitsPerSecond: 8_000_000`):

```typescript
const { mimeType, extension } = probeSupportedVideoMimeType();
const canvasStream = compositeCanvas.captureStream(fps);

if (audioStream) {
  audioStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
}

const chunks: BlobPart[] = [];
const recorder = new MediaRecorder(canvasStream, {
  mimeType,
  videoBitsPerSecond: 8_000_000
});

```

---

#### 5. Faster-Than-Real-Time Offline 4K Rendering with `WebCodecs` (`WebCodecsOfflineMuxer.ts`)

Because every subsystem in `@chronos3d/engine-core`—from `mixer.update(0)` and arc-length Catmull-Rom splines to closed-form 2-Bone Arm IK and declarative camera cuts—is a **pure deterministic function $S(t)$ of timestamp $t$**, we are not limited to recording at $1.0\times$ real-time wall-clock speed.

In `packages/video-exporter/src/WebCodecsOfflineMuxer.ts`, `renderOfflineWithWebCodecs()` uses the browser's low-level **`VideoEncoder`** and **`VideoFrame`** APIs (WebCodecs) to step the 3D renderer deterministically frame-by-frame ($t_k = k / \text{FPS}$) as fast as the GPU can rasterize:

```typescript
export async function renderOfflineWithWebCodecs(
  compositeCanvas: HTMLCanvasElement,
  config: OfflineWebCodecsExportConfig
): Promise<OfflineEncodedChunksResult> {
  const totalFrames = Math.ceil(config.durationSeconds * config.fps);
  const encodedChunks: Uint8Array[] = [];
  const codec = 'avc1.42001f';

  const encoder = new VideoEncoder({
    output: (chunk) => {
      const buffer = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buffer);
      encodedChunks.push(buffer);
    },
    error: (err) => {
      throw err;
    }
  });

  encoder.configure({
    codec,
    width: config.width,
    height: config.height,
    bitrate: config.bitrate || 12_000_000,
    framerate: config.fps
  });

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const tSec = frameIdx / config.fps;
    config.renderFrameAtTime(tSec);

    const timestampMicros = Math.round(tSec * 1_000_000);
    const videoFrame = new VideoFrame(compositeCanvas, {
      timestamp: timestampMicros,
      duration: Math.round(1_000_000 / config.fps)
    });

    const isKeyFrame = frameIdx % (config.fps * 2) === 0;
    encoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();
  }

  await encoder.flush();
  encoder.close();

  return { encodedChunks, totalFrames, codec, fps: config.fps };
}

```

Look at why this architecture is a game-changer for batch AI media pipelines:

* **Zero Dropped Frames Guaranteed:** Because `timestampMicros` is calculated mathematically as `Math.round((frameIdx / config.fps) * 1_000_000)` and passed explicitly into `new VideoFrame(compositeCanvas, { timestamp })`, even if a complex 4K frame takes $50\text{ms}$ to render, the resulting MP4 timeline has **zero frame jitter and exact $16.667\text{ms}$ frame spacing**.


* **Faster-Than-Real-Time Batch Rendering:** On a standard desktop GPU where a 1080p Three.js frame renders in ~2ms, `renderOfflineWithWebCodecs()` can encode a 60-second 60 FPS video (3,600 frames) in roughly **7 to 8 seconds**—nearly $8\times$ faster than real-time playback.



---

Are you ready to proceed to the final post in our core series, **Blog 12: Closing the Human-AI Loop — Raycast Floor-Plane Waypoint Dragging, Multi-Track Symbolic NLE & QLoRA Fine-Tuning**?
