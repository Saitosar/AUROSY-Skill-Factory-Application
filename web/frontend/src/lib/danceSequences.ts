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
// LEZGINKA DANCE — LEG-ACTIVE VERSION
// 24 keyframes per loop, 3 loops = 72 transitions.
// Verified at 30/60/90/120/144 fps — all passed, max roll 6.8° (5 loops).
//
// CORE RHYTHM: lift knee → back toe tap → stamp → switch legs
// Eagle arms (spread wide, wrists bent down) throughout.
//
// STABILITY RECIPES:
//   FORWARD LIFT: standing_hip_roll=±14°, waist_roll=±3°, hip_pitch=-10°, knee=30°
//   BACK TOE TAP: grounded, hip_pitch=+15°, knee=10°, weight on front leg
//   Settle blocks ≥1.2s between leg sides (filled with arm drama)
//
// Key design rules:
//   1. hip_roll=-14°/+14° on standing leg shifts CoM over the foot
//   2. Leg lifts limited to hip_pitch=-10°, knee=30° (proven stable)
//   3. Back toe taps: both feet on ground, hp=15° max
//   4. ≥1.2s settle between R and L sides (stamp + arms cross + eagle)
//   5. Eagle arms throughout for Lezginka visual identity
//   6. Roll PD through waist_roll (kp=0.3, max=0.03 rad) prevents drift
// ═══════════════════════════════════════════════════════════════════════════════

// ── Arm templates shared across keyframes ──
const EAGLE_ARMS = {
  left_shoulder_pitch: d(-70), left_shoulder_roll: d(55),
  right_shoulder_pitch: d(-70), right_shoulder_roll: d(-55),
  left_elbow: d(30), right_elbow: d(30),
  left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
  left_wrist_yaw: d(20), right_wrist_yaw: d(-20),
};
const EAGLE_R_ARMS = {
  left_shoulder_pitch: d(-80), left_shoulder_roll: d(65),
  left_shoulder_yaw: d(10),
  right_shoulder_pitch: d(-40), right_shoulder_roll: d(-45),
  left_elbow: d(25), right_elbow: d(35),
  left_wrist_pitch: d(-30), left_wrist_yaw: d(25),
  right_wrist_pitch: d(-25), right_wrist_yaw: d(-15),
};
const EAGLE_L_ARMS = {
  right_shoulder_pitch: d(-80), right_shoulder_roll: d(-65),
  right_shoulder_yaw: d(-10),
  left_shoulder_pitch: d(-40), left_shoulder_roll: d(45),
  right_elbow: d(25), left_elbow: d(35),
  right_wrist_pitch: d(-30), right_wrist_yaw: d(-25),
  left_wrist_pitch: d(-25), left_wrist_yaw: d(15),
};
const CROSS_ARMS = {
  left_shoulder_pitch: d(-25), left_shoulder_roll: d(15),
  right_shoulder_pitch: d(-25), right_shoulder_roll: d(-15),
  left_elbow: d(70), right_elbow: d(70),
  left_wrist_pitch: d(-20), right_wrist_pitch: d(-20),
};
const HIGH_ARMS = {
  left_shoulder_pitch: d(-95), left_shoulder_roll: d(40),
  right_shoulder_pitch: d(-95), right_shoulder_roll: d(-40),
  left_elbow: d(20), right_elbow: d(20),
  left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
  left_wrist_yaw: d(25), right_wrist_yaw: d(-25),
};

export const LEZGINKA: DanceSequence = {
  name: "Лезгинка",
  loops: 3,
  keyframes: [
    // ══════════ §1 OPENING ══════════
    // ── 1. Eagle stance — arms spread wide, wrists bent ──
    {
      duration: 0.8,
      label: "Eagle stance",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_pitch: d(-4),
        ...EAGLE_ARMS,
      }),
    },

    // ══════════ §2 RIGHT LEG: lift forward → back toe tap ══════════
    // ── 2. Right knee lift (one-leg balance!) ──
    {
      duration: 0.8,
      label: "R knee lift",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_roll: d(-3),
        ...EAGLE_R_ARMS,
      }),
    },
    // ── 3. Right leg goes back — grounded toe tap ──
    {
      duration: 0.7,
      label: "R back tap",
      pose: pose({
        left_knee: d(15),
        right_hip_pitch: d(15), right_knee: d(10),
        waist_roll: d(-3),
        ...EAGLE_R_ARMS,
      }),
    },
    // ── 4-6. Settle block: stamp + arms cross + eagle spread (1.2s) ──
    {
      duration: 0.4,
      label: "Stamp R",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_yaw: d(8),
        ...EAGLE_ARMS,
      }),
    },
    {
      duration: 0.4,
      label: "Arms cross",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...CROSS_ARMS,
      }),
    },
    {
      duration: 0.4,
      label: "Eagle spread",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...EAGLE_ARMS,
      }),
    },

    // ══════════ §3 LEFT LEG: lift forward → back toe tap ══════════
    // ── 7. Left knee lift (one-leg balance!) ──
    {
      duration: 0.8,
      label: "L knee lift",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_roll: d(3),
        ...EAGLE_L_ARMS,
      }),
    },
    // ── 8. Left leg goes back — grounded toe tap ──
    {
      duration: 0.7,
      label: "L back tap",
      pose: pose({
        right_knee: d(15),
        left_hip_pitch: d(15), left_knee: d(10),
        waist_roll: d(3),
        ...EAGLE_L_ARMS,
      }),
    },
    // ── 9-11. Settle block: stamp + arms cross + eagle reset (1.3s) ──
    {
      duration: 0.4,
      label: "Stamp L",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_yaw: d(-8),
        ...EAGLE_ARMS,
      }),
    },
    {
      duration: 0.4,
      label: "Arms cross L",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...CROSS_ARMS,
      }),
    },
    {
      duration: 0.5,
      label: "Eagle reset",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...EAGLE_ARMS,
      }),
    },

    // ══════════ §4 SECOND PASS — R lift turn → R back tap ══════════
    // ── 12. Right lift with slight turn ──
    {
      duration: 0.8,
      label: "R lift turn",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_roll: d(-3), waist_yaw: d(10),
        ...EAGLE_R_ARMS,
      }),
    },
    // ── 13. Right back tap ──
    {
      duration: 0.7,
      label: "R back tap 2",
      pose: pose({
        left_knee: d(15),
        right_hip_pitch: d(15), right_knee: d(10),
        waist_roll: d(-3),
        ...EAGLE_R_ARMS,
      }),
    },
    // ── 14-16. Settle block: stamp + cross + eagle (1.4s) ──
    {
      duration: 0.4,
      label: "Stamp R2",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_yaw: d(8),
        ...EAGLE_ARMS,
      }),
    },
    {
      duration: 0.4,
      label: "Arms cross 2",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...CROSS_ARMS,
      }),
    },
    {
      duration: 0.6,
      label: "Eagle hold",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_pitch: d(-3),
        ...EAGLE_ARMS,
      }),
    },

    // ══════════ §5 SECOND PASS — L lift turn → L back tap ══════════
    // ── 17. Left lift with slight turn ──
    {
      duration: 0.8,
      label: "L lift turn",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_roll: d(3), waist_yaw: d(-10),
        ...EAGLE_L_ARMS,
      }),
    },
    // ── 18. Left back tap ──
    {
      duration: 0.7,
      label: "L back tap 2",
      pose: pose({
        right_knee: d(15),
        left_hip_pitch: d(15), left_knee: d(10),
        waist_roll: d(3),
        ...EAGLE_L_ARMS,
      }),
    },
    // ── 19-21. Settle block: stamp + cross + eagle (1.4s) ──
    {
      duration: 0.4,
      label: "Stamp L2",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_yaw: d(-8),
        ...EAGLE_ARMS,
      }),
    },
    {
      duration: 0.4,
      label: "Arms cross L2",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...CROSS_ARMS,
      }),
    },
    {
      duration: 0.6,
      label: "Eagle hold 2",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_pitch: d(-3),
        ...EAGLE_ARMS,
      }),
    },

    // ══════════ §6 GRAND FINALE ══════════
    // ── 22. Arms cross (dramatic close) ──
    {
      duration: 0.4,
      label: "Arms cross finale",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        ...CROSS_ARMS,
      }),
    },
    // ── 23. Grand burst — arms highest, chest proud ──
    {
      duration: 0.5,
      label: "Grand burst",
      pose: pose({
        left_knee: d(8), right_knee: d(8),
        waist_pitch: d(-5),
        ...HIGH_ARMS,
      }),
    },
    // ── 24. Return ──
    {
      duration: 1.0,
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
