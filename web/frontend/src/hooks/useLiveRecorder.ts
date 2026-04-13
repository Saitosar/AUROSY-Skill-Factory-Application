import { useCallback, useMemo, useRef, useState } from "react";

export type LiveRecorderFrame = {
  timestamp_ms: number;
  joint_angles_rad: Record<string, number>;
};

export function useLiveRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const framesRef = useRef<LiveRecorderFrame[]>([]);

  const start = useCallback(() => {
    framesRef.current = [];
    setIsRecording(true);
  }, []);

  const push = useCallback((jointAngles: Record<string, number>) => {
    if (!isRecording) return;
    framesRef.current.push({
      timestamp_ms: Date.now(),
      joint_angles_rad: { ...jointAngles },
    });
  }, [isRecording]);

  const stop = useCallback(() => {
    setIsRecording(false);
    return framesRef.current.slice();
  }, []);

  const frameCount = useMemo(() => framesRef.current.length, [isRecording]);

  return {
    isRecording,
    frameCount,
    start,
    push,
    stop,
  };
}
