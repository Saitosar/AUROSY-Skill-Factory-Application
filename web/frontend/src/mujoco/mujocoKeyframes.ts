/**
 * MuJoCo physics state keyframes — save/restore full simulation state
 * (joint positions + velocities + actuator commands).
 */
import { qposVecGet, qposVecSet } from "./qposToSkillAngles";

export interface MuJoCoKeyframe {
  id: string;
  label: string;
  timestamp: number; // Date.now()
  simTime: number;
  qpos: number[];
  qvel: number[];
  ctrl: number[];
}

export function captureKeyframe(
  model: { nq: number; nv: number; nu: number },
  data: { qpos: unknown; qvel: unknown; ctrl: unknown; time?: number },
  label: string
): MuJoCoKeyframe {
  const qpos: number[] = [];
  const qvel: number[] = [];
  const ctrl: number[] = [];

  for (let i = 0; i < model.nq; i++) qpos.push(qposVecGet(data.qpos, i) ?? 0);
  for (let i = 0; i < model.nv; i++) qvel.push(qposVecGet(data.qvel, i) ?? 0);
  for (let i = 0; i < model.nu; i++) ctrl.push(qposVecGet(data.ctrl, i) ?? 0);

  return {
    id: crypto.randomUUID(),
    label,
    timestamp: Date.now(),
    simTime: (data as { time?: number }).time ?? 0,
    qpos,
    qvel,
    ctrl,
  };
}

export function restoreKeyframe(
  model: { nq: number; nv: number; nu: number },
  data: { qpos: unknown; qvel: unknown; ctrl: unknown },
  mujoco: { mj_forward: (m: unknown, d: unknown) => void },
  modelRef: unknown,
  kf: MuJoCoKeyframe
): void {
  const { qpos, qvel, ctrl } = data;
  for (let i = 0; i < Math.min(kf.qpos.length, model.nq); i++) qposVecSet(qpos, i, kf.qpos[i]);
  for (let i = 0; i < Math.min(kf.qvel.length, model.nv); i++) qposVecSet(qvel, i, kf.qvel[i]);
  for (let i = 0; i < Math.min(kf.ctrl.length, model.nu); i++) qposVecSet(ctrl, i, kf.ctrl[i]);

  // Recompute forward kinematics after restoring state
  mujoco.mj_forward(modelRef, data);
}

const STORAGE_KEY = "mujoco-keyframes";
const MAX_KEYFRAMES = 10;

export function loadKeyframesFromStorage(): MuJoCoKeyframe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveKeyframesToStorage(kfs: MuJoCoKeyframe[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kfs.slice(-MAX_KEYFRAMES)));
  } catch { /* quota exceeded */ }
}
