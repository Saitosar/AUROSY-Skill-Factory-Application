import { useCallback, useEffect, useRef, useState } from "react";
import { motionCaptureWebSocketUrl } from "../api/client";

export type PoseData = {
  landmarks: number[][];
  confidence: number;
  timestamp_ms: number;
};

export type RecordingResult = {
  bvh: string;
  duration_sec: number;
  frame_count: number;
  landmarks_frames?: number[][][];
};

type PendingRecording = {
  resolve: (value: RecordingResult | null) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const RECORDING_TIMEOUT_MS = 5000;

export function useMotionCaptureWs() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [latestPose, setLatestPose] = useState<PoseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRecordingRef = useRef<PendingRecording | null>(null);

  const clearPendingRecording = useCallback((value: RecordingResult | null) => {
    const pending = pendingRecordingRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pending.resolve(value);
    pendingRecordingRef.current = null;
  }, []);

  const connect = useCallback((url?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url ?? motionCaptureWebSocketUrl());
    wsRef.current = ws;
    setError(null);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      wsRef.current = null;
      setIsConnected(false);
      setIsRecording(false);
      clearPendingRecording(null);
    };

    ws.onerror = () => {
      setError("Motion capture WebSocket error");
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as Record<string, unknown>;
        const type = payload.type;

        if (type === "pose") {
          setLatestPose({
            landmarks: (payload.landmarks as number[][]) ?? [],
            confidence: Number(payload.confidence ?? 0),
            timestamp_ms: Number(payload.timestamp_ms ?? 0),
          });
        } else if (type === "recording_started") {
          setIsRecording(true);
        } else if (type === "recording_stopped") {
          setIsRecording(false);
          clearPendingRecording({
            bvh: String(payload.bvh ?? ""),
            duration_sec: Number(payload.duration_sec ?? 0),
            frame_count: Number(payload.frame_count ?? 0),
            landmarks_frames: Array.isArray(payload.landmarks_frames)
              ? (payload.landmarks_frames as number[][][])
              : undefined,
          });
        }
      } catch {
        setError("Invalid motion capture message");
      }
    };
  }, [clearPendingRecording]);

  const disconnect = useCallback(() => {
    clearPendingRecording(null);
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
    setIsConnected(false);
    setIsRecording(false);
    setLatestPose(null);
  }, [clearPendingRecording]);

  const sendFrame = useCallback((frame: Blob) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    void frame.arrayBuffer().then((buf) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(buf);
    });
  }, []);

  const startRecording = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "start_recording" }));
  }, []);

  const stopRecording = useCallback((): Promise<RecordingResult | null> => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.resolve(null);
    return new Promise((resolve) => {
      clearPendingRecording(null);
      const timeoutId = setTimeout(() => {
        clearPendingRecording(null);
      }, RECORDING_TIMEOUT_MS);
      pendingRecordingRef.current = { resolve, timeoutId };
      ws.send(JSON.stringify({ type: "stop_recording" }));
    });
  }, [clearPendingRecording]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isRecording,
    latestPose,
    error,
    connect,
    disconnect,
    sendFrame,
    startRecording,
    stopRecording,
  };
}
