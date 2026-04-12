import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
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

/** Number of mj_step sub-steps per animation frame (~60 fps → 5 steps × 0.002s = 0.01s/frame). */
const PHYSICS_STEPS_PER_FRAME = 5;

// ── Auto-balance controller ──────────────────────────────────────────────────
// Actuator indices (matching SKILL_KEYS_IN_JOINT_MAP_ORDER / MENAGERIE_JOINT_NAMES):
const L_HIP_PITCH = 0;
const L_HIP_ROLL  = 1;
const L_KNEE      = 3;
const L_ANKLE_PITCH = 4;
const L_ANKLE_ROLL  = 5;
const R_HIP_PITCH = 6;
const R_HIP_ROLL  = 7;
const R_KNEE      = 9;
const R_ANKLE_PITCH = 10;
const R_ANKLE_ROLL  = 11;

/** Balance gains — tuned for G1 standing on flat ground. */
const BAL = {
  /** Proportional gain: pelvis pitch → hip/ankle pitch correction. */
  kpPitch: 4.0,
  /** Proportional gain: pelvis roll → hip/ankle roll correction. */
  kpRoll: 3.0,
  /** Derivative gain: angular velocity damping. */
  kdPitch: 0.8,
  kdRoll: 0.6,
  /** Minimum knee bend (rad) to keep legs springy. */
  kneeMin: 0.15,
  /** How much ankle compensates relative to hip (0–1). */
  ankleRatio: 0.6,
};

/**
 * Compute balance corrections for leg joints based on pelvis orientation.
 * Reads qpos (quaternion) and qvel (angular velocity) of the floating base,
 * then writes corrective offsets into ctrl for hip/ankle joints.
 *
 * Strategy:
 *  - Small tilt → ankle correction (shift pressure)
 *  - Larger tilt → hip correction (shift CoM)
 *  - Angular velocity damping prevents oscillation
 */
function applyAutoBalance(
  data: MuJoCoData,
  model: MuJoCoModel,
): void {
  const qpos = data.qpos;
  const qvel = data.qvel;
  const ctrl = data.ctrl;

  // Pelvis quaternion (qpos[3..6] = w,x,y,z)
  const qw = qposVecGet(qpos, 3) ?? 1;
  const qx = qposVecGet(qpos, 4) ?? 0;
  const qy = qposVecGet(qpos, 5) ?? 0;
  const qz = qposVecGet(qpos, 6) ?? 0;

  // Extract pitch (forward/back tilt) and roll (side tilt) from quaternion
  // pitch = rotation around Y axis (MuJoCo frame)
  const sinPitch = 2 * (qw * qy - qz * qx);
  const pitch = Math.abs(sinPitch) >= 1
    ? Math.sign(sinPitch) * Math.PI / 2
    : Math.asin(sinPitch);
  // roll = rotation around X axis
  const sinRollCosPitch = 2 * (qw * qx + qy * qz);
  const cosRollCosPitch = 1 - 2 * (qx * qx + qy * qy);
  const roll = Math.atan2(sinRollCosPitch, cosRollCosPitch);

  // Angular velocity damping (qvel[3] = wx, qvel[4] = wy for floating base)
  const wx = qposVecGet(qvel, 3) ?? 0; // roll rate
  const wy = qposVecGet(qvel, 4) ?? 0; // pitch rate

  // PD corrections
  const pitchCorr = BAL.kpPitch * pitch + BAL.kdPitch * wy;
  const rollCorr  = BAL.kpRoll  * roll  + BAL.kdRoll  * wx;

  // Hip pitch: lean hips to shift CoM back over feet
  const hipPitchAdj = pitchCorr;
  const anklePitchAdj = -pitchCorr * BAL.ankleRatio;
  const hipRollAdj = rollCorr;
  const ankleRollAdj = -rollCorr * BAL.ankleRatio;

  // Read current user targets for legs
  const lhp = qposVecGet(ctrl, L_HIP_PITCH) ?? 0;
  const rhp = qposVecGet(ctrl, R_HIP_PITCH) ?? 0;
  const lhr = qposVecGet(ctrl, L_HIP_ROLL) ?? 0;
  const rhr = qposVecGet(ctrl, R_HIP_ROLL) ?? 0;
  const lap = qposVecGet(ctrl, L_ANKLE_PITCH) ?? 0;
  const rap = qposVecGet(ctrl, R_ANKLE_PITCH) ?? 0;
  const lar = qposVecGet(ctrl, L_ANKLE_ROLL) ?? 0;
  const rar = qposVecGet(ctrl, R_ANKLE_ROLL) ?? 0;
  const lk  = qposVecGet(ctrl, L_KNEE) ?? 0;
  const rk  = qposVecGet(ctrl, R_KNEE) ?? 0;

  // Apply corrections (additive to user targets)
  qposVecSet(ctrl, L_HIP_PITCH, lhp + hipPitchAdj);
  qposVecSet(ctrl, R_HIP_PITCH, rhp + hipPitchAdj);
  qposVecSet(ctrl, L_HIP_ROLL,  lhr + hipRollAdj);
  qposVecSet(ctrl, R_HIP_ROLL,  rhr + hipRollAdj);
  qposVecSet(ctrl, L_ANKLE_PITCH, lap + anklePitchAdj);
  qposVecSet(ctrl, R_ANKLE_PITCH, rap + anklePitchAdj);
  qposVecSet(ctrl, L_ANKLE_ROLL, lar + ankleRollAdj);
  qposVecSet(ctrl, R_ANKLE_ROLL, rar + ankleRollAdj);

  // Keep knees slightly bent for stability
  qposVecSet(ctrl, L_KNEE, Math.max(lk, BAL.kneeMin));
  qposVecSet(ctrl, R_KNEE, Math.max(rk, BAL.kneeMin));
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

      // Auto-balance: adjust leg ctrl to keep robot upright (only in freeStand mode).
      if (freeStandRef.current && autoBalanceRef.current) {
        applyAutoBalance(data, model);
      }

      for (let s = 0; s < PHYSICS_STEPS_PER_FRAME; s++) {
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
