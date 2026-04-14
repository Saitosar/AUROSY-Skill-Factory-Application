import { describe, expect, it } from "vitest";
import {
  buildKeyframesDocumentFromNlaTimeline,
  buildSdkPoseJsonArrayFromNlaTimeline,
} from "./poseAuthoringBridge";
import type { NlaTimeline } from "./nlaTimeline";

const TIMELINE: NlaTimeline = {
  version: 1,
  fps: 5,
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
                  outHandle: { dt: 0.1, dv: 0 },
                },
                {
                  id: "k1",
                  timeSec: 1,
                  valueRad: 1,
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
      id: "legs",
      label: "Legs",
      joints: ["left_hip_pitch"],
      enabled: true,
      weight: 1,
      clips: [],
    },
    {
      id: "torso",
      label: "Torso",
      joints: ["waist_pitch"],
      enabled: true,
      weight: 1,
      clips: [],
    },
  ],
};

describe("poseAuthoringBridge NLA exports", () => {
  it("builds phase0 keyframes document from NLA timeline", () => {
    const doc = buildKeyframesDocumentFromNlaTimeline(TIMELINE, {
      sampleRateHz: 5,
      timestampStepS: 0.2,
    });
    const keyframes = (doc.keyframes as Array<Record<string, unknown>>) ?? [];
    expect(doc.schema_version).toBe("1.0.0");
    expect(keyframes.length).toBeGreaterThan(3);
    expect(keyframes[0]?.joints_deg).toBeTypeOf("object");
  });

  it("builds sdk pose json array from NLA timeline", () => {
    const sdk = buildSdkPoseJsonArrayFromNlaTimeline(TIMELINE, 5);
    expect(Array.isArray(sdk)).toBe(true);
    expect(sdk.length).toBeGreaterThan(3);
    expect(sdk[0]).toHaveProperty("0");
  });
});

