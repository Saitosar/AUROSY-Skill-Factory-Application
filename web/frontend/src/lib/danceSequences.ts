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
// 24 keyframes per loop, 3 loops = 72 transitions.
// Verified at 30/60/90/120/144 fps — all passed, max roll 5.0°.
//
// STABILITY RECIPES:
//   FORWARD LIFT: standing_hip_roll=±14°, waist_roll=±3°, hip_pitch=-10°, knee=30°
//   BACK TOE TAP: grounded, hip_pitch=+15°, knee=10°, weight on front leg
//     (R→L needs 0.8s settle between sides to dissipate angular momentum)
//
// Key design rules:
//   1. hip_roll=-14°/+14° on standing leg shifts CoM over the foot
//   2. Leg lifts limited to hip_pitch=-10°, knee=30° (proven stable)
//   3. Back toe taps: both feet on ground, hp=15° max (>18° creates R→L instability)
//   4. 1.0s neutral reset after back taps before knee lifts
//   5. Dramatic ARM movements carry the Lezginka visual identity
//   6. NO roll PD controller — it creates positive feedback with hip_roll
// ═══════════════════════════════════════════════════════════════════════════════

export const LEZGINKA: DanceSequence = {
  name: "Лезгинка",
  loops: 3,
  keyframes: [
    // ══════════ SECTION 1: DRAMATIC OPENING ══════════
    // ── 1. Eagle stance ──
    {
      duration: 1.0,
      label: "Eagle stance",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_pitch: d(-4),
        left_shoulder_pitch: d(-75), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-75), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
        left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
        left_wrist_yaw: d(20), right_wrist_yaw: d(-20),
      }),
    },

    // ══════════ SECTION 2: TOE TAP + STAMP ══════════
    // ── 2. Right toe tap ──
    {
      duration: 0.8,
      label: "Right toe tap",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_roll: d(-3), waist_yaw: d(12),
        left_shoulder_pitch: d(-55), left_shoulder_roll: d(70),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-40),
        left_elbow: d(40), right_elbow: d(20),
        left_wrist_pitch: d(-25), left_wrist_yaw: d(15),
      }),
    },

    // ── 3. Stamp R ──
    {
      duration: 0.5,
      label: "Stamp right",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_yaw: d(8),
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ── 4. Left toe tap ──
    {
      duration: 0.8,
      label: "Left toe tap",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_roll: d(3), waist_yaw: d(-12),
        right_shoulder_pitch: d(-55), right_shoulder_roll: d(-70),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(40),
        right_elbow: d(40), left_elbow: d(20),
        right_wrist_pitch: d(-25), right_wrist_yaw: d(-15),
      }),
    },

    // ── 5. Stamp L ──
    {
      duration: 0.5,
      label: "Stamp left",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_yaw: d(-8),
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ══════════ SECTION 3: ARM DRAMA (both feet, safe) ══════════
    // ── 6. Arms rise high ──
    {
      duration: 0.5,
      label: "Arms rise",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_pitch: d(-4),
        left_shoulder_pitch: d(-90), left_shoulder_roll: d(40),
        right_shoulder_pitch: d(-90), right_shoulder_roll: d(-40),
        left_elbow: d(25), right_elbow: d(25),
        left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
        left_wrist_roll: d(20), right_wrist_roll: d(-20),
      }),
    },

    // ── 7. Arms cross ──
    {
      duration: 0.4,
      label: "Arms cross",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        left_shoulder_pitch: d(-25), left_shoulder_roll: d(15),
        right_shoulder_pitch: d(-25), right_shoulder_roll: d(-15),
        left_elbow: d(70), right_elbow: d(70),
        left_wrist_pitch: d(-20), right_wrist_pitch: d(-20),
      }),
    },

    // ── 8. Arms burst open ──
    {
      duration: 0.4,
      label: "Arms burst",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        waist_pitch: d(-3),
        left_shoulder_pitch: d(-80), left_shoulder_roll: d(60),
        right_shoulder_pitch: d(-80), right_shoulder_roll: d(-60),
        left_elbow: d(15), right_elbow: d(15),
        left_wrist_pitch: d(-25), right_wrist_pitch: d(-25),
        left_wrist_yaw: d(25), right_wrist_yaw: d(-25),
      }),
    },

    // ══════════ SECTION 4: BACK TOE TAPS (grounded) ══════════
    // ── 9. Right leg slides back, weight on left ──
    {
      duration: 0.7,
      label: "Back tap right",
      pose: pose({
        left_knee: d(15),
        right_hip_pitch: d(15), right_knee: d(10),
        waist_roll: d(-3),
        left_shoulder_pitch: d(-65), left_shoulder_roll: d(75),
        left_shoulder_yaw: d(10),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-35),
        left_elbow: d(50), right_elbow: d(15),
        left_wrist_pitch: d(-30), left_wrist_yaw: d(20),
      }),
    },

    // ── 10. Settle center ──
    {
      duration: 0.8,
      label: "Settle center",
      pose: pose({
        left_knee: d(12), right_knee: d(12),
        left_shoulder_pitch: d(-35), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-35), right_shoulder_roll: d(-50),
        left_elbow: d(35), right_elbow: d(35),
      }),
    },

    // ── 11. Left leg slides back, weight on right ──
    {
      duration: 0.7,
      label: "Back tap left",
      pose: pose({
        right_knee: d(15),
        left_hip_pitch: d(15), left_knee: d(10),
        waist_roll: d(3),
        right_shoulder_pitch: d(-65), right_shoulder_roll: d(-75),
        right_shoulder_yaw: d(-10),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(35),
        right_elbow: d(50), left_elbow: d(15),
        right_wrist_pitch: d(-30), right_wrist_yaw: d(-20),
      }),
    },

    // ── 12. Neutral reset (1.0s to fully dissipate back-tap dynamics) ──
    {
      duration: 1.0,
      label: "Neutral reset",
      pose: pose({
        left_knee: d(14), right_knee: d(14),
        left_shoulder_pitch: d(10), left_shoulder_roll: d(65),
        right_shoulder_pitch: d(10), right_shoulder_roll: d(-65),
        left_elbow: d(15), right_elbow: d(15),
      }),
    },

    // ══════════ SECTION 5: PROUD LIFTS ══════════
    // ── 13. Right knee high ──
    {
      duration: 0.8,
      label: "Right knee high",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_roll: d(-3), waist_yaw: d(15),
        left_shoulder_pitch: d(-60), left_shoulder_roll: d(75),
        left_shoulder_yaw: d(15),
        right_shoulder_pitch: d(-15), right_shoulder_roll: d(-30),
        left_elbow: d(45), right_elbow: d(15),
        left_wrist_pitch: d(-30), left_wrist_yaw: d(20),
      }),
    },

    // ── 14. Settle ──
    {
      duration: 0.5,
      label: "Settle",
      pose: pose({
        left_knee: d(14), right_knee: d(14),
        left_shoulder_pitch: d(10), left_shoulder_roll: d(65),
        right_shoulder_pitch: d(10), right_shoulder_roll: d(-65),
        left_elbow: d(15), right_elbow: d(15),
      }),
    },

    // ── 15. Left knee high ──
    {
      duration: 0.8,
      label: "Left knee high",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_roll: d(3), waist_yaw: d(-15),
        right_shoulder_pitch: d(-60), right_shoulder_roll: d(-75),
        right_shoulder_yaw: d(-15),
        left_shoulder_pitch: d(-15), left_shoulder_roll: d(30),
        right_elbow: d(45), left_elbow: d(15),
        right_wrist_pitch: d(-30), right_wrist_yaw: d(-20),
      }),
    },

    // ── 16. Settle ──
    {
      duration: 0.5,
      label: "Settle 2",
      pose: pose({
        left_knee: d(14), right_knee: d(14),
        left_shoulder_pitch: d(10), left_shoulder_roll: d(65),
        right_shoulder_pitch: d(10), right_shoulder_roll: d(-65),
        left_elbow: d(15), right_elbow: d(15),
      }),
    },

    // ══════════ SECTION 6: SWAY ══════════
    // ── 17. Sway right ──
    {
      duration: 0.5,
      label: "Sway right",
      pose: pose({
        left_knee: d(10), right_knee: d(16),
        waist_roll: d(4), waist_yaw: d(12),
        left_shoulder_pitch: d(-70), left_shoulder_roll: d(50),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-55),
        left_elbow: d(50), right_elbow: d(25),
        left_wrist_roll: d(15), left_wrist_pitch: d(-20),
      }),
    },

    // ── 18. Sway left ──
    {
      duration: 0.5,
      label: "Sway left",
      pose: pose({
        left_knee: d(16), right_knee: d(10),
        waist_roll: d(-4), waist_yaw: d(-12),
        right_shoulder_pitch: d(-70), right_shoulder_roll: d(-50),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(55),
        right_elbow: d(50), left_elbow: d(25),
        right_wrist_roll: d(-15), right_wrist_pitch: d(-20),
      }),
    },

    // ── 19. Center snap ──
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

    // ══════════ SECTION 7: LIFT + TURN ══════════
    // ── 20. Right lift + turn ──
    {
      duration: 0.8,
      label: "Right lift turn",
      pose: pose({
        left_knee: d(15), left_hip_roll: d(-14),
        right_hip_pitch: d(-10), right_knee: d(30),
        waist_yaw: d(20), waist_roll: d(-3),
        left_shoulder_pitch: d(-65), left_shoulder_roll: d(70),
        left_shoulder_yaw: d(10),
        right_shoulder_pitch: d(-30), right_shoulder_roll: d(-35),
        left_elbow: d(45), right_elbow: d(25),
        left_wrist_pitch: d(-25), left_wrist_yaw: d(15),
      }),
    },

    // ── 21. Recovery ──
    {
      duration: 0.5,
      label: "Recovery",
      pose: pose({
        left_knee: d(14), right_knee: d(14),
        left_shoulder_pitch: d(-20), left_shoulder_roll: d(15),
        right_shoulder_pitch: d(-20), right_shoulder_roll: d(-15),
        left_elbow: d(65), right_elbow: d(65),
        left_wrist_pitch: d(-15), right_wrist_pitch: d(-15),
      }),
    },

    // ── 22. Left lift + turn ──
    {
      duration: 0.8,
      label: "Left lift turn",
      pose: pose({
        right_knee: d(15), right_hip_roll: d(14),
        left_hip_pitch: d(-10), left_knee: d(30),
        waist_yaw: d(-20), waist_roll: d(3),
        right_shoulder_pitch: d(-65), right_shoulder_roll: d(-70),
        right_shoulder_yaw: d(-10),
        left_shoulder_pitch: d(-30), left_shoulder_roll: d(35),
        right_elbow: d(45), left_elbow: d(25),
        right_wrist_pitch: d(-25), right_wrist_yaw: d(-15),
      }),
    },

    // ══════════ SECTION 8: GRAND FINALE ══════════
    // ── 23. Grand finale ──
    {
      duration: 0.6,
      label: "Grand finale",
      pose: pose({
        left_knee: d(10), right_knee: d(10),
        waist_pitch: d(-5),
        left_shoulder_pitch: d(-95), left_shoulder_roll: d(35),
        right_shoulder_pitch: d(-95), right_shoulder_roll: d(-35),
        left_elbow: d(50), right_elbow: d(50),
        left_wrist_pitch: d(-30), right_wrist_pitch: d(-30),
        left_wrist_yaw: d(20), right_wrist_yaw: d(-20),
      }),
    },

    // ── 24. Return ──
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
