import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as ort from "onnxruntime-web";
import { SKILL_KEYS_IN_JOINT_MAP_ORDER } from "../../mujoco/jointMapping";
import { loadMenagerieG1 } from "../../mujoco/loadMenagerieG1";
import { qposVecGet, qposVecSet, skillKeyQposAddress } from "../../mujoco/qposToSkillAngles";

export type MuJoCoG1ViewerProps = {
  jointRad: Record<string, number>;
  /** When true, run mj_step (full physics with gravity); otherwise mj_forward (kinematic). */
  physicsEnabled?: boolean;
  /** When true (requires physicsEnabled), pelvis is NOT pinned — robot can fall. */
  freeStand?: boolean;
  /** When true (requires freeStand), legs auto-adjust to keep the robot balanced. */
  autoBalance?: boolean;
  onReady?: (ctx: { model: unknown; data: unknown; mujoco: unknown }) => void;
  onError?: (e: Error) => void;
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
const L_ANKLE_PITCH = 4;
const R_HIP_PITCH   = 6;
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

  // Debug: log every ~60 frames (1/sec)
  if (Math.random() < 0.017) {
    console.log(`[BAL] z=${pz.toFixed(3)} pitch=${(pitch*180/Math.PI).toFixed(1)}° corr=${corr.toFixed(4)} ankle=${ankleAdj.toFixed(4)} hip=${hipAdj.toFixed(4)}`);
  }

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

function MuJoCoG1Scene({
  jointRad,
  physicsEnabled = false,
  freeStand = false,
  autoBalance = false,
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
  }, []);

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
  });

  if (initErr) {
    return null;
  }

  return <primitive object={robotRoot} />;
}

export default function MuJoCoG1Viewer({ jointRad, physicsEnabled, freeStand, autoBalance, onReady, onError }: MuJoCoG1ViewerProps) {
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
      <Canvas frameloop="always" shadows camera={camSetup} gl={{ antialias: true }}>
        <color attach="background" args={["#0b0f14"]} />
        <ambientLight intensity={0.6} />
        <directionalLight castShadow position={[5, 5, 5]} intensity={1.2} shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, -3, 2]} intensity={0.4} />
        <MuJoCoG1Scene jointRad={jointRad} physicsEnabled={physicsEnabled} freeStand={freeStand} autoBalance={autoBalance} onReady={handleReady} onError={handleError} />
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
