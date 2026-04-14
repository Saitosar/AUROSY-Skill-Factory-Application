import { useMemo } from "react";
import type { NlaKeyframe, NlaTimeline, NlaTrack } from "../../lib/nlaTimeline";

type PoseTimelineProps = {
  timeline: NlaTimeline;
  currentTimeSec: number;
  maxTimeSec: number;
  disabled?: boolean;
  selectedTrackId: string;
  selectedJoint: string;
  onCurrentTimeChange: (value: number) => void;
  onSelectTrack: (trackId: string) => void;
  onSelectJoint: (joint: string) => void;
  onAddKeyframe: (trackId: string, joint: string, timeSec: number) => void;
  onDeleteKeyframe: (trackId: string, joint: string, keyframeId: string) => void;
  onMoveKeyframe: (trackId: string, joint: string, keyframeId: string, timeSec: number) => void;
  onUpdateBezierHandle: (
    trackId: string,
    joint: string,
    keyframeId: string,
    side: "inHandle" | "outHandle",
    axis: "dt" | "dv",
    value: number
  ) => void;
  onSetTrackWeight: (trackId: string, weight: number) => void;
  onToggleTrack: (trackId: string, enabled: boolean) => void;
  onSmoothJoint: (trackId: string, joint: string) => void;
};

function getSelectedTrack(timeline: NlaTimeline, id: string): NlaTrack | null {
  return timeline.tracks.find((track) => track.id === id) ?? null;
}

function getSelectedKeyframes(track: NlaTrack | null, joint: string): NlaKeyframe[] {
  if (!track) return [];
  const keyframes = track.clips[0]?.curves.find((curve) => curve.joint === joint)?.keyframes ?? [];
  return [...keyframes].sort((a, b) => a.timeSec - b.timeSec);
}

export function PoseTimeline({
  timeline,
  currentTimeSec,
  maxTimeSec,
  disabled,
  selectedTrackId,
  selectedJoint,
  onCurrentTimeChange,
  onSelectTrack,
  onSelectJoint,
  onAddKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
  onUpdateBezierHandle,
  onSetTrackWeight,
  onToggleTrack,
  onSmoothJoint,
}: PoseTimelineProps) {
  const selectedTrack = useMemo(
    () => getSelectedTrack(timeline, selectedTrackId),
    [selectedTrackId, timeline]
  );
  const keyframes = useMemo(
    () => getSelectedKeyframes(selectedTrack, selectedJoint),
    [selectedJoint, selectedTrack]
  );
  const rangeMax = Math.max(0.1, maxTimeSec);

  return (
    <section className="ps-timeline" aria-label="NLA timeline">
      <div className="ps-timeline__toolbar">
        <label className="ps-timeline__field">
          <span>Scrub</span>
          <input
            type="range"
            min={0}
            max={rangeMax}
            step={0.01}
            value={Math.min(rangeMax, currentTimeSec)}
            disabled={disabled}
            onChange={(event) => onCurrentTimeChange(Number(event.target.value))}
          />
        </label>
        <span className="ps-timeline__time">{currentTimeSec.toFixed(2)}s</span>
      </div>

      <div className="ps-timeline__tracks">
        {timeline.tracks.map((track) => {
          const active = track.id === selectedTrackId;
          return (
            <button
              key={track.id}
              type="button"
              className={`ps-track-lane${active ? " ps-track-lane--active" : ""}`}
              onClick={() => onSelectTrack(track.id)}
              disabled={disabled}
            >
              <span className="ps-track-lane__title">{track.label}</span>
              <span className="ps-track-lane__meta">
                clips {track.clips.length}
              </span>
            </button>
          );
        })}
      </div>

      {selectedTrack && (
        <div className="ps-timeline__editor">
          <div className="ps-timeline__row">
            <label className="ps-timeline__field">
              <span>Joint</span>
              <select
                value={selectedJoint}
                disabled={disabled}
                onChange={(event) => onSelectJoint(event.target.value)}
              >
                {selectedTrack.joints.map((joint) => (
                  <option key={joint} value={joint}>
                    {joint}
                  </option>
                ))}
              </select>
            </label>

            <label className="ps-timeline__field">
              <span>Weight</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selectedTrack.weight}
                disabled={disabled}
                onChange={(event) =>
                  onSetTrackWeight(selectedTrack.id, Number(event.target.value))
                }
              />
            </label>

            <label className="ps-timeline__check">
              <input
                type="checkbox"
                checked={selectedTrack.enabled}
                disabled={disabled}
                onChange={(event) => onToggleTrack(selectedTrack.id, event.target.checked)}
              />
              Enabled
            </label>

            <button
              type="button"
              className="ps-btn ps-btn--primary ps-btn--sm"
              disabled={disabled}
              onClick={() =>
                onAddKeyframe(selectedTrack.id, selectedJoint, currentTimeSec)
              }
            >
              Add key
            </button>
            <button
              type="button"
              className="ps-btn ps-btn--ghost ps-btn--sm"
              disabled={disabled}
              onClick={() => onSmoothJoint(selectedTrack.id, selectedJoint)}
            >
              Smooth range
            </button>
          </div>

          <div className="ps-keyframe-table">
            <div className="ps-keyframe-table__head">
              <span>t</span>
              <span>in dt</span>
              <span>in dv</span>
              <span>out dt</span>
              <span>out dv</span>
              <span />
            </div>
            {keyframes.map((keyframe) => (
              <div key={keyframe.id} className="ps-keyframe-table__row">
                <input
                  type="number"
                  step={0.01}
                  value={keyframe.timeSec}
                  disabled={disabled}
                  onChange={(event) =>
                    onMoveKeyframe(
                      selectedTrack.id,
                      selectedJoint,
                      keyframe.id,
                      Number(event.target.value)
                    )
                  }
                />
                <input
                  type="number"
                  step={0.01}
                  value={keyframe.inHandle.dt}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdateBezierHandle(
                      selectedTrack.id,
                      selectedJoint,
                      keyframe.id,
                      "inHandle",
                      "dt",
                      Number(event.target.value)
                    )
                  }
                />
                <input
                  type="number"
                  step={0.01}
                  value={keyframe.inHandle.dv}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdateBezierHandle(
                      selectedTrack.id,
                      selectedJoint,
                      keyframe.id,
                      "inHandle",
                      "dv",
                      Number(event.target.value)
                    )
                  }
                />
                <input
                  type="number"
                  step={0.01}
                  value={keyframe.outHandle.dt}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdateBezierHandle(
                      selectedTrack.id,
                      selectedJoint,
                      keyframe.id,
                      "outHandle",
                      "dt",
                      Number(event.target.value)
                    )
                  }
                />
                <input
                  type="number"
                  step={0.01}
                  value={keyframe.outHandle.dv}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdateBezierHandle(
                      selectedTrack.id,
                      selectedJoint,
                      keyframe.id,
                      "outHandle",
                      "dv",
                      Number(event.target.value)
                    )
                  }
                />
                <button
                  type="button"
                  className="ps-kf-icon-btn ps-kf-icon-btn--danger"
                  disabled={disabled}
                  onClick={() =>
                    onDeleteKeyframe(selectedTrack.id, selectedJoint, keyframe.id)
                  }
                >
                  x
                </button>
              </div>
            ))}
            {keyframes.length === 0 && (
              <p className="muted">No keyframes for selected joint.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

