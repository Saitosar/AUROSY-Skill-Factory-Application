import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;
const JPEG_QUALITY = 0.8;
const LANDMARK_COUNT = 33;
/** Output aspect width / height (4:3) */
const TARGET_AR = CAPTURE_WIDTH / CAPTURE_HEIGHT;
/** EMA factor for crop center and size (higher = snappier). */
const SMOOTH_ALPHA = 0.22;
/** Extra margin around body bbox (fraction of max(bbox w, h)). */
const PADDING_FRAC = 0.28;

export type CameraLandmarksRef = RefObject<number[][] | null | undefined>;

export function useCameraCapture(landmarksRef: CameraLandmarksRef) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** 640×480 — same image is shown in UI and encoded for WebSocket. */
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const smoothCxRef = useRef<number | null>(null);
  const smoothCyRef = useRef<number | null>(null);
  const smoothWRef = useRef<number | null>(null);

  const resetSmoothing = useCallback(() => {
    smoothCxRef.current = null;
    smoothCyRef.current = null;
    smoothWRef.current = null;
  }, []);

  const computeTargetCrop = useCallback(
    (
      landmarks: number[][] | null | undefined,
      vw: number,
      vh: number
    ): { cx: number; cy: number; w: number; h: number } | null => {
      if (!landmarks || landmarks.length !== LANDMARK_COUNT || vw <= 0 || vh <= 0) {
        return null;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const row of landmarks) {
        if (!Array.isArray(row) || row.length < 2) continue;
        const nx = Number(row[0]);
        const ny = Number(row[1]);
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;
        if (nx < -0.15 || nx > 1.15 || ny < -0.15 || ny > 1.15) continue;
        const x = nx * vw;
        const y = ny * vh;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;

      const bw = maxX - minX;
      const bh = maxY - minY;
      const pad = PADDING_FRAC * Math.max(bw, bh);
      const innerW = bw + pad * 2;
      const innerH = bh + pad * 2;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      let w = Math.max(innerW, innerH * TARGET_AR);
      let h = w / TARGET_AR;
      if (h < innerH) {
        h = innerH;
        w = h * TARGET_AR;
      }
      if (w > vw) {
        w = vw;
        h = w / TARGET_AR;
      }
      if (h > vh) {
        h = vh;
        w = h * TARGET_AR;
      }
      if (w < 1 || h < 1 || w > vw + 0.5 || h > vh + 0.5) return null;

      return { cx, cy, w, h };
    },
    []
  );

  const applySmoothing = useCallback((target: { cx: number; cy: number; w: number; h: number }) => {
    const { cx, cy, w } = target;
    const cx0 = smoothCxRef.current;
    const cy0 = smoothCyRef.current;
    const w0 = smoothWRef.current;
    if (cx0 == null || cy0 == null || w0 == null) {
      smoothCxRef.current = cx;
      smoothCyRef.current = cy;
      smoothWRef.current = w;
      return { cx, cy, w, h: w / TARGET_AR };
    }
    const prevCx = cx0;
    const prevCy = cy0;
    const prevW = w0;
    const ncx = prevCx + (cx - prevCx) * SMOOTH_ALPHA;
    const ncy = prevCy + (cy - prevCy) * SMOOTH_ALPHA;
    const nw = prevW + (w - prevW) * SMOOTH_ALPHA;
    smoothCxRef.current = ncx;
    smoothCyRef.current = ncy;
    smoothWRef.current = nw;
    const sw = Math.max(1, nw);
    const sh = sw / TARGET_AR;
    return { cx: ncx, cy: ncy, w: sw, h: sh };
  }, []);

  const drawProcessedFrame = useCallback((): boolean => {
    const video = videoRef.current;
    const canvas = outputCanvasRef.current;
    if (!video || !canvas) return false;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw <= 0 || vh <= 0) return false;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const target = computeTargetCrop(landmarksRef.current ?? null, vw, vh);
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;

    if (target) {
      const smoothed = applySmoothing(target);
      let cropW = Math.min(smoothed.w, vw);
      let cropH = cropW / TARGET_AR;
      if (cropH > vh) {
        cropH = vh;
        cropW = cropH * TARGET_AR;
      }
      sx = smoothed.cx - cropW / 2;
      sy = smoothed.cy - cropH / 2;
      sw = cropW;
      sh = cropH;
      sx = Math.max(0, Math.min(sx, vw - sw));
      sy = Math.max(0, Math.min(sy, vh - sh));
    } else {
      resetSmoothing();
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    return true;
  }, [applySmoothing, computeTargetCrop, landmarksRef, resetSmoothing]);

  const stopCapture = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    resetSmoothing();
    setIsCapturing(false);
  }, [resetSmoothing]);

  const startCapture = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: CAPTURE_WIDTH,
          height: CAPTURE_HEIGHT,
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const canvas = outputCanvasRef.current;
      if (canvas) {
        canvas.width = CAPTURE_WIDTH;
        canvas.height = CAPTURE_HEIGHT;
      }

      resetSmoothing();
      setIsCapturing(true);
      return true;
    } catch (err) {
      stopCapture();
      setError(err instanceof Error ? err.message : "Failed to access camera");
      return false;
    }
  }, [resetSmoothing, stopCapture]);

  const captureFrame = useCallback((): Blob | null => {
    if (!isCapturing || !outputCanvasRef.current) return null;
    const ok = drawProcessedFrame();
    if (!ok) return null;

    const dataUrl = outputCanvasRef.current.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;

    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: "image/jpeg" });
  }, [drawProcessedFrame, isCapturing]);

  useEffect(() => {
    if (!isCapturing) return;

    const tick = () => {
      drawProcessedFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [drawProcessedFrame, isCapturing]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing,
    error,
    videoRef,
    outputCanvasRef,
    startCapture,
    stopCapture,
    captureFrame,
  };
}
