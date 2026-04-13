import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { runRetarget, savePlatformArtifact } from "../api/client";
import { useCameraCapture } from "../hooks/useCameraCapture";
import { type RecordingResult, useMotionCaptureWs } from "../hooks/useMotionCaptureWs";

type MotionCapturePanelProps = {
  enabled: boolean;
  onLiveTrackChange: (enabled: boolean) => void;
  onJointAnglesUpdate: (jointAngles: Record<string, number>) => void;
  onRecordingComplete?: (result: RecordingResult) => void;
  /** Called after landmarks JSON is saved to the platform artifact store (same X-User-Id as the motion pipeline). */
  onLandmarksArtifactUploaded?: (artifactName: string) => void;
  motionCaptureUrl?: string;
};

const FRAME_INTERVAL_MS = 66;
const RETARGET_INTERVAL_MS = 100;

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
    if (!ws.isRecording || !ws.latestPose) return;
    const lm = ws.latestPose.landmarks;
    if (!Array.isArray(lm) || lm.length !== 33) return;
    const row0 = lm[0];
    if (!Array.isArray(row0) || row0.length !== 3) return;
    landmarksBufferRef.current.push(cloneLandmarksFrame(lm as number[][]));
  }, [ws.isRecording, ws.latestPose]);

  useEffect(() => {
    const pose = ws.latestPose;
    if (!enabled || !pose) return;
    if (retargetInFlightRef.current) return;
    const now = Date.now();
    if (now - lastRetargetAtRef.current < RETARGET_INTERVAL_MS) return;

    retargetInFlightRef.current = true;
    lastRetargetAtRef.current = now;
    void runRetarget({ landmarks: pose.landmarks })
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
      })
      .catch(() => {
        /* keep panel responsive even when retarget fails */
      })
      .finally(() => {
        retargetInFlightRef.current = false;
      });
  }, [enabled, onJointAnglesUpdate, ws.latestPose]);

  const handleStartCamera = useCallback(async () => {
    if (!enabled) return;
    const started = await camera.startCapture();
    if (!started) return;
    ws.connect(motionCaptureUrl);
  }, [camera, enabled, motionCaptureUrl, ws]);

  const handleStopCamera = useCallback(() => {
    camera.stopCapture();
    ws.disconnect();
  }, [camera, ws]);

  const handleStartRecording = useCallback(() => {
    landmarksBufferRef.current = [];
    ws.startRecording();
  }, [ws]);

  const handleStopRecording = useCallback(async () => {
    const result = await ws.stopRecording();
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
      });
      toast.success(t("pose.motionCaptureLandmarksSaved", { name, count: frames.length }));
      onLandmarksArtifactUploaded?.(name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("pose.motionCaptureLandmarksSaveFail"), { description: msg });
    }
  }, [onLandmarksArtifactUploaded, onRecordingComplete, t, ws]);

  const statusTextKey =
    ws.connectionState === "connected"
      ? "pose.motionCaptureConnected"
      : ws.connectionState === "connecting"
      ? "pose.motionCaptureConnecting"
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
          <div className="motion-capture-preview-wrap">
            <video
              ref={camera.videoRef}
              className="motion-capture-source-video"
              autoPlay
              playsInline
              muted
              aria-hidden
            />
            <canvas
              ref={camera.outputCanvasRef}
              className="motion-capture-preview-canvas"
              width={640}
              height={480}
              aria-label={t("pose.motionCaptureTitle")}
            />
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
