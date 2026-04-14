import { SKILL_KEYS_IN_JOINT_MAP_ORDER } from "../mujoco/jointMapping";
import type { JointAngles } from "./telemetryTypes";
import type { NlaClip, NlaJointCurve, NlaKeyframe, NlaTimeline, NlaTrack } from "./nlaTimeline";

type CubicPoint = { x: number; y: number };

const DEFAULT_CURVE_VALUE = 0;

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function sortKeyframes(curve: NlaJointCurve): NlaKeyframe[] {
  return [...curve.keyframes].sort((a, b) => a.timeSec - b.timeSec);
}

function bezierPoint(p0: CubicPoint, p1: CubicPoint, p2: CubicPoint, p3: CubicPoint, t: number): CubicPoint {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function findBezierTForTime(
  p0: CubicPoint,
  p1: CubicPoint,
  p2: CubicPoint,
  p3: CubicPoint,
  targetX: number
): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) * 0.5;
    const point = bezierPoint(p0, p1, p2, p3, mid);
    if (point.x < targetX) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

function evaluateCurveSegment(from: NlaKeyframe, to: NlaKeyframe, localTimeSec: number): number {
  if (to.timeSec <= from.timeSec) return to.valueRad;
  const p0 = { x: from.timeSec, y: from.valueRad };
  const p1 = {
    x: from.timeSec + from.outHandle.dt,
    y: from.valueRad + from.outHandle.dv,
  };
  const p2 = {
    x: to.timeSec + to.inHandle.dt,
    y: to.valueRad + to.inHandle.dv,
  };
  const p3 = { x: to.timeSec, y: to.valueRad };
  const t = findBezierTForTime(p0, p1, p2, p3, localTimeSec);
  return bezierPoint(p0, p1, p2, p3, t).y;
}

export function evaluateCurveAtTime(curve: NlaJointCurve, clipTimeSec: number): number {
  const keys = sortKeyframes(curve);
  if (keys.length === 0) return DEFAULT_CURVE_VALUE;
  if (keys.length === 1) return keys[0]!.valueRad;
  if (clipTimeSec <= keys[0]!.timeSec) return keys[0]!.valueRad;
  const last = keys[keys.length - 1]!;
  if (clipTimeSec >= last.timeSec) return last.valueRad;

  for (let i = 0; i < keys.length - 1; i++) {
    const from = keys[i]!;
    const to = keys[i + 1]!;
    if (clipTimeSec >= from.timeSec && clipTimeSec <= to.timeSec) {
      return evaluateCurveSegment(from, to, clipTimeSec);
    }
  }
  return last.valueRad;
}

function evaluateClipAtTime(clip: NlaClip, timeSec: number): JointAngles {
  const localTime = timeSec - clip.startSec;
  const out: JointAngles = {};
  for (const curve of clip.curves) {
    out[curve.joint] = evaluateCurveAtTime(curve, localTime);
  }
  return out;
}

function evaluateTrackAtTime(track: NlaTrack, timeSec: number): JointAngles {
  if (!track.enabled || track.weight <= 0) return {};
  const out: JointAngles = {};
  for (const clip of track.clips) {
    if (timeSec < clip.startSec || timeSec > clip.startSec + clip.durationSec) continue;
    const pose = evaluateClipAtTime(clip, timeSec);
    for (const joint of track.joints) {
      const v = pose[joint];
      if (typeof v !== "number") continue;
      out[joint] = v;
    }
  }
  return out;
}

export function evaluateNlaPoseAtTime(timeline: NlaTimeline, timeSec: number, basePose?: JointAngles): JointAngles {
  const out: JointAngles = {};
  const startPose = basePose ?? {};
  for (const joint of SKILL_KEYS_IN_JOINT_MAP_ORDER) {
    const base = startPose[joint];
    if (typeof base === "number") out[joint] = base;
  }
  for (const track of timeline.tracks) {
    const trackPose = evaluateTrackAtTime(track, timeSec);
    for (const joint of track.joints) {
      const incoming = trackPose[joint];
      if (typeof incoming !== "number") continue;
      const current = typeof out[joint] === "number" ? out[joint]! : 0;
      const w = clamp01(track.weight);
      out[joint] = current * (1 - w) + incoming * w;
    }
  }
  return out;
}

function smoothPoseNeighbors(prev: JointAngles, cur: JointAngles, next: JointAngles, alpha: number): JointAngles {
  const out: JointAngles = {};
  const a = clamp01(alpha);
  for (const joint of SKILL_KEYS_IN_JOINT_MAP_ORDER) {
    const p = typeof prev[joint] === "number" ? prev[joint]! : 0;
    const c = typeof cur[joint] === "number" ? cur[joint]! : 0;
    const n = typeof next[joint] === "number" ? next[joint]! : 0;
    const mean = (p + c + n) / 3;
    out[joint] = c + (mean - c) * a;
  }
  return out;
}

export function smoothNoisySegment(samples: JointAngles[], alpha = 0.35): JointAngles[] {
  if (samples.length < 3) return samples.slice();
  const out = samples.slice();
  for (let i = 1; i < samples.length - 1; i++) {
    out[i] = smoothPoseNeighbors(samples[i - 1]!, samples[i]!, samples[i + 1]!, alpha);
  }
  return out;
}

export function sampleNlaTimeline(
  timeline: NlaTimeline,
  options?: {
    sampleRateHz?: number;
    startSec?: number;
    endSec?: number;
    basePose?: JointAngles;
    smoothAlpha?: number;
  }
): { poses: JointAngles[]; timestampsSec: number[] } {
  const sampleRateHz = options?.sampleRateHz && options.sampleRateHz > 1 ? options.sampleRateHz : timeline.fps;
  const startSec = Math.max(0, options?.startSec ?? 0);
  const derivedEnd = timeline.tracks
    .flatMap((track) => track.clips.map((clip) => clip.startSec + clip.durationSec))
    .reduce((max, v) => (v > max ? v : max), 0);
  const endSec = options?.endSec && options.endSec > startSec ? options.endSec : derivedEnd;
  const dt = 1 / sampleRateHz;
  const poses: JointAngles[] = [];
  const timestampsSec: number[] = [];
  for (let t = startSec; t <= endSec + 1e-6; t += dt) {
    timestampsSec.push(t);
    poses.push(evaluateNlaPoseAtTime(timeline, t, options?.basePose));
  }
  const smoothAlpha = options?.smoothAlpha;
  if (typeof smoothAlpha === "number" && smoothAlpha > 0) {
    return {
      poses: smoothNoisySegment(poses, smoothAlpha),
      timestampsSec,
    };
  }
  return { poses, timestampsSec };
}

