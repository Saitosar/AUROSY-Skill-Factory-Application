/**
 * Jacobian-based Inverse Kinematics for MuJoCo WASM.
 *
 * Uses mj_jacBody to compute the body Jacobian, then solves a
 * damped least-squares IK step: dq = J^T (J J^T + λ²I)^{-1} dx
 *
 * For the WASM build we implement a simplified version that uses
 * the pseudo-inverse via the transpose (J^T · dx) with step-size
 * clamping — robust and good enough for interactive dragging.
 */
import { qposVecGet, qposVecSet } from "./qposToSkillAngles";

export interface IKTarget {
  bodyId: number;
  targetPos: [number, number, number]; // world-frame target position
}

export interface IKOptions {
  maxIter?: number;
  tolerance?: number; // meters
  stepSize?: number; // learning rate
  damping?: number; // damped least-squares λ
  jointLimits?: boolean;
}

const DEFAULT_OPTS: Required<IKOptions> = {
  maxIter: 50,
  tolerance: 0.001,
  stepSize: 0.3,
  damping: 0.05,
  jointLimits: true,
};

/**
 * Compute one IK solve: moves qpos so that `bodyId`'s xpos
 * approaches `targetPos`. Mutates data.qpos in-place and calls
 * mj_forward after convergence.
 *
 * Returns residual distance.
 */
export function solveIK(
  mujoco: unknown,
  model: unknown,
  data: unknown,
  target: IKTarget,
  opts?: IKOptions
): number {
  const o = { ...DEFAULT_OPTS, ...opts };
  const mj = mujoco as {
    mj_forward: (m: unknown, d: unknown) => void;
    mj_jacBody?: (m: unknown, d: unknown, jacp: Float64Array, jacr: Float64Array, body: number) => void;
    mj_jac?: (m: unknown, d: unknown, jacp: Float64Array, jacr: Float64Array, point: Float64Array, body: number) => void;
  };
  const m = model as { nv: number; nq: number; jnt_range?: Float64Array; jnt_limited?: Uint8Array; njnt?: number };
  const d = data as { qpos: unknown; xpos: Float64Array };
  const nv = m.nv;

  // Check if mj_jacBody is available in the WASM build
  const hasJacBody = typeof mj.mj_jacBody === "function";
  if (!hasJacBody) {
    // Fallback: no Jacobian available, use numerical differentiation
    return solveIKNumerical(mj, m, d, target, o);
  }

  const jacp = new Float64Array(3 * nv); // 3×nv position Jacobian
  const jacr = new Float64Array(3 * nv); // 3×nv rotation Jacobian (unused)

  let residual = Infinity;

  for (let iter = 0; iter < o.maxIter; iter++) {
    // Forward kinematics to get current body position
    mj.mj_forward(model, data);

    // Current body position
    const bx = d.xpos[target.bodyId * 3 + 0];
    const by = d.xpos[target.bodyId * 3 + 1];
    const bz = d.xpos[target.bodyId * 3 + 2];

    // Error vector
    const dx = target.targetPos[0] - bx;
    const dy = target.targetPos[1] - by;
    const dz = target.targetPos[2] - bz;
    residual = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (residual < o.tolerance) break;

    // Compute Jacobian
    jacp.fill(0);
    jacr.fill(0);
    mj.mj_jacBody!(model, data, jacp, jacr, target.bodyId);

    // Damped transpose: dq = α · J^T · dx / (||J·J^T·dx|| + λ²)
    // Simplified to: dq_i = stepSize * (J[0,i]*dx + J[1,i]*dy + J[2,i]*dz)
    const qpos = d.qpos;
    // Skip first 7 DOFs (floating base) — only actuated joints
    const startDof = 6;

    for (let i = startDof; i < nv; i++) {
      const jx = jacp[0 * nv + i]; // dpos_x / dq_i
      const jy = jacp[1 * nv + i]; // dpos_y / dq_i
      const jz = jacp[2 * nv + i]; // dpos_z / dq_i

      let dq = o.stepSize * (jx * dx + jy * dy + jz * dz);

      // Damping
      const jmag = jx * jx + jy * jy + jz * jz;
      if (jmag > 0) {
        dq /= (jmag + o.damping * o.damping);
        dq *= jmag; // scale by relevance
      }

      // Clamp step
      const maxStep = 0.1; // radians per iteration
      dq = Math.max(-maxStep, Math.min(maxStep, dq));

      // qpos index = i + 1 (due to 7-DOF floating base using 7 qpos for 6 DOF)
      const qIdx = i + 1; // nq = nv + 1 for free joint
      const current = qposVecGet(qpos, qIdx) ?? 0;
      qposVecSet(qpos, qIdx, current + dq);
    }
  }

  // Final forward pass
  mj.mj_forward(model, data);
  return residual;
}

/**
 * Fallback numerical IK when mj_jacBody is unavailable.
 * Uses finite differences to estimate the Jacobian.
 */
function solveIKNumerical(
  mj: { mj_forward: (m: unknown, d: unknown) => void },
  m: { nv: number; nq: number },
  d: { qpos: unknown; xpos: Float64Array },
  target: IKTarget,
  o: Required<IKOptions>
): number {
  const eps = 1e-4;
  const startQIdx = 7; // skip floating base qpos
  const numJoints = m.nq - 7;
  let residual = Infinity;

  for (let iter = 0; iter < o.maxIter; iter++) {
    mj.mj_forward(m, d);

    const bx = d.xpos[target.bodyId * 3 + 0];
    const by = d.xpos[target.bodyId * 3 + 1];
    const bz = d.xpos[target.bodyId * 3 + 2];

    const dx = target.targetPos[0] - bx;
    const dy = target.targetPos[1] - by;
    const dz = target.targetPos[2] - bz;
    residual = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (residual < o.tolerance) break;

    for (let j = 0; j < numJoints; j++) {
      const qIdx = startQIdx + j;
      const orig = qposVecGet(d.qpos, qIdx) ?? 0;

      // Perturb +eps
      qposVecSet(d.qpos, qIdx, orig + eps);
      mj.mj_forward(m, d);
      const px = d.xpos[target.bodyId * 3 + 0];
      const py = d.xpos[target.bodyId * 3 + 1];
      const pz = d.xpos[target.bodyId * 3 + 2];

      // Restore
      qposVecSet(d.qpos, qIdx, orig);

      // Finite difference Jacobian column
      const jx = (px - bx) / eps;
      const jy = (py - by) / eps;
      const jz = (pz - bz) / eps;

      let dq = o.stepSize * (jx * dx + jy * dy + jz * dz);
      const jmag = jx * jx + jy * jy + jz * jz;
      if (jmag > 0) {
        dq /= (jmag + o.damping * o.damping);
        dq *= jmag;
      }
      dq = Math.max(-0.05, Math.min(0.05, dq));

      qposVecSet(d.qpos, qIdx, orig + dq);
    }
  }

  mj.mj_forward(m, d);
  return residual;
}

/**
 * End-effector body names for G1 robot.
 */
export const G1_END_EFFECTORS = [
  { name: "Left Hand", bodyName: "left_palm_link" },
  { name: "Right Hand", bodyName: "right_palm_link" },
  { name: "Left Foot", bodyName: "left_ankle_roll_link" },
  { name: "Right Foot", bodyName: "right_ankle_roll_link" },
] as const;

/**
 * Resolve body ID by name.
 */
export function resolveBodyId(mujoco: unknown, model: unknown, bodyName: string): number {
  try {
    const mj = mujoco as { mj_name2id: (m: unknown, type: number, name: string) => number };
    return mj.mj_name2id(model, 1 /* mjOBJ_BODY */, bodyName);
  } catch {
    return -1;
  }
}
