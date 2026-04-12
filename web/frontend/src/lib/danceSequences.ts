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
// Based on Caucasian folk dance movements adapted for G1 robot (29 DoF).
// Key elements: chest up, arms wide, alternating knee lifts, waist rotations.
// ═══════════════════════════════════════════════════════════════════════════════

export const LEZGINKA: DanceSequence = {
  name: "Lezginka",
  loops: 3,
  keyframes: [
    // ── Start: proud standing pose, arms wide ──
    {
      duration: 1.0,
      label: "Start — proud stance",
      pose: pose({
        // Slight knee bend for stability
        left_knee: d(10), right_knee: d(10),
        // Arms out to sides (shoulder roll) and slightly up
        left_shoulder_pitch: d(-30), left_shoulder_roll: d(60),
        right_shoulder_pitch: d(-30), right_shoulder_roll: d(-60),
        // Elbows slightly bent
        left_elbow: d(30), right_elbow: d(30),
        // Wrists up (like holding a tray)
        left_wrist_pitch: d(-20), right_wrist_pitch: d(-20),
      }),
    },

    // ── Beat 1: Right knee lift + waist turn left ──
    {
      duration: 0.4,
      label: "Right knee lift",
      pose: pose({
        // Standing leg — slight bend for balance
        left_knee: d(15), left_hip_pitch: d(-5),
        // Lifted leg
        right_hip_pitch: d(-40), right_knee: d(60),
        right_ankle_pitch: d(-15),
        // Waist turn
        waist_yaw: d(20),
        // Arms
        left_shoulder_pitch: d(-50), left_shoulder_roll: d(70),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-40),
        left_elbow: d(40), right_elbow: d(20),
        left_wrist_pitch: d(-25), right_wrist_pitch: d(-15),
      }),
    },

    // ── Beat 2: Right foot stamp (back down, sharp) ──
    {
      duration: 0.25,
      label: "Right stamp",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_yaw: d(10),
        // Arms snap in
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ── Beat 3: Left knee lift + waist turn right ──
    {
      duration: 0.4,
      label: "Left knee lift",
      pose: pose({
        // Standing leg
        right_knee: d(15), right_hip_pitch: d(-5),
        // Lifted leg
        left_hip_pitch: d(-40), left_knee: d(60),
        left_ankle_pitch: d(-15),
        // Waist turn
        waist_yaw: d(-20),
        // Arms mirror
        right_shoulder_pitch: d(-50), right_shoulder_roll: d(-70),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(40),
        right_elbow: d(40), left_elbow: d(20),
        right_wrist_pitch: d(-25), left_wrist_pitch: d(-15),
      }),
    },

    // ── Beat 4: Left foot stamp ──
    {
      duration: 0.25,
      label: "Left stamp",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_yaw: d(-10),
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ── Beat 5: Arms up, chest proud ──
    {
      duration: 0.5,
      label: "Arms rise",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_pitch: d(-5), // chest out
        // Arms high
        left_shoulder_pitch: d(-80), left_shoulder_roll: d(40),
        right_shoulder_pitch: d(-80), right_shoulder_roll: d(-40),
        left_elbow: d(50), right_elbow: d(50),
        left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
      }),
    },

    // ── Beat 6: Quick right knee + waist spin ──
    {
      duration: 0.35,
      label: "Quick right lift + spin",
      pose: pose({
        left_knee: d(15),
        right_hip_pitch: d(-35), right_knee: d(50),
        waist_yaw: d(35),
        waist_roll: d(5),
        left_shoulder_pitch: d(-60), left_shoulder_roll: d(80),
        right_shoulder_pitch: d(-30), right_shoulder_roll: d(-30),
        left_elbow: d(45), right_elbow: d(25),
      }),
    },

    // ── Beat 7: Both feet down, arms sweep ──
    {
      duration: 0.3,
      label: "Recovery + arm sweep",
      pose: pose({
        left_knee: d(15), right_knee: d(15),
        waist_yaw: d(0),
        // Arms sweep down and out
        left_shoulder_pitch: d(10), left_shoulder_roll: d(70),
        right_shoulder_pitch: d(10), right_shoulder_roll: d(-70),
        left_elbow: d(15), right_elbow: d(15),
      }),
    },

    // ── Beat 8: Quick left knee + waist spin ──
    {
      duration: 0.35,
      label: "Quick left lift + spin",
      pose: pose({
        right_knee: d(15),
        left_hip_pitch: d(-35), left_knee: d(50),
        waist_yaw: d(-35),
        waist_roll: d(-5),
        right_shoulder_pitch: d(-60), right_shoulder_roll: d(-80),
        left_shoulder_pitch: d(-30), left_shoulder_roll: d(30),
        right_elbow: d(45), left_elbow: d(25),
      }),
    },

    // ── Beat 9: Sharp return to center ──
    {
      duration: 0.3,
      label: "Center snap",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        // Arms wide and proud
        left_shoulder_pitch: d(-40), left_shoulder_roll: d(65),
        right_shoulder_pitch: d(-40), right_shoulder_roll: d(-65),
        left_elbow: d(35), right_elbow: d(35),
        left_wrist_pitch: d(-20), right_wrist_pitch: d(-20),
      }),
    },

    // ── Beat 10: Deep right step with torso lean ──
    {
      duration: 0.5,
      label: "Deep right step",
      pose: pose({
        left_knee: d(8),
        right_hip_pitch: d(-15), right_knee: d(35),
        right_hip_roll: d(-10),
        waist_roll: d(10),
        waist_yaw: d(15),
        left_shoulder_pitch: d(-70), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-60),
        left_elbow: d(50), right_elbow: d(30),
      }),
    },

    // ── Beat 11: Deep left step with torso lean ──
    {
      duration: 0.5,
      label: "Deep left step",
      pose: pose({
        right_knee: d(8),
        left_hip_pitch: d(-15), left_knee: d(35),
        left_hip_roll: d(10),
        waist_roll: d(-10),
        waist_yaw: d(-15),
        right_shoulder_pitch: d(-70), right_shoulder_roll: d(-50),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(60),
        right_elbow: d(50), left_elbow: d(30),
      }),
    },

    // ── Finale: proud stance, arms up ──
    {
      duration: 0.6,
      label: "Finale — arms up",
      pose: pose({
        left_knee: d(8), right_knee: d(8),
        waist_pitch: d(-3),
        left_shoulder_pitch: d(-90), left_shoulder_roll: d(30),
        right_shoulder_pitch: d(-90), right_shoulder_roll: d(-30),
        left_elbow: d(60), right_elbow: d(60),
        left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
      }),
    },

    // ── Return to neutral ──
    {
      duration: 0.8,
      label: "Return to neutral",
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
