import { useCallback, useEffect, useRef, useState } from "react";

const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;
const JPEG_QUALITY = 0.8;

export function useCameraCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsCapturing(false);
  }, []);

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

      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      canvasRef.current.width = CAPTURE_WIDTH;
      canvasRef.current.height = CAPTURE_HEIGHT;

      setIsCapturing(true);
      return true;
    } catch (err) {
      stopCapture();
      setError(err instanceof Error ? err.message : "Failed to access camera");
      return false;
    }
  }, [stopCapture]);

  const captureFrame = useCallback((): Blob | null => {
    if (!isCapturing || !videoRef.current || !canvasRef.current) return null;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;

    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: "image/jpeg" });
  }, [isCapturing]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing,
    error,
    videoRef,
    startCapture,
    stopCapture,
    captureFrame,
  };
}
