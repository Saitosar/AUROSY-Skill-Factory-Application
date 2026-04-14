import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { MotionDraftFrame } from "../hooks/useMotionDraft";

interface MotionTimelineProps {
  frames: MotionDraftFrame[];
  currentIndex: number;
  onSeek: (index: number) => void;
  onToggleExclusion?: (index: number) => void;
  disabled?: boolean;
}

export function MotionTimeline({
  frames,
  currentIndex,
  onSeek,
  onToggleExclusion,
  disabled,
}: MotionTimelineProps) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || frames.length === 0 || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const index = Math.floor(ratio * frames.length);
      onSeek(Math.min(index, frames.length - 1));
    },
    [disabled, frames.length, onSeek]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || frames.length === 0) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek(Math.max(0, currentIndex - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek(Math.min(frames.length - 1, currentIndex + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek(frames.length - 1);
      } else if (e.key === "x" && onToggleExclusion) {
        e.preventDefault();
        onToggleExclusion(currentIndex);
      }
    },
    [disabled, frames.length, currentIndex, onSeek, onToggleExclusion]
  );

  const progressPercent = useMemo(() => {
    if (frames.length === 0) return 0;
    return ((currentIndex + 1) / frames.length) * 100;
  }, [currentIndex, frames.length]);

  const confidenceGradient = useMemo(() => {
    if (frames.length === 0) return "transparent";

    const stops = frames.map((f, i) => {
      const percent = (i / frames.length) * 100;
      let color = "var(--color-success, #22c55e)";
      if (f.excluded) {
        color = "var(--color-muted, #6b7280)";
      } else if (f.confidence < 0.5) {
        color = "var(--color-warning, #f59e0b)";
      } else if (f.confidence < 0.3) {
        color = "var(--color-error, #ef4444)";
      }
      return `${color} ${percent}%`;
    });

    return `linear-gradient(to right, ${stops.join(", ")})`;
  }, [frames]);

  const currentFrame = frames[currentIndex];
  const currentTimeSec = currentFrame ? (currentFrame.timestamp_ms / 1000).toFixed(2) : "0.00";
  const totalTimeSec =
    frames.length > 0
      ? ((frames[frames.length - 1]?.timestamp_ms ?? 0) / 1000).toFixed(2)
      : "0.00";

  return (
    <div className="motion-timeline" aria-label={t("timeline.label", "Motion timeline")}>
      <div className="motion-timeline__info">
        <span className="motion-timeline__time">
          {currentTimeSec}s / {totalTimeSec}s
        </span>
        <span className="motion-timeline__frame">
          {t("timeline.frame", "Frame")} {currentIndex + 1} / {frames.length}
        </span>
        {currentFrame && (
          <span
            className={`motion-timeline__confidence ${
              currentFrame.confidence < 0.5 ? "motion-timeline__confidence--low" : ""
            }`}
          >
            {t("timeline.confidence", "Conf")}: {(currentFrame.confidence * 100).toFixed(0)}%
          </span>
        )}
        {currentFrame?.excluded && (
          <span className="motion-timeline__excluded">
            {t("timeline.excluded", "Excluded")}
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        className="motion-timeline__track"
        onClick={handleTrackClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-valuenow={currentIndex}
        aria-valuemin={0}
        aria-valuemax={frames.length - 1}
        aria-label={t("timeline.scrubber", "Timeline scrubber")}
        style={{ background: confidenceGradient }}
      >
        <div
          className="motion-timeline__progress"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="motion-timeline__playhead"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {onToggleExclusion && (
        <div className="motion-timeline__actions">
          <button
            type="button"
            className="secondary"
            onClick={() => onToggleExclusion(currentIndex)}
            disabled={disabled || frames.length === 0}
          >
            {currentFrame?.excluded
              ? t("timeline.include", "Include Frame")
              : t("timeline.exclude", "Exclude Frame")}
          </button>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {t("timeline.excludeHint", "Press X to toggle")}
          </span>
        </div>
      )}
    </div>
  );
}
