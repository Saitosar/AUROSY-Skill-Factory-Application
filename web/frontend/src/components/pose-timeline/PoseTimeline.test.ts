import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PoseTimeline } from "./PoseTimeline";
import type { NlaTimeline } from "../../lib/nlaTimeline";

const TIMELINE: NlaTimeline = {
  version: 1,
  fps: 30,
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
          name: "Hands",
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
              ],
            },
          ],
        },
      ],
    },
    { id: "legs", label: "Legs", joints: ["left_hip_pitch"], enabled: true, weight: 1, clips: [] },
    { id: "torso", label: "Torso", joints: ["waist_pitch"], enabled: true, weight: 1, clips: [] },
  ],
};

describe("PoseTimeline smoke", () => {
  it("renders controls and active track", () => {
    const html = renderToString(
      createElement(PoseTimeline, {
        timeline: TIMELINE,
        currentTimeSec: 0.3,
        maxTimeSec: 1.2,
        selectedTrackId: "hands",
        selectedJoint: "left_shoulder_pitch",
        onCurrentTimeChange: vi.fn(),
        onSelectTrack: vi.fn(),
        onSelectJoint: vi.fn(),
        onAddKeyframe: vi.fn(),
        onDeleteKeyframe: vi.fn(),
        onMoveKeyframe: vi.fn(),
        onUpdateBezierHandle: vi.fn(),
        onSetTrackWeight: vi.fn(),
        onToggleTrack: vi.fn(),
        onSmoothJoint: vi.fn(),
      })
    );
    expect(html).toContain("NLA timeline");
    expect(html).toContain("Hands");
    expect(html).toContain("Add key");
  });
});

