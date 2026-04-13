import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_MODE_LANDMARK_COUNT } from "../lib/liveContracts";
import type { Landmark3D } from "../lib/poseNormalize";
import { normalizeLandmarks } from "../lib/poseNormalize";

type PoseLandmarkerState = {
  landmarks: Landmark3D[] | null;
  confidence: number;
  fps: number;
  error: string | null;
};

type StartOptions = {
  useGpu?: boolean;
};

type PoseLandmarkerLike = {
  detectForVideo: (
    video: HTMLVideoElement,
    now: number
  ) => {
    landmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
  };
  close: () => void;
};

export function usePoseLandmarker() {
  const [state, setState] = useState<PoseLandmarkerState>({
    landmarks: null,
    confidence: 0,
    fps: 0,
    error: null,
  });
  const runningRef = useRef(false);
  const landmarkerRef = useRef<PoseLandmarkerLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevTsRef = useRef<number | null>(null);
  const fpsEmaRef = useRef(0);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    prevTsRef.current = null;
    fpsEmaRef.current = 0;
    setState((prev) => ({ ...prev, fps: 0 }));
  }, []);

  const start = useCallback(async (video: HTMLVideoElement, options?: StartOptions) => {
    if (runningRef.current) return true;
    try {
      setState((prev) => ({ ...prev, error: null }));
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const delegate = options?.useGpu === false ? "CPU" : "GPU";
      const detector = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
          delegate,
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      landmarkerRef.current = detector as PoseLandmarkerLike;
      runningRef.current = true;

      const tick = () => {
        if (!runningRef.current || !landmarkerRef.current) return;
        const now = performance.now();
        const result = landmarkerRef.current.detectForVideo(video, now);
        const pose = Array.isArray(result.landmarks) ? result.landmarks[0] : undefined;
        if (pose && pose.length === LIVE_MODE_LANDMARK_COUNT) {
          const raw = pose.map((p) => [p.x, p.y, p.z]);
          const normalized = normalizeLandmarks(raw);
          const confidence =
            pose.reduce((acc, p) => acc + Number(p.visibility ?? 1), 0) / LIVE_MODE_LANDMARK_COUNT;

          const prevTs = prevTsRef.current;
          if (prevTs != null) {
            const dt = Math.max(1, now - prevTs);
            const instFps = 1000 / dt;
            fpsEmaRef.current = fpsEmaRef.current > 0 ? fpsEmaRef.current * 0.8 + instFps * 0.2 : instFps;
          }
          prevTsRef.current = now;
          setState({
            landmarks: normalized,
            confidence,
            fps: fpsEmaRef.current,
            error: null,
          });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to initialize PoseLandmarker";
      setState((prev) => ({ ...prev, error: msg }));
      stop();
      return false;
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    ...state,
    start,
    stop,
    isRunning: runningRef.current,
  };
}
