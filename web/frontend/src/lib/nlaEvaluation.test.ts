import { describe, expect, it } from "vitest";
import { evaluateCurveAtTime, evaluateNlaPoseAtTime, sampleNlaTimeline, smoothNoisySegment } from "./nlaEvaluation";
import type { NlaTimeline } from "./nlaTimeline";

function buildTimeline(): NlaTimeline {
  return {
    version: 1,
    fps: 20,
    tracks: [
      {
        id: "hands",
        label: "Hands",
        joints: ["left_shoulder_pitch"],
        enabled: true,
        weight: 1,
        clips: [
          {
            id: "clip-hands",
            name: "Hands clip",
            startSec: 0,
            durationSec: 1,
            curves: [
              {
                joint: "left_shoulder_pitch",
                keyframes: [
                  {
                    id: "k0",
                    timeSec: 0,
                    valueRad: 0,
                    inHandle: { dt: -0.1, dv: 0 },
                    outHandle: { dt: 0.2, dv: 0 },
                  },
                  {
                    id: "k1",
                    timeSec: 1,
                    valueRad: 1,
                    inHandle: { dt: -0.2, dv: 0 },
                    outHandle: { dt: 0.1, dv: 0 },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "legs",
        label: "Legs",
        joints: ["left_hip_pitch"],
        enabled: true,
        weight: 0.5,
        clips: [
          {
            id: "clip-legs",
            name: "Legs clip",
            startSec: 0,
            durationSec: 1,
            curves: [
              {
                joint: "left_hip_pitch",
                keyframes: [
                  {
                    id: "l0",
                    timeSec: 0,
                    valueRad: 0.2,
                    inHandle: { dt: -0.1, dv: 0 },
                    outHandle: { dt: 0.1, dv: 0 },
                  },
                  {
                    id: "l1",
                    timeSec: 1,
                    valueRad: 0.4,
                    inHandle: { dt: -0.1, dv: 0 },
                    outHandle: { dt: 0.1, dv: 0 },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "torso",
        label: "Torso",
        joints: ["waist_pitch"],
        enabled: false,
        weight: 1,
        clips: [],
      },
    ],
  };
}

describe("nlaEvaluation", () => {
  it("evaluates bezier curve at mid-time", () => {
    const curve = buildTimeline().tracks[0]!.clips[0]!.curves[0]!;
    const value = evaluateCurveAtTime(curve, 0.5);
    expect(value).toBeGreaterThan(0.35);
    expect(value).toBeLessThan(0.65);
  });

  it("mixes enabled tracks into output pose", () => {
    const timeline = buildTimeline();
    const pose = evaluateNlaPoseAtTime(timeline, 0.5);
    expect(pose.left_shoulder_pitch).toBeTypeOf("number");
    expect(pose.left_hip_pitch).toBeTypeOf("number");
    expect(pose.waist_pitch).toBeUndefined();
  });

  it("samples timeline to timestamped poses", () => {
    const sampled = sampleNlaTimeline(buildTimeline(), { sampleRateHz: 10 });
    expect(sampled.poses.length).toBeGreaterThan(5);
    expect(sampled.timestampsSec[0]).toBe(0);
  });

  it("smooths noisy sequence", () => {
    const smoothed = smoothNoisySegment(
      [
        { left_shoulder_pitch: 0 },
        { left_shoulder_pitch: 5 },
        { left_shoulder_pitch: 0 },
      ],
      0.5
    );
    expect(smoothed[1]!.left_shoulder_pitch).toBeLessThan(5);
  });
});

