import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { runRetarget, type RetargetResponseBody } from "../api/client";

export type LandmarksData = {
  landmarks: number[][][];
  confidences: number[];
  timestamps_ms: number[];
  frame_count: number;
  valid_frame_count: number;
  fps: number;
};

export type MotionDraftFrame = {
  index: number;
  landmarks: number[][];
  jointAngles: number[] | null;
  confidence: number;
  timestamp_ms: number;
  excluded: boolean;
};

export type MotionDraftState = {
  frames: MotionDraftFrame[];
  jointOrder: string[];
  currentFrameIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  fps: number;
  isRetargeting: boolean;
  retargetError: string | null;
};

const DEFAULT_PLAYBACK_SPEED = 1.0;

export function useMotionDraft() {
  const [state, setState] = useState<MotionDraftState>({
    frames: [],
    jointOrder: [],
    currentFrameIndex: 0,
    isPlaying: false,
    playbackSpeed: DEFAULT_PLAYBACK_SPEED,
    fps: 30,
    isRetargeting: false,
    retargetError: null,
  });

  const playbackRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const loadLandmarks = useCallback(async (data: LandmarksData) => {
    const frames: MotionDraftFrame[] = data.landmarks.map((lm, i) => ({
      index: i,
      landmarks: lm,
      jointAngles: null,
      confidence: data.confidences[i] ?? 0,
      timestamp_ms: data.timestamps_ms[i] ?? (i / data.fps) * 1000,
      excluded: data.confidences[i] < 0.3,
    }));

    setState((s) => ({
      ...s,
      frames,
      fps: data.fps,
      currentFrameIndex: 0,
      isPlaying: false,
    }));
  }, []);

  const retargetFrames = useCallback(async () => {
    if (state.frames.length === 0) return;

    setState((s) => ({ ...s, isRetargeting: true, retargetError: null }));

    try {
      const validFrames = state.frames.filter((f) => !f.excluded);
      if (validFrames.length === 0) {
        throw new Error("No valid frames to retarget");
      }

      const landmarks = validFrames.map((f) => f.landmarks);
      const result: RetargetResponseBody = await runRetarget({
        landmarks,
        clip_to_limits: true,
      });

      const jointAnglesArray = Array.isArray(result.joint_angles_rad[0])
        ? (result.joint_angles_rad as number[][])
        : [result.joint_angles_rad as number[]];

      let retargetIdx = 0;
      const updatedFrames = state.frames.map((frame) => {
        if (frame.excluded) {
          return frame;
        }
        const angles = jointAnglesArray[retargetIdx] ?? null;
        retargetIdx++;
        return { ...frame, jointAngles: angles };
      });

      setState((s) => ({
        ...s,
        frames: updatedFrames,
        jointOrder: result.joint_order,
        isRetargeting: false,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, isRetargeting: false, retargetError: msg }));
    }
  }, [state.frames]);

  const setCurrentFrame = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      currentFrameIndex: Math.max(0, Math.min(index, s.frames.length - 1)),
    }));
  }, []);

  const toggleFrameExclusion = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      frames: s.frames.map((f, i) =>
        i === index ? { ...f, excluded: !f.excluded } : f
      ),
    }));
  }, []);

  const trimRange = useCallback((startIndex: number, endIndex: number) => {
    setState((s) => ({
      ...s,
      frames: s.frames.map((f, i) => ({
        ...f,
        excluded: i < startIndex || i > endIndex ? true : f.excluded,
      })),
      currentFrameIndex: Math.max(
        startIndex,
        Math.min(s.currentFrameIndex, endIndex)
      ),
    }));
  }, []);

  const play = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setState((s) => ({ ...s, playbackSpeed: speed }));
  }, []);

  useEffect(() => {
    if (!state.isPlaying || state.frames.length === 0) {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
        playbackRef.current = null;
      }
      return;
    }

    const frameDuration = (1000 / state.fps) / state.playbackSpeed;
    lastFrameTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= frameDuration) {
        setState((s) => {
          let nextIndex = s.currentFrameIndex + 1;
          while (nextIndex < s.frames.length && s.frames[nextIndex]?.excluded) {
            nextIndex++;
          }

          if (nextIndex >= s.frames.length) {
            return { ...s, isPlaying: false, currentFrameIndex: 0 };
          }

          return { ...s, currentFrameIndex: nextIndex };
        });
        lastFrameTimeRef.current = now;
      }

      playbackRef.current = requestAnimationFrame(tick);
    };

    playbackRef.current = requestAnimationFrame(tick);

    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
      }
    };
  }, [state.isPlaying, state.fps, state.playbackSpeed, state.frames.length]);

  const currentFrame = useMemo(() => {
    return state.frames[state.currentFrameIndex] ?? null;
  }, [state.frames, state.currentFrameIndex]);

  const validFrameCount = useMemo(() => {
    return state.frames.filter((f) => !f.excluded).length;
  }, [state.frames]);

  const retargetedFrameCount = useMemo(() => {
    return state.frames.filter((f) => !f.excluded && f.jointAngles !== null).length;
  }, [state.frames]);

  const reset = useCallback(() => {
    if (playbackRef.current) {
      cancelAnimationFrame(playbackRef.current);
    }
    setState({
      frames: [],
      jointOrder: [],
      currentFrameIndex: 0,
      isPlaying: false,
      playbackSpeed: DEFAULT_PLAYBACK_SPEED,
      fps: 30,
      isRetargeting: false,
      retargetError: null,
    });
  }, []);

  return {
    ...state,
    currentFrame,
    validFrameCount,
    retargetedFrameCount,
    loadLandmarks,
    retargetFrames,
    setCurrentFrame,
    toggleFrameExclusion,
    trimRange,
    play,
    pause,
    setPlaybackSpeed,
    reset,
  };
}
