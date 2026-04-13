import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { runRetarget, savePlatformArtifact } from "../api/client";
import { LiveCalibration } from "../components/LiveCalibration";
import { LiveModeCamera } from "../components/LiveModeCamera";
import { useCameraCapture } from "../hooks/useCameraCapture";
import { useLiveRecorder } from "../hooks/useLiveRecorder";
import { type RecordingResult, useMotionCaptureWs } from "../hooks/useMotionCaptureWs";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import { LIVE_MODE_DEFAULTS } from "../lib/liveContracts";

type MotionCapturePanelProps = {
  enabled: boolean;
  onLiveTrackChange: (enabled: boolean) => void;
  onJointAnglesUpdate: (jointAngles: Record<string, number>) => void;
  onRecordingComplete?: (result: RecordingResult) => void;
  /** Called after landmarks JSON is saved to the platform artifact store (same X-User-Id as the motion pipeline). */
  onLandmarksArtifactUploaded?: (artifactName: string) => void;
  motionCaptureUrl?: string;
};

const FRAME_INTERVAL_MS = Math.round(1000 / LIVE_MODE_DEFAULTS.captureFps);
const RETARGET_INTERVAL_MS = Math.round(1000 / LIVE_MODE_DEFAULTS.retargetFps);

function cloneLandmarksFrame(landmarks: number[][]): number[][] {
  return landmarks.map((row) => row.slice());
}

export function MotionCapturePanel({
  enabled,
  onLiveTrackChange,
  onJointAnglesUpdate,
  onRecordingComplete,
  onLandmarksArtifactUploaded,
  motionCaptureUrl,
}: MotionCapturePanelProps) {
  const { t } = useTranslation();
  const landmarksForCenterRef = useRef<number[][] | null | undefined>(undefined);
  const ws = useMotionCaptureWs();
  landmarksForCenterRef.current = ws.latestPose?.landmarks;
  const camera = useCameraCapture(landmarksForCenterRef);
  const frameTimerRef = useRef<number | null>(null);
  const retargetInFlightRef = useRef(false);
  const lastRetargetAtRef = useRef(0);
  const landmarksBufferRef = useRef<number[][][]>([]);
  const poseLandmarker = usePoseLandmarker();
  const localRecorder = useLiveRecorder();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    onLiveTrackChange(enabled && camera.isCapturing && ws.isConnected);
  }, [camera.isCapturing, enabled, onLiveTrackChange, ws.isConnected]);

  useEffect(() => {
    if (!enabled || !camera.isCapturing || !ws.isConnected) return;
    frameTimerRef.current = window.setInterval(() => {
      const frame = camera.captureFrame();
      if (frame) ws.sendFrame(frame);
    }, FRAME_INTERVAL_MS);
    return () => {
      if (frameTimerRef.current != null) {
        clearInterval(frameTimerRef.current);
      }
      frameTimerRef.current = null;
    };
  }, [camera.captureFrame, camera.isCapturing, enabled, ws.isConnected, ws.sendFrame]);

  useEffect(() => {
    if (!camera.isCapturing) {
      poseLandmarker.stop();
      return;
    }
    const video = camera.videoRef.current;
    if (!video) return;
    void poseLandmarker.start(video);
  }, [camera.isCapturing, camera.videoRef, poseLandmarker]);

  useEffect(() => {
    if (!ws.isRecording || !ws.latestPose) return;
    const lm = ws.latestPose.landmarks;
    if (!Array.isArray(lm) || lm.length !== 33) return;
    const row0 = lm[0];
    if (!Array.isArray(row0) || row0.length !== 3) return;
    landmarksBufferRef.current.push(cloneLandmarksFrame(lm as number[][]));
  }, [ws.isRecording, ws.latestPose]);

  useEffect(() => {
    if (!enabled) return;
    const wsPose = ws.latestPose;
    if (
      wsPose?.joint_order &&
      wsPose.joint_angles_rad &&
      wsPose.joint_order.length === wsPose.joint_angles_rad.length &&
      wsPose.joint_order.length > 0
    ) {
      const mapped: Record<string, number> = {};
      wsPose.joint_order.forEach((jointName, idx) => {
        const value = wsPose.joint_angles_rad?.[idx];
        if (typeof value === "number" && Number.isFinite(value)) mapped[jointName] = value;
      });
      onJointAnglesUpdate(mapped);
      localRecorder.push(mapped);
      return;
    }

    const pose = wsPose?.landmarks ?? poseLandmarker.landmarks;
    if (!pose) return;
    if (retargetInFlightRef.current) return;
    const now = Date.now();
    if (now - lastRetargetAtRef.current < RETARGET_INTERVAL_MS) return;

    retargetInFlightRef.current = true;
    lastRetargetAtRef.current = now;
    void runRetarget({ landmarks: pose })
      .then((result) => {
        const values = Array.isArray(result.joint_angles_rad)
          ? (result.joint_angles_rad as number[])
          : [];
        if (!values.length) return;
        const mapped: Record<string, number> = {};
        result.joint_order.forEach((jointName, idx) => {
          const value = values[idx];
          if (typeof value === "number" && Number.isFinite(value)) {
            mapped[jointName] = value;
          }
        });
        onJointAnglesUpdate(mapped);
        localRecorder.push(mapped);
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg) {
          // Non-fatal: keep panel responsive on transient backend hiccups.
          setCollapsed((prev) => prev);
        }
      })
      .finally(() => {
        retargetInFlightRef.current = false;
      });
  }, [enabled, localRecorder, onJointAnglesUpdate, poseLandmarker.landmarks, ws.latestPose]);

  const connectAfterCalibration = useCallback(() => {
    setIsCalibrating(false);
    if (!pendingConnect) return;
    ws.connect(motionCaptureUrl);
    setPendingConnect(false);
  }, [motionCaptureUrl, pendingConnect, ws]);

  const handleStartCamera = useCallback(async () => {
    if (!enabled) return;
    const started = await camera.startCapture();
    if (!started) return;
    setIsCalibrating(true);
    setPendingConnect(true);
  }, [camera, enabled]);

  const handleStopCamera = useCallback(() => {
    camera.stopCapture();
    ws.disconnect();
    setIsCalibrating(false);
    setPendingConnect(false);
    localRecorder.stop();
  }, [camera, localRecorder, ws]);

  const handleStartRecording = useCallback(() => {
    landmarksBufferRef.current = [];
    if (ws.isConnected) ws.startRecording();
    localRecorder.start();
  }, [localRecorder, ws]);

  const handleStopRecording = useCallback(async () => {
    const result = ws.isConnected ? await ws.stopRecording() : null;
    const localFrames = localRecorder.stop();
    if (result && onRecordingComplete) {
      onRecordingComplete(result);
    }
    const frames =
      result?.landmarks_frames && result.landmarks_frames.length > 0
        ? result.landmarks_frames
        : landmarksBufferRef.current;
    landmarksBufferRef.current = [];
    if (frames.length === 0) return;
    const name = `capture-landmarks-${Date.now()}.json`;
    try {
      await savePlatformArtifact(name, {
        schema_version: "aurosy_capture_v1",
        source: "motion_capture_ws",
        frames,
        bvh: result?.bvh ?? "",
        local_joint_recording: localFrames,
      });
      toast.success(t("pose.motionCaptureLandmarksSaved", { name, count: frames.length }));
      onLandmarksArtifactUploaded?.(name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("pose.motionCaptureLandmarksSaveFail"), { description: msg });
    }
  }, [localRecorder, onLandmarksArtifactUploaded, onRecordingComplete, t, ws]);

  const statusTextKey =
    ws.connectionState === "connected"
      ? "pose.motionCaptureConnected"
      : ws.connectionState === "connecting"
      ? "pose.motionCaptureConnecting"
      : camera.isCapturing && !ws.isConnected && poseLandmarker.landmarks
      ? "pose.motionCaptureLocalFallback"
      : ws.connectionState === "idle"
      ? "pose.motionCaptureIdle"
      : ws.connectionState === "error"
      ? "pose.motionCaptureConnectionError"
      : "pose.motionCaptureDisconnected";
  const statusClassName = ws.connectionState === "connected" ? "ok" : "muted";

  return (
    <section className="motion-capture-panel panel" aria-label={t("pose.motionCaptureTitle")}>
      <div className="motion-capture-header">
        <h2 className="pose-studio-panel-heading">{t("pose.motionCaptureTitle")}</h2>
        <button
          type="button"
          className="motion-capture-collapse-btn"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsed && (
        <>
          <div style={{ position: "relative" }}>
            <LiveModeCamera
              videoRef={camera.videoRef}
              canvasRef={camera.outputCanvasRef}
              landmarks={poseLandmarker.landmarks}
              confidence={poseLandmarker.confidence}
              fps={poseLandmarker.fps}
              title={t("pose.motionCaptureTitle")}
            />
            <LiveCalibration active={isCalibrating} onComplete={connectAfterCalibration} />
          </div>
          {ws.latestPose && (
            <p className="motion-capture-confidence">
              {t("pose.motionCaptureConfidence")}: {(ws.latestPose.confidence * 100).toFixed(0)}%
            </p>
          )}
          <div className="motion-capture-controls">
            {!camera.isCapturing ? (
              <button
                type="button"
                className="secondary"
                disabled={!enabled}
                onClick={() => void handleStartCamera()}
              >
                {t("pose.motionCaptureStartCamera")}
              </button>
            ) : (
              <>
                <button type="button" className="secondary" onClick={handleStopCamera}>
                  {t("pose.motionCaptureStopCamera")}
                </button>
                {!ws.isRecording ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={!enabled || !ws.isConnected}
                    onClick={handleStartRecording}
                  >
                    {t("pose.motionCaptureStartRecording")}
                  </button>
                ) : (
                  <button type="button" className="secondary" onClick={() => void handleStopRecording()}>
                    {t("pose.motionCaptureStopRecording")}
                  </button>
                )}
              </>
            )}
          </div>
          <p className={statusClassName}>{t(statusTextKey)}</p>
          {!enabled && <p className="muted">{t("pose.motionCaptureUnavailable")}</p>}
          {(camera.error || ws.error) && <p className="err">{camera.error || ws.error}</p>}
        </>
      )}
    </section>
  );
}
