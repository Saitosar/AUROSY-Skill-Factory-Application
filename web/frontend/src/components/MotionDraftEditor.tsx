import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { YouTubeUrlInput } from "./YouTubeUrlInput";
import { MotionTimeline } from "./MotionTimeline";
import { useVideoIngest } from "../hooks/useVideoIngest";
import { useMotionDraft, type LandmarksData } from "../hooks/useMotionDraft";
import { savePlatformArtifact } from "../api/client";

interface MotionDraftEditorProps {
  onJointAnglesUpdate?: (jointAngles: number[], jointOrder: string[]) => void;
  onReferenceReady?: (artifactName: string) => void;
  disabled?: boolean;
}

type EditorStage = "url" | "downloading" | "processing" | "editing" | "retargeting" | "ready";

export function MotionDraftEditor({
  onJointAnglesUpdate,
  onReferenceReady,
  disabled,
}: MotionDraftEditorProps) {
  const { t } = useTranslation();
  const videoIngest = useVideoIngest();
  const draft = useMotionDraft();

  const [stage, setStage] = useState<EditorStage>("url");
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  const handleUrlSubmit = useCallback(
    async (url: string, options?: { startSec?: number; endSec?: number }) => {
      setStage("downloading");
      const result = await videoIngest.ingest(url, options);

      if (result) {
        toast.success(
          t("video.downloadComplete", "Video downloaded: {{title}}", { title: result.title })
        );

        setStage("processing");
        const jobId = await videoIngest.startProcessing(result.video_id, {
          targetFps: 30,
          startSec: options?.startSec,
          endSec: options?.endSec,
        });

        if (jobId) {
          setPollInterval(window.setInterval(() => {}, 2000));
        } else {
          setStage("url");
        }
      } else {
        setStage("url");
      }
    },
    [videoIngest, t]
  );

  useEffect(() => {
    if (stage !== "processing" || !videoIngest.processingJobId) return;

    const interval = setInterval(async () => {
      const done = await videoIngest.pollProcessingStatus();
      if (done) {
        clearInterval(interval);

        if (videoIngest.processingStatus === "succeeded") {
          toast.success(t("video.processingComplete", "Pose extraction complete"));
          setStage("editing");
        } else {
          toast.error(
            t("video.processingFailed", "Processing failed: {{error}}", {
              error: videoIngest.error || "Unknown error",
            })
          );
          setStage("url");
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [stage, videoIngest.processingJobId, videoIngest.pollProcessingStatus, videoIngest.processingStatus, videoIngest.error, t]);

  useEffect(() => {
    if (draft.currentFrame?.jointAngles && onJointAnglesUpdate) {
      onJointAnglesUpdate(draft.currentFrame.jointAngles, draft.jointOrder);
    }
  }, [draft.currentFrame?.jointAngles, draft.jointOrder, onJointAnglesUpdate]);

  const handleRetarget = useCallback(async () => {
    setStage("retargeting");
    await draft.retargetFrames();
    if (draft.retargetError) {
      toast.error(draft.retargetError);
      setStage("editing");
    } else {
      toast.success(t("video.retargetComplete", "Retargeting complete"));
      setStage("ready");
    }
  }, [draft, t]);

  const handleSaveReference = useCallback(async () => {
    if (draft.retargetedFrameCount === 0) {
      toast.error(t("video.noFramesToSave", "No retargeted frames to save"));
      return;
    }

    const validFrames = draft.frames
      .filter((f) => !f.excluded && f.jointAngles !== null)
      .map((f) => ({
        joint_angles_rad: f.jointAngles,
        timestamp_ms: f.timestamp_ms,
      }));

    const referenceTrajectory = {
      version: "1.0",
      robot: "unitree_g1_29dof",
      joint_order: draft.jointOrder,
      dt: 1.0 / draft.fps,
      frames: validFrames.map((f) => ({
        joint_angles_rad: f.joint_angles_rad,
      })),
      source: "youtube_video_extraction",
    };

    try {
      const artifactName = `reference_trajectory_${Date.now()}.json`;
      await savePlatformArtifact(artifactName, referenceTrajectory);
      toast.success(t("video.referenceSaved", "Reference trajectory saved"));
      onReferenceReady?.(artifactName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    }
  }, [draft, t, onReferenceReady]);

  const handleReset = useCallback(() => {
    videoIngest.reset();
    draft.reset();
    setStage("url");
  }, [videoIngest, draft]);

  return (
    <div className="motion-draft-editor">
      <div className="motion-draft-editor__header">
        <h3>{t("video.draftEditor", "Motion Draft Editor")}</h3>
        {stage !== "url" && (
          <button type="button" className="secondary" onClick={handleReset}>
            {t("video.reset", "Reset")}
          </button>
        )}
      </div>

      {(videoIngest.error || draft.retargetError) && (
        <div className="motion-draft-editor__error">
          {videoIngest.error || draft.retargetError}
        </div>
      )}

      {stage === "url" && (
        <YouTubeUrlInput
          onSubmit={handleUrlSubmit}
          isLoading={videoIngest.isLoading}
          disabled={disabled}
        />
      )}

      {stage === "downloading" && (
        <div className="motion-draft-editor__status">
          <div className="motion-draft-editor__spinner" />
          <p>{t("video.downloading", "Downloading video...")}</p>
          {videoIngest.video && (
            <p className="muted">{videoIngest.video.title}</p>
          )}
        </div>
      )}

      {stage === "processing" && (
        <div className="motion-draft-editor__status">
          <div className="motion-draft-editor__spinner" />
          <p>{t("video.extractingPoses", "Extracting poses from video...")}</p>
          <p className="muted">
            {t("video.processingStatus", "Status: {{status}}", {
              status: videoIngest.processingStatus || "queued",
            })}
          </p>
        </div>
      )}

      {stage === "retargeting" && (
        <div className="motion-draft-editor__status">
          <div className="motion-draft-editor__spinner" />
          <p>{t("video.retargeting", "Converting to robot joint angles...")}</p>
        </div>
      )}

      {(stage === "editing" || stage === "ready") && (
        <div className="motion-draft-editor__workspace">
          <div className="motion-draft-editor__stats">
            <span>
              {t("video.totalFrames", "Total: {{count}}", { count: draft.frames.length })}
            </span>
            <span>
              {t("video.validFrames", "Valid: {{count}}", { count: draft.validFrameCount })}
            </span>
            {draft.retargetedFrameCount > 0 && (
              <span>
                {t("video.retargetedFrames", "Retargeted: {{count}}", {
                  count: draft.retargetedFrameCount,
                })}
              </span>
            )}
          </div>

          <MotionTimeline
            frames={draft.frames}
            currentIndex={draft.currentFrameIndex}
            onSeek={draft.setCurrentFrame}
            onToggleExclusion={draft.toggleFrameExclusion}
            disabled={disabled || draft.isRetargeting}
          />

          <div className="motion-draft-editor__controls">
            <div className="motion-draft-editor__playback">
              {draft.isPlaying ? (
                <button type="button" onClick={draft.pause} disabled={disabled}>
                  {t("video.pause", "Pause")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={draft.play}
                  disabled={disabled || draft.frames.length === 0}
                >
                  {t("video.play", "Play")}
                </button>
              )}

              <label className="motion-draft-editor__speed">
                <span>{t("video.speed", "Speed")}</span>
                <select
                  value={draft.playbackSpeed}
                  onChange={(e) => draft.setPlaybackSpeed(parseFloat(e.target.value))}
                  disabled={disabled}
                >
                  <option value="0.25">0.25x</option>
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                </select>
              </label>
            </div>

            <div className="motion-draft-editor__actions">
              {stage === "editing" && (
                <button
                  type="button"
                  onClick={handleRetarget}
                  disabled={disabled || draft.validFrameCount === 0 || draft.isRetargeting}
                >
                  {t("video.retarget", "Convert to Robot Motion")}
                </button>
              )}

              {stage === "ready" && (
                <button
                  type="button"
                  onClick={handleSaveReference}
                  disabled={disabled || draft.retargetedFrameCount === 0}
                >
                  {t("video.saveReference", "Save Reference Trajectory")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
