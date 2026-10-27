export interface SceneAudioRig {
  audioCtx: AudioContext;
  streamDest: MediaStreamAudioDestinationNode;
  triggerFormantPulse: (speakerId: string, freqHz?: number) => void;
  dispose: () => void;
}

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

  const dispose = () => {
    audioCtx.close();
  };

  return { audioCtx, streamDest, triggerFormantPulse, dispose };
}
