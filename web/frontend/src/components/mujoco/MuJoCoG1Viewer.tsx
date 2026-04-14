import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as ort from "onnxruntime-web";
import { SKILL_KEYS_IN_JOINT_MAP_ORDER } from "../../mujoco/jointMapping";
import { loadMenagerieG1 } from "../../mujoco/loadMenagerieG1";
import { qposVecGet, qposVecSet, skillKeyQposAddress } from "../../mujoco/qposToSkillAngles";
import type { MuJoCoTelemetry } from "../../mujoco/mujocoTelemetry";

export type MuJoCoG1ViewerProps = {
  jointRad: Record<string, number>;
  /** When true, run mj_step (full physics with gravity); otherwise mj_forward (kinematic). */
  physicsEnabled?: boolean;
  /** When true (requires physicsEnabled), pelvis is NOT pinned — robot can fall. */
  freeStand?: boolean;
  /** When true (requires freeStand), legs auto-adjust to keep the robot balanced. */
  autoBalance?: boolean;
  /** Perturbation force to apply this frame via mj_applyFT (cleared after one application). */
  perturbForce?: { bodyId: number; force: [number, number, number]; point: [number, number, number] } | null;
  onReady?: (ctx: { model: unknown; data: unknown; mujoco: unknown }) => void;
  onError?: (e: Error) => void;
  /** Telemetry ref — written every frame without triggering re-renders. */
  telemetryRef?: React.MutableRefObject<MuJoCoTelemetry>;
};

type MuJoCoModel = {
  ngeom: number;
  nbody: number;
  nmesh: number;
  nu: number;
  nv: number;
  geom_type: Int32Array;
  geom_bodyid: Int32Array;
  geom_dataid: Int32Array;
  geom_rgba: Float32Array;
  geom_pos: Float64Array;
  geom_quat: Float64Array;
  geom_size: Float64Array;
  geom_group: Int32Array;
  mesh_vert: Float64Array;
  mesh_face: Int32Array;
  mesh_vertadr: Int32Array;
  mesh_vertnum: Int32Array;
  mesh_faceadr: Int32Array;
  mesh_facenum: Int32Array;
};

type MuJoCoData = {
  xpos: Float64Array;
  xquat: Float64Array;
  qpos: unknown;
  qvel: unknown;
  ctrl: unknown;
};

type MjGeomType = {
  mjGEOM_PLANE: { value: number };
  mjGEOM_HFIELD: { value: number };
  mjGEOM_SPHERE: { value: number };
  mjGEOM_CAPSULE: { value: number };
  mjGEOM_ELLIPSOID: { value: number };
  mjGEOM_CYLINDER: { value: number };
  mjGEOM_BOX: { value: number };
  mjGEOM_MESH: { value: number };
};

function buildMeshGeometry(
  model: MuJoCoModel,
  meshId: number
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  const vertAdr = model.mesh_vertadr[meshId];
  const vertNum = model.mesh_vertnum[meshId];
  const faceAdr = model.mesh_faceadr[meshId];
  const faceNum = model.mesh_facenum[meshId];

  if (vertNum <= 0 || faceNum <= 0) {
    return geometry;
  }

  const vertexBuffer = model.mesh_vert.subarray(
    vertAdr * 3,
    (vertAdr + vertNum) * 3
  );

  const positions = new Float32Array(vertexBuffer.length);
  for (let v = 0; v < vertexBuffer.length; v += 3) {
    positions[v] = vertexBuffer[v];
    positions[v + 1] = vertexBuffer[v + 2];
    positions[v + 2] = -vertexBuffer[v + 1];
  }

  const faceBuffer = model.mesh_face.subarray(
    faceAdr * 3,
    (faceAdr + faceNum) * 3
  );

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(Array.from(faceBuffer));
  geometry.computeVertexNormals();

  return geometry;
}

function createGeometryForType(
  geomType: number,
  size: [number, number, number],
  mjtGeom: MjGeomType
): THREE.BufferGeometry | null {
  if (geomType === mjtGeom.mjGEOM_PLANE.value) {
    const geom = new THREE.PlaneGeometry(size[0] * 2, size[1] * 2);
    geom.rotateX(-Math.PI / 2);
    return geom;
  } else if (geomType === mjtGeom.mjGEOM_SPHERE.value) {
    return new THREE.SphereGeometry(size[0], 32, 32);
  } else if (geomType === mjtGeom.mjGEOM_CAPSULE.value) {
    return new THREE.CapsuleGeometry(size[0], size[1] * 2.0, 20, 20);
  } else if (geomType === mjtGeom.mjGEOM_ELLIPSOID.value) {
    const geom = new THREE.SphereGeometry(1, 32, 32);
    geom.scale(size[0], size[2], size[1]);
    return geom;
  } else if (geomType === mjtGeom.mjGEOM_CYLINDER.value) {
    return new THREE.CylinderGeometry(size[0], size[0], size[1] * 2.0, 32);
  } else if (geomType === mjtGeom.mjGEOM_BOX.value) {
    return new THREE.BoxGeometry(size[0] * 2.0, size[2] * 2.0, size[1] * 2.0);
  }
  return null;
}

type BodyGroup = THREE.Group & { bodyID: number };

/**
 * Frame-rate independent physics: calculate sub-steps from elapsed real time.
 * At 60fps → ~8 steps, at 30fps → ~17 steps, always ≈1:1 sim/real time.
 */
const SIM_DT = 0.002; // model.opt.timestep for G1
const MAX_PHYSICS_DT = 0.05; // cap elapsed time at 50ms (20fps minimum)
const MAX_STEPS_PER_FRAME = 20;
let _lastPhysicsTime = 0;

function calcPhysicsSteps(): number {
  const now = performance.now() / 1000;
  if (_lastPhysicsTime <= 0) {
    _lastPhysicsTime = now;
    return Math.round(0.016 / SIM_DT); // first frame: assume ~60fps
  }
  const elapsed = Math.min(now - _lastPhysicsTime, MAX_PHYSICS_DT);
  _lastPhysicsTime = now;
  return Math.max(1, Math.min(MAX_STEPS_PER_FRAME, Math.round(elapsed / SIM_DT)));
}

// ── Auto-balance controller ──────────────────────────────────────────────────
// Actuator indices (matching SKILL_KEYS_IN_JOINT_MAP_ORDER / MENAGERIE_JOINT_NAMES):
const L_HIP_PITCH   = 0;
const L_HIP_ROLL    = 1;
const L_ANKLE_PITCH = 4;
const R_HIP_PITCH   = 6;
const R_HIP_ROLL    = 7;
const R_ANKLE_PITCH = 10;
const L_KNEE        = 3;
const R_KNEE        = 9;
const WAIST_ROLL    = 13;

/** If pelvis z drops below this, robot has fallen — stop correcting entirely. */
const FALL_HEIGHT = 0.4;

/**
 * Balance controller with EMPIRICALLY VERIFIED signs.
 *
 * Tested in native MuJoCo (test_balance.py) with 30N push:
 *   ankle=+1 hip=+1 → STANDING (maxPitch 0.2°, all gains up to kp=2.0)
 *   ankle=-1 hip=+1 → FALLEN (our previous code!)
 *   ankle=+1 hip=-1 → STANDING but worse
 *   ankle=-1 hip=-1 → FALLEN
 *
 * Both ankle AND hip corrections are POSITIVE multiples of pitchCorr.
 * When pitch > 0 (forward lean): both ankle and hip get positive ctrl offset.
 *
 * Stable range: kp ≤ 2.0, maxCorr ≤ 0.2. Beyond that → oscillation → fall.
 */
const BAL = {
  kp: 2.0,
  kd: 0.5,
  hipRatio: 1.0,
  maxCorr: 0.15,
  kneeMin: 0.15,
};

// NOTE: Roll PD was removed — it creates positive feedback with hip_roll poses.
// Lateral balance is achieved by baking hip_roll offsets into dance keyframes
// (e.g. hip_roll=-14° on standing leg shifts CoM over the foot).
// Verified in test_dance_pitch_only.py: 3 loops, 42 transitions, 0 falls.

// NOTE: Roll PD through waist_roll — corrects lateral lean without the positive
// feedback that hip_roll PD creates. Keeps max correction small (≈1.7°).
// Verified in test_final_dance.py: all FPS passed (30/60/90/120/144), 5 loops.
const ROLL_BAL = {
  kp: 0.3,
  kd: 0.1,
  maxCorr: 0.03,   // ~1.7° — very gentle
  deadZone: 0.02,  // ~1.1° — don't correct tiny oscillations
};

const DEAD_ZONE = 0.01;
const SMOOTH = 0.5;
let _prevCorr = 0;
let _prevRollCorr = 0;

// ── Weight-shift: auto-compensate when user bends one knee more than the other ──
// Verified in test_weight_shift_v5.py: hr=2° waist=4° stand_knee=12°
// passes ALL FPS (30/60/90/120/144) for knee up to 35°, worst roll 1.6°.
const WEIGHT_SHIFT = {
  hipRollRad: 2 * Math.PI / 180,   // 2° hip_roll on standing leg
  waistRollRad: 4 * Math.PI / 180, // 4° waist_roll offset
  standKneeRad: 12 * Math.PI / 180, // 12° standing knee minimum
  kneeThresh: 3 * Math.PI / 180,   // activate above 3° knee diff
  maxKneeDiff: 30 * Math.PI / 180, // full ratio at 30° diff
  hipRollGuard: 5 * Math.PI / 180, // don't apply if user already set large hip_roll
};

/**
 * When user bends one knee more than the other (via sliders),
 * auto-shift weight to the straighter leg to prevent falling.
 * Does NOT apply when the user/dance already includes hip_roll (>5°).
 */
function applyWeightShift(data: MuJoCoData): void {
  const ctrl = data.ctrl;
  const lk = qposVecGet(ctrl, L_KNEE) ?? 0;
  const rk = qposVecGet(ctrl, R_KNEE) ?? 0;
  const kneeDiff = rk - lk; // positive = R knee more bent

  if (Math.abs(kneeDiff) <= WEIGHT_SHIFT.kneeThresh) return;

  const ratio = Math.max(-1, Math.min(1, kneeDiff / WEIGHT_SHIFT.maxKneeDiff));
  const absRatio = Math.abs(ratio);

  if (kneeDiff > 0) {
    // R knee bent more → shift weight to L (standing leg)
    const lhr = qposVecGet(ctrl, L_HIP_ROLL) ?? 0;
    // Guard: skip if user/dance already set large hip_roll
    if (Math.abs(lhr) < WEIGHT_SHIFT.hipRollGuard) {
      qposVecSet(ctrl, L_HIP_ROLL, lhr - WEIGHT_SHIFT.hipRollRad * absRatio);
    }
    const lkv = qposVecGet(ctrl, L_KNEE) ?? 0;
    qposVecSet(ctrl, L_KNEE, Math.max(lkv, WEIGHT_SHIFT.standKneeRad));
  } else {
    // L knee bent more → shift weight to R (standing leg)
    const rhr = qposVecGet(ctrl, R_HIP_ROLL) ?? 0;
    if (Math.abs(rhr) < WEIGHT_SHIFT.hipRollGuard) {
      qposVecSet(ctrl, R_HIP_ROLL, rhr + WEIGHT_SHIFT.hipRollRad * absRatio);
    }
    const rkv = qposVecGet(ctrl, R_KNEE) ?? 0;
    qposVecSet(ctrl, R_KNEE, Math.max(rkv, WEIGHT_SHIFT.standKneeRad));
  }

  // Waist roll to help shift COM
  const wr = qposVecGet(ctrl, WAIST_ROLL) ?? 0;
  qposVecSet(ctrl, WAIST_ROLL, wr - WEIGHT_SHIFT.waistRollRad * ratio);
}

function applyAutoBalance(data: MuJoCoData): void {
  const qpos = data.qpos;
  const qvel = data.qvel;
  const ctrl = data.ctrl;

  // Fall detection
  const pz = qposVecGet(qpos, 2) ?? 0.793;
  if (pz < FALL_HEIGHT) {
    _prevCorr = 0;
    return;
  }

  // Pelvis pitch from quaternion
  const qw = qposVecGet(qpos, 3) ?? 1;
  const qx = qposVecGet(qpos, 4) ?? 0;
  const qy = qposVecGet(qpos, 5) ?? 0;
  const qz = qposVecGet(qpos, 6) ?? 0;
  const sinP = 2 * (qw * qy - qz * qx);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinP)));

  // Dead zone
  if (Math.abs(pitch) < DEAD_ZONE) {
    _prevCorr *= 0.9; // slowly decay
    return;
  }

  // Pitch rate (qvel[4] verified as Y-axis angular velocity)
  const wy = qposVecGet(qvel, 4) ?? 0;

  // PD correction (positive when leaning forward)
  let corr = pitch * BAL.kp + wy * BAL.kd;

  // Low-pass filter
  corr = SMOOTH * _prevCorr + (1 - SMOOTH) * corr;
  _prevCorr = corr;

  const cl = (v: number) => Math.max(-BAL.maxCorr, Math.min(BAL.maxCorr, v));

  // EMPIRICALLY VERIFIED: both ankle and hip corrections = +corr
  const ankleAdj = cl(corr);
  const hipAdj   = cl(corr * BAL.hipRatio);



  // Read user targets and add corrections
  const lap = qposVecGet(ctrl, L_ANKLE_PITCH) ?? 0;
  const rap = qposVecGet(ctrl, R_ANKLE_PITCH) ?? 0;
  const lhp = qposVecGet(ctrl, L_HIP_PITCH) ?? 0;
  const rhp = qposVecGet(ctrl, R_HIP_PITCH) ?? 0;
  const lk  = qposVecGet(ctrl, L_KNEE) ?? 0;
  const rk  = qposVecGet(ctrl, R_KNEE) ?? 0;

  qposVecSet(ctrl, L_ANKLE_PITCH, lap + ankleAdj);
  qposVecSet(ctrl, R_ANKLE_PITCH, rap + ankleAdj);
  qposVecSet(ctrl, L_HIP_PITCH, lhp + hipAdj);
  qposVecSet(ctrl, R_HIP_PITCH, rhp + hipAdj);

  // Knee bend for stability
  qposVecSet(ctrl, L_KNEE, Math.max(lk, BAL.kneeMin));
  qposVecSet(ctrl, R_KNEE, Math.max(rk, BAL.kneeMin));

  // ── Roll PD (waist_roll correction) ──
  const rollAngle = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy));
  if (Math.abs(rollAngle) > ROLL_BAL.deadZone) {
    const wx = qposVecGet(qvel, 3) ?? 0;
    let rollCorr = rollAngle * ROLL_BAL.kp + wx * ROLL_BAL.kd;
    rollCorr = SMOOTH * _prevRollCorr + (1 - SMOOTH) * rollCorr;
    _prevRollCorr = rollCorr;
    const rc = Math.max(-ROLL_BAL.maxCorr, Math.min(ROLL_BAL.maxCorr, rollCorr));
    const wr = qposVecGet(ctrl, WAIST_ROLL) ?? 0;
    qposVecSet(ctrl, WAIST_ROLL, wr - rc);
  } else {
    _prevRollCorr *= 0.9;
  }
}

// ── RL Balance Policy (ONNX) ──────────────────────────────────────────────────
const DELTA_MAX = 0.3; // must match training env
let _rlSession: ort.InferenceSession | null = null;
let _rlLoading = false;
let _rlLoadFailed = false;

async function loadRLBalancePolicy(): Promise<ort.InferenceSession | null> {
  if (_rlSession) return _rlSession;
  if (_rlLoading || _rlLoadFailed) return null;
  _rlLoading = true;
  try {
    _rlSession = await ort.InferenceSession.create("/mujoco/g1/balance_policy.onnx", {
      executionProviders: ["wasm"],
    });
    console.log("[RL Balance] ONNX model loaded");
    _rlLoading = false;
    return _rlSession;
  } catch (e) {
    console.warn("[RL Balance] Failed to load ONNX:", e);
    _rlLoadFailed = true;
    _rlLoading = false;
    return null;
  }
}

/**
 * Build observation vector (43 dims) matching G1BalanceEnv:
 *  pelvis_quat(4) + pelvis_angvel(3) + pelvis_linvel(3) +
 *  leg_q(12) + leg_dq(12) + pelvis_z(1) + waist_targets(3) + arm_context(5)
 */
function buildBalanceObs(data: MuJoCoData): Float32Array {
  const obs = new Float32Array(43);
  let idx = 0;

  // Pelvis quaternion [qpos 3..6]
  for (let i = 3; i <= 6; i++) obs[idx++] = qposVecGet(data.qpos, i) ?? (i === 3 ? 1 : 0);

  // Pelvis angular velocity [qvel 3..5]
  for (let i = 3; i <= 5; i++) obs[idx++] = qposVecGet(data.qvel, i) ?? 0;

  // Pelvis linear velocity [qvel 0..2]
  for (let i = 0; i <= 2; i++) obs[idx++] = qposVecGet(data.qvel, i) ?? 0;

  // Leg joint angles [qpos 7..18]
  for (let i = 7; i <= 18; i++) obs[idx++] = qposVecGet(data.qpos, i) ?? 0;

  // Leg joint velocities [qvel 6..17]
  for (let i = 6; i <= 17; i++) obs[idx++] = qposVecGet(data.qvel, i) ?? 0;

  // Pelvis height
  obs[idx++] = qposVecGet(data.qpos, 2) ?? 0.793;

  // Waist targets (current ctrl for waist joints 12,13,14)
  obs[idx++] = qposVecGet(data.ctrl, 12) ?? 0;
  obs[idx++] = qposVecGet(data.ctrl, 13) ?? 0;
  obs[idx++] = qposVecGet(data.ctrl, 14) ?? 0;

  // Arm context (ctrl 15, 22, 18, 25, 14)
  obs[idx++] = qposVecGet(data.ctrl, 15) ?? 0;
  obs[idx++] = qposVecGet(data.ctrl, 22) ?? 0;
  obs[idx++] = qposVecGet(data.ctrl, 18) ?? 0;
  obs[idx++] = qposVecGet(data.ctrl, 25) ?? 0;
  obs[idx++] = qposVecGet(data.ctrl, 14) ?? 0;

  return obs;
}

let _lastRLAction: Float32Array | null = null;

function applyRLBalance(data: MuJoCoData): void {
  if (!_rlSession || !_lastRLAction) {
    // Fallback to PD balance until RL is ready
    applyAutoBalance(data);
    return;
  }

  // Apply RL leg residuals (12 dims → ctrl[0..11])
  for (let i = 0; i < 12; i++) {
    const current = qposVecGet(data.ctrl, i) ?? 0;
    qposVecSet(data.ctrl, i, current + _lastRLAction[i] * DELTA_MAX);
  }
}

// ── Telemetry extraction ──────────────────────────────────────────────────────
// Body names for feet — resolved once after model load via mj_name2id.
let _leftFootBodyId = -1;
let _rightFootBodyId = -1;

function resolveFootBodyIds(mujoco: unknown, model: unknown): void {
  const mj = mujoco as { mj_name2id: (m: unknown, type: number, name: string) => number };
  const mjOBJ_BODY = 1; // mjtObj enum value for body
  _leftFootBodyId = mj.mj_name2id(model, mjOBJ_BODY, "left_ankle_roll_link");
  _rightFootBodyId = mj.mj_name2id(model, mjOBJ_BODY, "right_ankle_roll_link");
}

function extractTelemetry(
  _mujoco: unknown,
  model: MuJoCoModel,
  data: MuJoCoData,
  target: MuJoCoTelemetry
): void {
  const d = data as MuJoCoData & {
    sensordata: unknown;
    ncon: number;
    contact: unknown;
    time: number;
    subtree_com: Float64Array;
    energy: Float64Array;
    actuator_force: unknown;
    qfrc_applied: unknown;
  };
  const m = model as MuJoCoModel & {
    nsensordata: number;
    nv: number;
    nbody: number;
    opt: { timestep: number; gravity: Float64Array; iterations: number };
  };

  // ── IMU Sensors (sensordata: 12 values = 4 sensors × 3 axes) ──
  const sd = d.sensordata;
  try {
    target.imu.torsoGyro.x = qposVecGet(sd, 0) ?? 0;
    target.imu.torsoGyro.y = qposVecGet(sd, 1) ?? 0;
    target.imu.torsoGyro.z = qposVecGet(sd, 2) ?? 0;
    target.imu.torsoAccel.x = qposVecGet(sd, 3) ?? 0;
    target.imu.torsoAccel.y = qposVecGet(sd, 4) ?? 0;
    target.imu.torsoAccel.z = qposVecGet(sd, 5) ?? 0;
    target.imu.pelvisGyro.x = qposVecGet(sd, 6) ?? 0;
    target.imu.pelvisGyro.y = qposVecGet(sd, 7) ?? 0;
    target.imu.pelvisGyro.z = qposVecGet(sd, 8) ?? 0;
    target.imu.pelvisAccel.x = qposVecGet(sd, 9) ?? 0;
    target.imu.pelvisAccel.y = qposVecGet(sd, 10) ?? 0;
    target.imu.pelvisAccel.z = qposVecGet(sd, 11) ?? 0;
  } catch { /* sensordata may not be exposed in all WASM builds */ }

  // ── Pelvis state ──
  const qpos = data.qpos;
  const qvel = data.qvel;
  target.pelvis.pos.x = qposVecGet(qpos, 0) ?? 0;
  target.pelvis.pos.y = qposVecGet(qpos, 1) ?? 0;
  target.pelvis.pos.z = qposVecGet(qpos, 2) ?? 0.793;
  target.pelvis.height = target.pelvis.pos.z;

  const qw = qposVecGet(qpos, 3) ?? 1;
  const qx = qposVecGet(qpos, 4) ?? 0;
  const qy = qposVecGet(qpos, 5) ?? 0;
  const qz = qposVecGet(qpos, 6) ?? 0;
  target.pelvis.quat.w = qw;
  target.pelvis.quat.x = qx;
  target.pelvis.quat.y = qy;
  target.pelvis.quat.z = qz;

  // Euler from quaternion
  const sinP = 2 * (qw * qy - qz * qx);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinP)));
  const roll = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy));
  const yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
  const RAD2DEG = 180 / Math.PI;
  target.pelvis.euler.pitch = pitch * RAD2DEG;
  target.pelvis.euler.roll = roll * RAD2DEG;
  target.pelvis.euler.yaw = yaw * RAD2DEG;

  // Pelvis velocities
  target.pelvis.linVel.x = qposVecGet(qvel, 0) ?? 0;
  target.pelvis.linVel.y = qposVecGet(qvel, 1) ?? 0;
  target.pelvis.linVel.z = qposVecGet(qvel, 2) ?? 0;
  target.pelvis.angVel.x = qposVecGet(qvel, 3) ?? 0;
  target.pelvis.angVel.y = qposVecGet(qvel, 4) ?? 0;
  target.pelvis.angVel.z = qposVecGet(qvel, 5) ?? 0;

  target.fallen = target.pelvis.height < FALL_HEIGHT;

  // ── Contacts ──
  try {
    target.contacts.ncon = d.ncon ?? 0;
    let leftContacts = 0;
    let rightContacts = 0;
    // Contact pairs: iterate and check if foot bodies are involved
    // In WASM, contact info may be limited; we count based on ncon
    if (_leftFootBodyId >= 0 || _rightFootBodyId >= 0) {
      // Use xpos of feet to estimate ground contact (z < 0.02)
      if (_leftFootBodyId >= 0) {
        const lfz = data.xpos[_leftFootBodyId * 3 + 2];
        leftContacts = lfz < 0.02 ? 1 : 0;
      }
      if (_rightFootBodyId >= 0) {
        const rfz = data.xpos[_rightFootBodyId * 3 + 2];
        rightContacts = rfz < 0.02 ? 1 : 0;
      }
    }
    target.contacts.leftFootContacts = leftContacts;
    target.contacts.rightFootContacts = rightContacts;
    // Approximate foot forces from z-acceleration + weight distribution
    const totalWeight = 40 * 9.81; // ~40kg G1 robot
    const totalContacts = leftContacts + rightContacts;
    target.contacts.leftFootForce = totalContacts > 0 ? totalWeight * (leftContacts / totalContacts) : 0;
    target.contacts.rightFootForce = totalContacts > 0 ? totalWeight * (rightContacts / totalContacts) : 0;
  } catch { /* contact data may not be accessible */ }

  // ── Center of Mass ──
  try {
    if (d.subtree_com) {
      // subtree_com[0] is world body CoM (whole-body)
      target.com.pos.x = d.subtree_com[0];
      target.com.pos.y = d.subtree_com[1];
      target.com.pos.z = d.subtree_com[2];
      target.com.groundProjection.x = d.subtree_com[0];
      target.com.groundProjection.z = d.subtree_com[1]; // MuJoCo y → ground z
    }
  } catch { /* subtree_com may not be available */ }

  // ── Energy ──
  try {
    if (d.energy) {
      target.energy.potential = d.energy[0] ?? 0;
      target.energy.kinetic = d.energy[1] ?? 0;
      target.energy.total = target.energy.potential + target.energy.kinetic;
    }
  } catch { /* energy may need flag_energy in model options */ }

  // ── Actuator Forces ──
  try {
    const af = d.actuator_force;
    if (af) {
      const forces: number[] = [];
      let maxF = 0;
      for (let i = 0; i < model.nu; i++) {
        const f = qposVecGet(af, i) ?? 0;
        forces.push(f);
        if (Math.abs(f) > maxF) maxF = Math.abs(f);
      }
      target.actuators.forces = forces;
      target.actuators.maxForce = maxF;
      if (target.actuators.names.length === 0) {
        target.actuators.names = [...SKILL_KEYS_IN_JOINT_MAP_ORDER];
      }
    }
  } catch { /* actuator_force may not be exposed */ }

  // ── Physics Settings ──
  try {
    if (m.opt) {
      target.physics.timestep = m.opt.timestep ?? 0.002;
      if (m.opt.gravity) {
        target.physics.gravity.x = m.opt.gravity[0] ?? 0;
        target.physics.gravity.y = m.opt.gravity[1] ?? 0;
        target.physics.gravity.z = m.opt.gravity[2] ?? -9.81;
      }
      target.physics.iterations = m.opt.iterations ?? 100;
    }
  } catch { /* opt may not be directly readable */ }

  // ── Sim time ──
  target.simTime = d.time ?? 0;
}

function MuJoCoG1Scene({
  jointRad,
  physicsEnabled = false,
  freeStand = false,
  autoBalance = false,
  perturbForce,
  telemetryRef,
  onReady,
  onError,
}: Omit<MuJoCoG1ViewerProps, never>) {
  const robotRoot = useMemo(() => new THREE.Group(), []);
  const bodiesRef = useRef<Record<number, BodyGroup>>({});
  const geomMeshesRef = useRef<THREE.Mesh[]>([]);
  const meshGeomsRef = useRef<Record<number, THREE.BufferGeometry>>({});
  const ctxRef = useRef<{
    mujoco: unknown;
    model: MuJoCoModel;
    data: MuJoCoData;
    disposeModel: () => void;
  } | null>(null);
  const jointRef = useRef(jointRad);
  jointRef.current = jointRad;
  const physicsRef = useRef(physicsEnabled);
  physicsRef.current = physicsEnabled;
  const freeStandRef = useRef(freeStand);
  freeStandRef.current = freeStand;
  const autoBalanceRef = useRef(autoBalance);
  autoBalanceRef.current = autoBalance;
  const perturbForceRef = useRef(perturbForce);
  perturbForceRef.current = perturbForce;
  const telemetryRefProp = telemetryRef;

  const [initErr, setInitErr] = useState<Error | null>(null);
  const { invalidate } = useThree();
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    invalidate();
  }, [jointRad, invalidate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { mujoco, model, data, dispose } = await loadMenagerieG1();
        if (cancelled) {
          dispose();
          return;
        }

        // Start loading RL balance policy in background
        loadRLBalancePolicy();

        const m = model as MuJoCoModel;
        const mjtGeom = (mujoco as { mjtGeom: MjGeomType }).mjtGeom;

        const bodies: Record<number, BodyGroup> = {};
        const meshGeoms: Record<number, THREE.BufferGeometry> = {};
        const geomMeshes: THREE.Mesh[] = [];

        for (let g = 0; g < m.ngeom; g++) {
          if (!(m.geom_group[g] < 3)) continue;

          const b = m.geom_bodyid[g];
          const type = m.geom_type[g];
          const size: [number, number, number] = [
            m.geom_size[g * 3 + 0],
            m.geom_size[g * 3 + 1],
            m.geom_size[g * 3 + 2],
          ];

          if (!(b in bodies)) {
            const group = new THREE.Group() as BodyGroup;
            group.bodyID = b;
            bodies[b] = group;
          }

          let geometry: THREE.BufferGeometry | null = null;

          if (type === mjtGeom.mjGEOM_MESH.value) {
            const meshId = m.geom_dataid[g];
            if (meshId >= 0) {
              if (!(meshId in meshGeoms)) {
                meshGeoms[meshId] = buildMeshGeometry(m, meshId);
              }
              geometry = meshGeoms[meshId];
            }
          } else {
            geometry = createGeometryForType(type, size, mjtGeom);
          }

          if (!geometry) continue;

          const r = m.geom_rgba[g * 4 + 0];
          const gCol = m.geom_rgba[g * 4 + 1];
          const bCol = m.geom_rgba[g * 4 + 2];
          const a = m.geom_rgba[g * 4 + 3];

          const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(r, gCol, bCol),
            transparent: a < 1.0,
            opacity: a,
            metalness: 0.1,
            roughness: 0.65,
            side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.geomIndex = g;
          mesh.userData.bodyId = b;

          mesh.position.set(
            m.geom_pos[g * 3 + 0],
            m.geom_pos[g * 3 + 2],
            -m.geom_pos[g * 3 + 1]
          );

          const qw = m.geom_quat[g * 4 + 0];
          const qx = m.geom_quat[g * 4 + 1];
          const qy = m.geom_quat[g * 4 + 2];
          const qz = m.geom_quat[g * 4 + 3];
          mesh.quaternion.set(qx, qz, -qy, qw);

          geomMeshes[g] = mesh;
          bodies[b].add(mesh);
        }

        for (const bodyId in bodies) {
          robotRoot.add(bodies[bodyId]);
        }

        bodiesRef.current = bodies;
        meshGeomsRef.current = meshGeoms;
        geomMeshesRef.current = geomMeshes;

        ctxRef.current = {
          mujoco,
          model: m,
          data: data as MuJoCoData,
          disposeModel: () => {
            for (const meshId in meshGeoms) {
              meshGeoms[meshId].dispose();
            }
            dispose();
          },
        };

        onReadyRef.current?.({ model, data, mujoco });
        resolveFootBodyIds(mujoco, model);
        invalidate();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (!cancelled) {
          setInitErr(err);
          onErrorRef.current?.(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      while (robotRoot.children.length > 0) {
        robotRoot.remove(robotRoot.children[0]);
      }
      bodiesRef.current = {};
      geomMeshesRef.current = [];
      if (ctxRef.current) {
        ctxRef.current.disposeModel();
        ctxRef.current = null;
      }
    };
  }, [invalidate, robotRoot]);

  const applyJointRad = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { mujoco, model, data } = ctx;
    const jr = jointRef.current;
    const usePhysics = physicsRef.current;

    if (usePhysics) {
      // Physics mode: only set ctrl (actuator targets).
      // mj_step computes real physics — gravity, inertia, contact forces.
      const ctrl = data.ctrl;
      const qpos = data.qpos;
      const qvel = data.qvel;
      const pinBase = !freeStandRef.current;

      // Write target angles to ctrl only — do NOT overwrite qpos.
      for (let i = 0; i < SKILL_KEYS_IN_JOINT_MAP_ORDER.length && i < model.nu; i++) {
        const key = SKILL_KEYS_IN_JOINT_MAP_ORDER[i];
        const v = jr[key];
        qposVecSet(ctrl, i, typeof v === "number" && Number.isFinite(v) ? v : 0);
      }

      const useBalance = freeStandRef.current && autoBalanceRef.current;

      // Run async RL inference (result used next frame)
      if (useBalance && _rlSession) {
        const obs = buildBalanceObs(data);
        const tensor = new ort.Tensor("float32", obs, [1, 43]);
        _rlSession.run({ obs: tensor }).then((result) => {
          _lastRLAction = result.action.data as Float32Array;
        }).catch(() => { /* ignore inference errors */ });
      }

      const nSteps = calcPhysicsSteps();
      for (let s = 0; s < nSteps; s++) {
        if (pinBase) {
          // Pin floating base BEFORE step — pelvis stays fixed in space.
          qposVecSet(qpos, 0, 0);     // x
          qposVecSet(qpos, 1, 0);     // y
          qposVecSet(qpos, 2, 0.793); // z — pelvis standing height from g1.xml
          qposVecSet(qpos, 3, 1);     // qw
          qposVecSet(qpos, 4, 0);     // qx
          qposVecSet(qpos, 5, 0);     // qy
          qposVecSet(qpos, 6, 0);     // qz
          for (let v = 0; v < 6; v++) qposVecSet(qvel, v, 0);
        }

        // Re-apply balance corrections every sub-step using latest pelvis state.
        if (useBalance) {
          // Re-write user targets first (balance overwrites ctrl for leg joints).
          for (let i = 0; i < SKILL_KEYS_IN_JOINT_MAP_ORDER.length && i < model.nu; i++) {
            const key = SKILL_KEYS_IN_JOINT_MAP_ORDER[i];
            const v = jr[key];
            qposVecSet(ctrl, i, typeof v === "number" && Number.isFinite(v) ? v : 0);
          }
          applyWeightShift(data);
          applyRLBalance(data);
        }

        (mujoco as { mj_step: (m: unknown, d: unknown) => void }).mj_step(model, data);

        if (pinBase) {
          // Pin base AFTER step (undo reaction-force drift).
          qposVecSet(qpos, 0, 0);
          qposVecSet(qpos, 1, 0);
          qposVecSet(qpos, 2, 0.793);
          qposVecSet(qpos, 3, 1);
          qposVecSet(qpos, 4, 0);
          qposVecSet(qpos, 5, 0);
          qposVecSet(qpos, 6, 0);
          for (let v = 0; v < 6; v++) qposVecSet(qvel, v, 0);
        }
      }

      // Recompute xpos/xquat for rendering.
      (mujoco as { mj_forward: (m: unknown, d: unknown) => void }).mj_forward(model, data);
    } else {
      // Reset physics timer so next physics-on doesn't get a huge delta.
      _lastPhysicsTime = 0;
      // Kinematic mode (original): write directly to qpos, then mj_forward.
      const qpos = data.qpos;
      for (const key of SKILL_KEYS_IN_JOINT_MAP_ORDER) {
        const v = jr[key];
        if (typeof v === "number" && Number.isFinite(v)) {
          const adr = skillKeyQposAddress(model as never, key);
          qposVecSet(qpos, adr, v);
        }
      }
      (mujoco as { mj_forward: (m: unknown, d: unknown) => void }).mj_forward(model, data);
    }

    // ── Apply perturbation force (if requested) ──
    const pf = perturbForceRef.current;
    if (pf && usePhysics) {
      try {
        const mj = mujoco as {
          mj_applyFT: (
            m: unknown, d: unknown,
            fx: number, fy: number, fz: number,
            tx: number, ty: number, tz: number,
            px: number, py: number, pz: number,
            body: number, target: unknown
          ) => void;
        };
        const qfrc = (data as unknown as { qfrc_applied: unknown }).qfrc_applied;
        mj.mj_applyFT(
          model, data,
          pf.force[0], pf.force[1], pf.force[2],
          0, 0, 0,
          pf.point[0], pf.point[1], pf.point[2],
          pf.bodyId, qfrc
        );
      } catch { /* mj_applyFT may not be available in all WASM builds */ }
    }

    // ── Extract telemetry (ref-based, no re-renders) ──
    if (telemetryRefProp?.current) {
      extractTelemetry(mujoco, model, data, telemetryRefProp.current);
    }
  }, [telemetryRefProp]);

  useFrame(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    applyJointRad();

    const { data } = ctx;
    const bodies = bodiesRef.current;

    for (const bodyIdStr in bodies) {
      const bodyId = Number(bodyIdStr);
      const body = bodies[bodyId];

      body.position.set(
        data.xpos[bodyId * 3 + 0],
        data.xpos[bodyId * 3 + 2],
        -data.xpos[bodyId * 3 + 1]
      );

      const qw = data.xquat[bodyId * 4 + 0];
      const qx = data.xquat[bodyId * 4 + 1];
      const qy = data.xquat[bodyId * 4 + 2];
      const qz = data.xquat[bodyId * 4 + 3];
      body.quaternion.set(qx, qz, -qy, qw);
    }

    // ── Update CoM marker position ──
    if (comMarkerRef.current && telemetryRefProp?.current) {
      const com = telemetryRefProp.current.com.pos;
      // MuJoCo→THREE.js coords: (x, z, -y)
      comMarkerRef.current.position.set(com.x, com.z, -com.y);
    }
  });

  // ── CoM 3D marker ──
  const comMarkerRef = useRef<THREE.Mesh>(null);

  if (initErr) {
    return null;
  }

  return (
    <>
      <primitive object={robotRoot} />
      {/* Center of Mass indicator */}
      <mesh ref={comMarkerRef} visible={!!telemetryRefProp}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} transparent opacity={0.7} />
      </mesh>
      {/* CoM ground projection line */}
      {telemetryRefProp && (
        <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.03, 0.04, 24]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.4} />
        </mesh>
      )}
    </>
  );
}

export default function MuJoCoG1Viewer({ jointRad, physicsEnabled, freeStand, autoBalance, perturbForce, telemetryRef, onReady, onError }: MuJoCoG1ViewerProps) {
  const [loadErr, setLoadErr] = useState<Error | null>(null);
  const handleReady = useCallback(
    (ctx: { model: unknown; data: unknown; mujoco: unknown }) => {
      setLoadErr(null);
      onReady?.(ctx);
    },
    [onReady]
  );
  const handleError = useCallback(
    (e: Error) => {
      setLoadErr(e);
      onError?.(e);
    },
    [onError]
  );

  const camSetup = useMemo(
    () => ({
      position: [2.0, 1.7, 1.7] as [number, number, number],
      fov: 45,
      near: 0.05,
      far: 40,
      up: [0, 1, 0] as [number, number, number],
    }),
    []
  );

  return (
    <div className="mujoco-g1-viewer" style={{ position: "relative", width: "100%" }}>
      {loadErr ? (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
            background: "rgba(11, 15, 20, 0.92)",
            color: "#fecaca",
            fontSize: "0.875rem",
            lineHeight: 1.45,
          }}
        >
          {loadErr.message}
        </div>
      ) : null}
      <Canvas frameloop="always" shadows={{ type: THREE.PCFShadowMap }} camera={camSetup} gl={{ antialias: true }}>
        <color attach="background" args={["#0b0f14"]} />
        <ambientLight intensity={0.6} />
        <directionalLight castShadow position={[5, 5, 5]} intensity={1.2} shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, -3, 2]} intensity={0.4} />
        <MuJoCoG1Scene jointRad={jointRad} physicsEnabled={physicsEnabled} freeStand={freeStand} autoBalance={autoBalance} perturbForce={perturbForce} telemetryRef={telemetryRef} onReady={handleReady} onError={handleError} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0.7, 0]}
        />
        <gridHelper args={[4, 16, "#334155", "#1e293b"]} />
      </Canvas>
    </div>
  );
}
