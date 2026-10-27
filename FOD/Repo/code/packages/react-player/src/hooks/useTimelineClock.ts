import { useState, useRef, useEffect, useCallback } from 'react';

export function useTimelineClock(duration: number, initialPlaying: boolean = true) {
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const timeRef = useRef<number>(0);
  const timeScaleRef = useRef<number>(1.0);
  const lastFrameMsRef = useRef<number | null>(null);

  const seek = useCallback(
    (targetSec: number) => {
      const clamped = Math.max(0, Math.min(duration, targetSec));
      timeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const setTimeScale = useCallback((scale: number) => {
    timeScaleRef.current = Math.max(0, Math.min(2.0, scale));
  }, []);

  useEffect(() => {
    let rAF: number;
    const tick = (nowMs: number) => {
      if (isPlaying && lastFrameMsRef.current !== null) {
        const dt = ((nowMs - lastFrameMsRef.current) / 1000) * timeScaleRef.current;
        let next = timeRef.current + dt;
        if (next >= duration) {
          next = 0;
        }
        timeRef.current = next;
        setCurrentTime(next);
      }
      lastFrameMsRef.current = nowMs;
      rAF = requestAnimationFrame(tick);
    };
    rAF = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rAF);
  }, [isPlaying, duration]);

  return {
    isPlaying,
    setIsPlaying,
    currentTime,
    timeRef,
    seek,
    setTimeScale
  };
}
