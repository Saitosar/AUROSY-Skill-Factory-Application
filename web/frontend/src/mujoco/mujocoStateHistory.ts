/**
 * State undo/redo stack for MuJoCo simulation.
 * Stores snapshots of qpos + qvel + ctrl as a ring buffer.
 */
import { qposVecGet, qposVecSet } from "./qposToSkillAngles";

interface StateSnapshot {
  qpos: number[];
  qvel: number[];
  ctrl: number[];
}

export class MuJoCoStateHistory {
  private stack: StateSnapshot[] = [];
  private pointer = -1;
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /** Capture current state onto the stack (discards redo history). */
  push(
    model: { nq: number; nv: number; nu: number },
    data: { qpos: unknown; qvel: unknown; ctrl: unknown }
  ): void {
    const snap: StateSnapshot = { qpos: [], qvel: [], ctrl: [] };
    for (let i = 0; i < model.nq; i++) snap.qpos.push(qposVecGet(data.qpos, i) ?? 0);
    for (let i = 0; i < model.nv; i++) snap.qvel.push(qposVecGet(data.qvel, i) ?? 0);
    for (let i = 0; i < model.nu; i++) snap.ctrl.push(qposVecGet(data.ctrl, i) ?? 0);

    // Discard anything after current pointer (redo history)
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(snap);

    // Trim to max size
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
    this.pointer = this.stack.length - 1;
  }

  /** Restore state at pointer - 1. Returns true if undo was performed. */
  undo(
    model: { nq: number; nv: number; nu: number },
    data: { qpos: unknown; qvel: unknown; ctrl: unknown },
    mj: { mj_forward: (m: unknown, d: unknown) => void },
    modelRef: unknown
  ): boolean {
    if (this.pointer <= 0) return false;
    this.pointer--;
    this._restore(model, data, this.stack[this.pointer]);
    mj.mj_forward(modelRef, data);
    return true;
  }

  /** Restore state at pointer + 1. Returns true if redo was performed. */
  redo(
    model: { nq: number; nv: number; nu: number },
    data: { qpos: unknown; qvel: unknown; ctrl: unknown },
    mj: { mj_forward: (m: unknown, d: unknown) => void },
    modelRef: unknown
  ): boolean {
    if (this.pointer >= this.stack.length - 1) return false;
    this.pointer++;
    this._restore(model, data, this.stack[this.pointer]);
    mj.mj_forward(modelRef, data);
    return true;
  }

  get canUndo(): boolean {
    return this.pointer > 0;
  }

  get canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  get size(): number {
    return this.stack.length;
  }

  get currentIndex(): number {
    return this.pointer;
  }

  private _restore(
    model: { nq: number; nv: number; nu: number },
    data: { qpos: unknown; qvel: unknown; ctrl: unknown },
    snap: StateSnapshot
  ): void {
    for (let i = 0; i < Math.min(snap.qpos.length, model.nq); i++)
      qposVecSet(data.qpos, i, snap.qpos[i]);
    for (let i = 0; i < Math.min(snap.qvel.length, model.nv); i++)
      qposVecSet(data.qvel, i, snap.qvel[i]);
    for (let i = 0; i < Math.min(snap.ctrl.length, model.nu); i++)
      qposVecSet(data.ctrl, i, snap.ctrl[i]);
  }
}

/**
 * Inverse dynamics: compute the forces/torques needed to produce
 * the current acceleration (qacc) given current state.
 *
 * Uses mj_inverse if available in WASM build.
 * Returns array of generalized forces (qfrc_inverse).
 */
export function computeInverseDynamics(
  mujoco: unknown,
  model: unknown,
  data: unknown
): number[] | null {
  const mj = mujoco as {
    mj_inverse?: (m: unknown, d: unknown) => void;
  };
  const m = model as { nv: number };
  const d = data as { qfrc_inverse?: unknown };

  if (typeof mj.mj_inverse !== "function") return null;

  try {
    mj.mj_inverse(model, data);
    const forces: number[] = [];
    if (d.qfrc_inverse) {
      for (let i = 0; i < m.nv; i++) {
        forces.push(qposVecGet(d.qfrc_inverse, i) ?? 0);
      }
    }
    return forces.length > 0 ? forces : null;
  } catch {
    return null;
  }
}
