import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import MuJoCoG1Viewer from "./MuJoCoG1Viewer";
import type { JointAngles } from "../../lib/telemetryTypes";

export type TrajectoryFrame = {
  jointAngles: number[];
  timestamp_ms?: number;
};

export type TrajectoryPlayerProps = {
  jointOrder: string[];
  frames: TrajectoryFrame[];
  fps?: number;
  physicsEnabled?: boolean;
  freeStand?: boolean;
  autoBalance?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  onFrameChange?: (frameIndex: number, jointAngles: Record<string, number>) => void;
  onReady?: (ctx: { model: unknown; data: unknown; mujoco: unknown }) => void;
  onError?: (e: Error) => void;
};

export function TrajectoryPlayer({
  jointOrder,
  frames,
  fps = 30,
  physicsEnabled = false,
  freeStand = false,
  autoBalance = false,
  autoPlay = false,
  loop = false,
  onFrameChange,
  onReady,
  onError,
}: TrajectoryPlayerProps) {
  const { t } = useTranslation();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const playbackRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const currentJointRad = useCallback((): JointAngles => {
    const frame = frames[currentFrameIndex];
    if (!frame) return {};

    const result: JointAngles = {};
    jointOrder.forEach((key, i) => {
      if (frame.jointAngles[i] !== undefined) {
        result[key] = frame.jointAngles[i];
      }
    });
    return result;
  }, [frames, currentFrameIndex, jointOrder]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
        playbackRef.current = null;
      }
      return;
    }

    const frameDuration = (1000 / fps) / playbackSpeed;
    lastFrameTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= frameDuration) {
        setCurrentFrameIndex((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            if (loop) return 0;
            setIsPlaying(false);
            return prev;
          }
          return next;
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
  }, [isPlaying, fps, playbackSpeed, frames.length, loop]);

  useEffect(() => {
    if (onFrameChange && frames[currentFrameIndex]) {
      onFrameChange(currentFrameIndex, currentJointRad());
    }
  }, [currentFrameIndex, onFrameChange, currentJointRad]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  }, []);
  const seekTo = useCallback((index: number) => {
    setCurrentFrameIndex(Math.max(0, Math.min(index, frames.length - 1)));
  }, [frames.length]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      seekTo(parseInt(e.target.value, 10));
    },
    [seekTo]
  );

  const progressPercent = frames.length > 0
    ? ((currentFrameIndex + 1) / frames.length) * 100
    : 0;

  const currentTimeSec = frames[currentFrameIndex]?.timestamp_ms
    ? (frames[currentFrameIndex].timestamp_ms / 1000).toFixed(2)
    : ((currentFrameIndex / fps) * playbackSpeed).toFixed(2);

  const totalTimeSec = frames.length > 0
    ? (((frames.length - 1) / fps)).toFixed(2)
    : "0.00";

  return (
    <div className="trajectory-player">
      <div className="trajectory-player__viewer">
        <MuJoCoG1Viewer
          jointRad={currentJointRad()}
          physicsEnabled={physicsEnabled}
          freeStand={freeStand}
          autoBalance={autoBalance}
          onReady={onReady}
          onError={onError}
        />
      </div>

      <div className="trajectory-player__controls">
        <div className="trajectory-player__timeline">
          <span className="trajectory-player__time">
            {currentTimeSec}s / {totalTimeSec}s
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={currentFrameIndex}
            onChange={handleSliderChange}
            className="trajectory-player__slider"
            disabled={frames.length === 0}
          />
          <span className="trajectory-player__frame">
            {currentFrameIndex + 1} / {frames.length}
          </span>
        </div>

        <div className="trajectory-player__buttons">
          <button
            type="button"
            onClick={stop}
            disabled={frames.length === 0}
            className="trajectory-player__btn"
            title={t("player.stop", "Stop")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
          </button>

          {isPlaying ? (
            <button
              type="button"
              onClick={pause}
              disabled={frames.length === 0}
              className="trajectory-player__btn trajectory-player__btn--primary"
              title={t("player.pause", "Pause")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={play}
              disabled={frames.length === 0}
              className="trajectory-player__btn trajectory-player__btn--primary"
              title={t("player.play", "Play")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}

          <label className="trajectory-player__speed">
            <span>{t("player.speed", "Speed")}</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
            </select>
          </label>

          <label className="trajectory-player__loop">
            <input
              type="checkbox"
              checked={loop}
              onChange={() => {}}
              disabled
            />
            <span>{t("player.loop", "Loop")}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
