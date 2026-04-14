import { SKILL_KEYS_IN_JOINT_MAP_ORDER } from "../mujoco/jointMapping";
import type { JointAngles } from "./telemetryTypes";

export type NlaTrackId = "hands" | "legs" | "torso";

export type NlaBezierHandle = {
  dt: number;
  dv: number;
};

export type NlaKeyframe = {
  id: string;
  timeSec: number;
  valueRad: number;
  inHandle: NlaBezierHandle;
  outHandle: NlaBezierHandle;
};

export type NlaJointCurve = {
  joint: string;
  keyframes: NlaKeyframe[];
};

export type NlaClip = {
  id: string;
  name: string;
  startSec: number;
  durationSec: number;
  curves: NlaJointCurve[];
};

export type NlaTrack = {
  id: NlaTrackId;
  label: string;
  joints: string[];
  clips: NlaClip[];
  enabled: boolean;
  weight: number;
};

export type NlaTimeline = {
  version: 1;
  fps: number;
  tracks: NlaTrack[];
};

export const NLA_TRACK_LABELS: Record<NlaTrackId, string> = {
  hands: "Hands",
  legs: "Legs",
  torso: "Torso",
};

const HAND_JOINTS = SKILL_KEYS_IN_JOINT_MAP_ORDER.filter(
  (joint) =>
    joint.includes("shoulder") ||
    joint.includes("elbow") ||
    joint.includes("wrist")
);
const LEG_JOINTS = SKILL_KEYS_IN_JOINT_MAP_ORDER.filter(
  (joint) => joint.includes("hip") || joint.includes("knee") || joint.includes("ankle")
);
const TORSO_JOINTS = SKILL_KEYS_IN_JOINT_MAP_ORDER.filter((joint) => joint.includes("waist"));

export const NLA_TRACK_PRESETS: Array<Pick<NlaTrack, "id" | "label" | "joints">> = [
  { id: "hands", label: NLA_TRACK_LABELS.hands, joints: HAND_JOINTS },
  { id: "legs", label: NLA_TRACK_LABELS.legs, joints: LEG_JOINTS },
  { id: "torso", label: NLA_TRACK_LABELS.torso, joints: TORSO_JOINTS },
];

function createBezierHandle(dt: number): NlaBezierHandle {
  return { dt, dv: 0 };
}

export function createNlaKeyframe(timeSec: number, valueRad: number, id?: string): NlaKeyframe {
  return {
    id: id ?? `kf-${Math.random().toString(36).slice(2, 9)}`,
    timeSec,
    valueRad,
    inHandle: createBezierHandle(-0.12),
    outHandle: createBezierHandle(0.12),
  };
}

export function createEmptyNlaTimeline(fps = 30): NlaTimeline {
  return {
    version: 1,
    fps,
    tracks: NLA_TRACK_PRESETS.map((preset) => ({
      id: preset.id,
      label: preset.label,
      joints: [...preset.joints],
      clips: [],
      enabled: true,
      weight: 1,
    })),
  };
}

export function timelineDurationSec(timeline: NlaTimeline): number {
  let end = 0;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.startSec + clip.durationSec;
      if (clipEnd > end) end = clipEnd;
    }
  }
  return end;
}

function clipForTrackFromPoses(
  track: Pick<NlaTrack, "id" | "joints" | "label">,
  poses: JointAngles[],
  stepSec: number
): NlaClip {
  const curves: NlaJointCurve[] = track.joints.map((joint) => {
    const keyframes = poses.map((pose, index) => {
      const v = pose[joint];
      return createNlaKeyframe(index * stepSec, typeof v === "number" ? v : 0);
    });
    return { joint, keyframes };
  });
  const durationSec = Math.max(stepSec, (poses.length - 1) * stepSec);
  return {
    id: `${track.id}-clip-1`,
    name: `${track.label} Base`,
    startSec: 0,
    durationSec,
    curves,
  };
}

/**
 * Migration helper from legacy Pose Studio snapshots.
 * The first pose is expected to be current pose + additional saved poses.
 */
export function migrateSavedPosesToNlaTimeline(
  poses: JointAngles[],
  options?: { stepSec?: number; fps?: number }
): NlaTimeline {
  const stepSec = options?.stepSec ?? 0.5;
  const timeline = createEmptyNlaTimeline(options?.fps ?? 30);
  if (!poses.length) return timeline;
  timeline.tracks = timeline.tracks.map((track) => ({
    ...track,
    clips: [
      clipForTrackFromPoses(
        {
          id: track.id,
          joints: track.joints,
          label: track.label,
        },
        poses,
        stepSec
      ),
    ],
  }));
  return timeline;
}

export function cloneTimeline(timeline: NlaTimeline): NlaTimeline {
  return JSON.parse(JSON.stringify(timeline)) as NlaTimeline;
}

