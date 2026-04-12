/**
 * Pre-built dance sequences for the G1 robot.
 *
 * Each dance is a sequence of JointAngles keyframes (in radians)
 * with timing information. Played via cosine-eased interpolation.
 *
 * Joint order matches SKILL_KEYS_IN_JOINT_MAP_ORDER (29 joints).
 */
import type { JointAngles } from "./telemetryTypes";

export interface DanceKeyframe {
  /** Duration to reach this pose from previous (seconds) */
  duration: number;
  /** Joint angles in radians */
  pose: JointAngles;
  /** Optional label for this keyframe */
  label?: string;
}

export interface DanceSequence {
  name: string;
  /** How many times to repeat the sequence (0 = infinite until stopped) */
  loops: number;
  keyframes: DanceKeyframe[];
}

// ── Helper: create a full 29-joint pose from partial overrides ─────────────
function pose(overrides: Record<string, number>): JointAngles {
  const base: JointAngles = {
    left_hip_pitch: 0, left_hip_roll: 0, left_hip_yaw: 0,
    left_knee: 0, left_ankle_pitch: 0, left_ankle_roll: 0,
    right_hip_pitch: 0, right_hip_roll: 0, right_hip_yaw: 0,
    right_knee: 0, right_ankle_pitch: 0, right_ankle_roll: 0,
    waist_yaw: 0, waist_roll: 0, waist_pitch: 0,
    left_shoulder_pitch: 0, left_shoulder_roll: 0, left_shoulder_yaw: 0,
    left_elbow: 0, left_wrist_roll: 0, left_wrist_pitch: 0, left_wrist_yaw: 0,
    right_shoulder_pitch: 0, right_shoulder_roll: 0, right_shoulder_yaw: 0,
    right_elbow: 0, right_wrist_roll: 0, right_wrist_pitch: 0, right_wrist_yaw: 0,
  };
  return { ...base, ...overrides };
}

// Degrees to radians helper
const d = (deg: number) => (deg * Math.PI) / 180;

// ═══════════════════════════════════════════════════════════════════════════════
// LEZGINKA DANCE
// Empirically verified in native MuJoCo with full gravity (test_dance_pitch_only.py).
// 3 full loops, 42 transitions, 0 falls.
//
// ONE-LEG STABILITY RECIPE (from exhaustive sweep test_oneleg_sweep.py):
//   LIFT RIGHT: standing_hip_roll(L)=-14°, waist_roll=-3°, hip_pitch=-10°, knee=30°
//   LIFT LEFT:  standing_hip_roll(R)=+14°, waist_roll=+3°, hip_pitch=-10°, knee=30°
//
// Key design rules:
//   1. hip_roll=-14°/+14° on standing leg shifts CoM over the foot
//   2. Leg lifts limited to hip_pitch=-10°, knee=30° (proven stable)
//   3. Direct two-leg→one-leg transitions (cosine easing handles gradual shift)
//   4. Both-feet recovery after each lift to reset balance
//   5. Dramatic ARM movements carry the Lezginka visual identity
//   6. NO roll PD controller — it creates positive feedback with hip_roll
// ═══════════════════════════════════════════════════════════════════════════════

export const LEZGINKA: DanceSequence = {
  name: "Lezginka",
  loops: 3,
  keyframes: [
    // ── 1. Opening: proud stance, arms wide ──
    {
      duration: 1.0,
      label: "Proud stance",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        left_shoulder_pitch: d(-30), left_shoulder_roll: d(60),
        right_shoulder_pitch: d(-30), right_shoulder_roll: d(-60),
        left_elbow: d(30), right_elbow: d(30),
        left_wrist_pitch: d(-20), right_wrist_pitch: d(-20),
      }),
    },

    // ── 2. Right knee up (standing on left, hip_roll=-14°) ──
    {
      duration: 0.8,
      label: "Right knee up",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_roll: d(-3), waist_yaw: d(15),
        left_shoulder_pitch: d(-50), left_shoulder_roll: d(70),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-40),
        left_elbow: d(40), right_elbow: d(20),
        left_wrist_pitch: d(-25), right_wrist_pitch: d(-15),
      }),
    },

    // ── 3. Right stamp (both feet) ──
    {
      duration: 0.5,
      label: "Right stamp",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_yaw: d(8),
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ── 4. Left knee up (standing on right, hip_roll=+14°) ──
    {
      duration: 0.8,
      label: "Left knee up",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_roll: d(3), waist_yaw: d(-15),
        right_shoulder_pitch: d(-50), right_shoulder_roll: d(-70),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(40),
        right_elbow: d(40), left_elbow: d(20),
        right_wrist_pitch: d(-25), left_wrist_pitch: d(-15),
      }),
    },

    // ── 5. Left stamp (both feet) ──
    {
      duration: 0.5,
      label: "Left stamp",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_yaw: d(-8),
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ── 6. Arms rise (both feet, chest proud) ──
    {
      duration: 0.5,
      label: "Arms rise",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_pitch: d(-4),
        left_shoulder_pitch: d(-80), left_shoulder_roll: d(40),
        right_shoulder_pitch: d(-80), right_shoulder_roll: d(-40),
        left_elbow: d(50), right_elbow: d(50),
        left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
      }),
    },

    // ── 7. Right lift + turn (standing on left) ──
    {
      duration: 0.8,
      label: "Right lift turn",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_yaw: d(20), waist_roll: d(-3),
        left_shoulder_pitch: d(-60), left_shoulder_roll: d(70),
        right_shoulder_pitch: d(-30), right_shoulder_roll: d(-35),
        left_elbow: d(45), right_elbow: d(25),
      }),
    },

    // ── 8. Recovery (both feet) ──
    {
      duration: 0.5,
      label: "Recovery",
      pose: pose({
        left_knee: d(14), right_knee: d(14),
        left_shoulder_pitch: d(10), left_shoulder_roll: d(65),
        right_shoulder_pitch: d(10), right_shoulder_roll: d(-65),
        left_elbow: d(15), right_elbow: d(15),
      }),
    },

    // ── 9. Left lift + turn (standing on right) ──
    {
      duration: 0.8,
      label: "Left lift turn",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_yaw: d(-20), waist_roll: d(3),
        right_shoulder_pitch: d(-60), right_shoulder_roll: d(-70),
        left_shoulder_pitch: d(-30), left_shoulder_roll: d(35),
        right_elbow: d(45), left_elbow: d(25),
      }),
    },

    // ── 10. Center snap (both feet) ──
    {
      duration: 0.4,
      label: "Center snap",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        left_shoulder_pitch: d(-40), left_shoulder_roll: d(60),
        right_shoulder_pitch: d(-40), right_shoulder_roll: d(-60),
        left_elbow: d(35), right_elbow: d(35),
        left_wrist_pitch: d(-20), right_wrist_pitch: d(-20),
      }),
    },

    // ── 11. Sway right (both feet) ──
    {
      duration: 0.5,
      label: "Sway right",
      pose: pose({
        left_knee: d(10), right_knee: d(16),
        waist_roll: d(4), waist_yaw: d(12),
        left_shoulder_pitch: d(-65), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-55),
        left_elbow: d(45), right_elbow: d(30),
      }),
    },

    // ── 12. Sway left (both feet) ──
    {
      duration: 0.5,
      label: "Sway left",
      pose: pose({
        left_knee: d(16), right_knee: d(10),
        waist_roll: d(-4), waist_yaw: d(-12),
        right_shoulder_pitch: d(-65), right_shoulder_roll: d(-50),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(55),
        right_elbow: d(45), left_elbow: d(30),
      }),
    },

    // ── 13. Finale: arms up proud ──
    {
      duration: 0.6,
      label: "Finale",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_pitch: d(-3),
        left_shoulder_pitch: d(-85), left_shoulder_roll: d(30),
        right_shoulder_pitch: d(-85), right_shoulder_roll: d(-30),
        left_elbow: d(55), right_elbow: d(55),
        left_wrist_pitch: d(-25), right_wrist_pitch: d(-25),
      }),
    },

    // ── 14. Return to neutral ──
    {
      duration: 0.8,
      label: "Return",
      pose: pose({
        left_knee: d(5), right_knee: d(5),
      }),
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE WAVE (test dance)
// ═══════════════════════════════════════════════════════════════════════════════

export const SIMPLE_WAVE: DanceSequence = {
  name: "Simple Wave",
  loops: 2,
  keyframes: [
    {
      duration: 1.0,
      label: "Right arm up",
      pose: pose({
        left_knee: d(5), right_knee: d(5),
        right_shoulder_pitch: d(-90),
        right_elbow: d(30),
      }),
    },
    {
      duration: 0.5,
      label: "Right arm wave 1",
      pose: pose({
        left_knee: d(5), right_knee: d(5),
        right_shoulder_pitch: d(-90),
        right_shoulder_roll: d(-30),
        right_elbow: d(60),
      }),
    },
    {
      duration: 0.5,
      label: "Right arm wave 2",
      pose: pose({
        left_knee: d(5), right_knee: d(5),
        right_shoulder_pitch: d(-90),
        right_shoulder_roll: d(10),
        right_elbow: d(20),
      }),
    },
    {
      duration: 0.5,
      label: "Right arm wave 3",
      pose: pose({
        left_knee: d(5), right_knee: d(5),
        right_shoulder_pitch: d(-90),
        right_shoulder_roll: d(-30),
        right_elbow: d(60),
      }),
    },
    {
      duration: 1.0,
      label: "Return",
      pose: pose({}),
    },
  ],
};

// All available dances
export const DANCE_LIBRARY: DanceSequence[] = [LEZGINKA, SIMPLE_WAVE];
