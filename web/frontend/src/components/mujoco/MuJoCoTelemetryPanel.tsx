import { useEffect, useState, type RefObject } from "react";
import type { MuJoCoTelemetry, Vec3 } from "../../mujoco/mujocoTelemetry";
import { G1_END_EFFECTORS } from "../../mujoco/mujocoIK";
import "./MuJoCoTelemetryPanel.css";

const REFRESH_HZ = 10; // UI update rate (doesn't affect simulation)

function fmt(v: number, digits = 2): string {
  return v.toFixed(digits);
}

function Vec3Row({ label, v, unit = "" }: { label: string; v: Vec3; unit?: string }) {
  return (
    <div className="telem-row">
      <span className="telem-label">{label}</span>
      <span className="telem-val">{fmt(v.x)}</span>
      <span className="telem-val">{fmt(v.y)}</span>
      <span className="telem-val">{fmt(v.z)}</span>
      {unit && <span className="telem-unit">{unit}</span>}
    </div>
  );
}

function ScalarRow({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  return (
    <div className="telem-row">
      <span className="telem-label">{label}</span>
      <span className="telem-val telem-val--wide">{fmt(value)}</span>
      {unit && <span className="telem-unit">{unit}</span>}
    </div>
  );
}

function ContactBar({ label, active, force }: { label: string; active: boolean; force: number }) {
  return (
    <div className="telem-contact">
      <span className={`telem-contact-dot${active ? " telem-contact-dot--on" : ""}`} />
      <span className="telem-label">{label}</span>
      <span className="telem-val telem-val--wide">{fmt(force, 0)} N</span>
    </div>
  );
}

function ForceBar({ name, force, maxForce }: { name: string; force: number; maxForce: number }) {
  const pct = maxForce > 0 ? Math.min(100, (Math.abs(force) / maxForce) * 100) : 0;
  const hue = Math.max(0, 120 - pct * 1.2); // green→red
  return (
    <div className="telem-force-row">
      <span className="telem-force-name">{name}</span>
      <div className="telem-force-bar-bg">
        <div
          className="telem-force-bar-fill"
          style={{ width: `${pct}%`, background: `hsl(${hue}, 80%, 55%)` }}
        />
      </div>
      <span className="telem-force-val">{fmt(force, 1)}</span>
    </div>
  );
}

export default function MuJoCoTelemetryPanel({
  telemetryRef,
  onPushRobot,
  keyframes,
  onSaveKeyframe,
  onRestoreKeyframe,
  onDeleteKeyframe,
  onIKSolve,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  inverseDynForces,
  onComputeInverseDyn,
}: {
  telemetryRef: RefObject<MuJoCoTelemetry>;
  onPushRobot?: (direction: "forward" | "backward" | "left" | "right") => void;
  keyframes?: { id: string; label: string; simTime: number }[];
  onSaveKeyframe?: () => void;
  onRestoreKeyframe?: (id: string) => void;
  onDeleteKeyframe?: (id: string) => void;
  onIKSolve?: (endEffectorName: string, offset: [number, number, number]) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  inverseDynForces?: number[] | null;
  onComputeInverseDyn?: () => void;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000 / REFRESH_HZ);
    return () => clearInterval(id);
  }, []);

  const t = telemetryRef.current;
  if (!t) return null;

  // Show only top 6 actuator forces to save space
  const topForces = t.actuators.forces
    .map((f, i) => ({ name: t.actuators.names[i] ?? `act_${i}`, force: f }))
    .sort((a, b) => Math.abs(b.force) - Math.abs(a.force))
    .slice(0, 6);

  // Suppress unused variable warning
  void tick;

  return (
    <div className="telem-panel">
      {/* ── IMU Sensors ── */}
      <details className="telem-section" open>
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          IMU Sensors
        </summary>
        <div className="telem-section-body">
          <div className="telem-sub-title">Torso</div>
          <Vec3Row label="Gyro" v={t.imu.torsoGyro} unit="rad/s" />
          <Vec3Row label="Accel" v={t.imu.torsoAccel} unit="m/s²" />
          <div className="telem-sub-title">Pelvis</div>
          <Vec3Row label="Gyro" v={t.imu.pelvisGyro} unit="rad/s" />
          <Vec3Row label="Accel" v={t.imu.pelvisAccel} unit="m/s²" />
        </div>
      </details>

      {/* ── Pelvis State ── */}
      <details className="telem-section" open>
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Pelvis State
        </summary>
        <div className="telem-section-body">
          <ScalarRow label="Height" value={t.pelvis.height} unit="m" />
          <ScalarRow label="Pitch" value={t.pelvis.euler.pitch} unit="°" />
          <ScalarRow label="Roll" value={t.pelvis.euler.roll} unit="°" />
          <ScalarRow label="Yaw" value={t.pelvis.euler.yaw} unit="°" />
          <Vec3Row label="LinVel" v={t.pelvis.linVel} unit="m/s" />
          <Vec3Row label="AngVel" v={t.pelvis.angVel} unit="rad/s" />
          {t.fallen && (
            <div className="telem-alert">⚠ FALLEN</div>
          )}
        </div>
      </details>

      {/* ── Ground Contact ── */}
      <details className="telem-section" open>
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 20h20"/>
            <path d="M12 16V4"/>
            <path d="M8 8l4-4 4 4"/>
          </svg>
          Ground Contact
        </summary>
        <div className="telem-section-body">
          <ScalarRow label="Total" value={t.contacts.ncon} />
          <ContactBar label="Left Foot" active={t.contacts.leftFootContacts > 0} force={t.contacts.leftFootForce} />
          <ContactBar label="Right Foot" active={t.contacts.rightFootContacts > 0} force={t.contacts.rightFootForce} />
        </div>
      </details>

      {/* ── Center of Mass ── */}
      <details className="telem-section">
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
          Center of Mass
        </summary>
        <div className="telem-section-body">
          <Vec3Row label="Position" v={t.com.pos} unit="m" />
          <ScalarRow label="Ground X" value={t.com.groundProjection.x} unit="m" />
          <ScalarRow label="Ground Z" value={t.com.groundProjection.z} unit="m" />
        </div>
      </details>

      {/* ── Energy ── */}
      <details className="telem-section">
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Energy
        </summary>
        <div className="telem-section-body">
          <ScalarRow label="Kinetic" value={t.energy.kinetic} unit="J" />
          <ScalarRow label="Potential" value={t.energy.potential} unit="J" />
          <ScalarRow label="Total" value={t.energy.total} unit="J" />
        </div>
      </details>

      {/* ── Actuator Forces ── */}
      <details className="telem-section">
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
          </svg>
          Actuator Forces (Top 6)
        </summary>
        <div className="telem-section-body">
          <ScalarRow label="Max" value={t.actuators.maxForce} unit="N" />
          {topForces.map((af) => (
            <ForceBar key={af.name} name={af.name} force={af.force} maxForce={t.actuators.maxForce || 1} />
          ))}
        </div>
      </details>

      {/* ── Physics Settings ── */}
      <details className="telem-section">
        <summary className="telem-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Physics
        </summary>
        <div className="telem-section-body">
          <ScalarRow label="Timestep" value={t.physics.timestep * 1000} unit="ms" />
          <ScalarRow label="Gravity Z" value={t.physics.gravity.z} unit="m/s²" />
          <ScalarRow label="Iterations" value={t.physics.iterations} />
          <ScalarRow label="Sim Time" value={t.simTime} unit="s" />
        </div>
      </details>

      {/* ── State Keyframes ── */}
      {onSaveKeyframe && (
        <details className="telem-section" open>
          <summary className="telem-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            State Keyframes
          </summary>
          <div className="telem-section-body">
            <button
              className="telem-push-btn"
              style={{ width: "100%", height: "28px", fontSize: "0.7rem", gap: "4px" }}
              onClick={onSaveKeyframe}
              title="Save current physics state"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Save State
            </button>
            {keyframes && keyframes.length > 0 && (
              <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                {keyframes.map((kf) => (
                  <div key={kf.id} className="telem-kf-row">
                    <span className="telem-kf-label">{kf.label}</span>
                    <span className="telem-kf-time">{fmt(kf.simTime)}s</span>
                    <button
                      className="telem-kf-btn"
                      onClick={() => onRestoreKeyframe?.(kf.id)}
                      title="Restore state"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                      </svg>
                    </button>
                    <button
                      className="telem-kf-btn telem-kf-btn--del"
                      onClick={() => onDeleteKeyframe?.(kf.id)}
                      title="Delete"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {/* ── Inverse Kinematics ── */}
      {onIKSolve && (
        <details className="telem-section">
          <summary className="telem-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
              <path d="M6 21V9a9 9 0 009 9"/>
            </svg>
            Inverse Kinematics
          </summary>
          <div className="telem-section-body">
            <div style={{ fontSize: "0.65rem", color: "#64748b", marginBottom: "4px" }}>
              Move end-effector by offset (m)
            </div>
            {G1_END_EFFECTORS.map((ee) => (
              <div key={ee.bodyName} className="telem-ik-row">
                <span className="telem-label" style={{ flex: "0 0 70px" }}>{ee.name}</span>
                <button className="telem-kf-btn" onClick={() => onIKSolve(ee.bodyName, [0.05, 0, 0])} title="+X">+X</button>
                <button className="telem-kf-btn" onClick={() => onIKSolve(ee.bodyName, [-0.05, 0, 0])} title="-X">-X</button>
                <button className="telem-kf-btn" onClick={() => onIKSolve(ee.bodyName, [0, 0.05, 0])} title="+Y">+Y</button>
                <button className="telem-kf-btn" onClick={() => onIKSolve(ee.bodyName, [0, -0.05, 0])} title="-Y">-Y</button>
                <button className="telem-kf-btn" onClick={() => onIKSolve(ee.bodyName, [0, 0, 0.05])} title="+Z">+Z</button>
                <button className="telem-kf-btn" onClick={() => onIKSolve(ee.bodyName, [0, 0, -0.05])} title="-Z">-Z</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Perturbation Buttons ── */}
      {onPushRobot && (
        <div className="telem-section telem-perturb">
          <div className="telem-section-title" style={{ cursor: "default" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
            </svg>
            Push Robot
          </div>
          <div className="telem-perturb-grid">
            <button className="telem-push-btn" onClick={() => onPushRobot("forward")} title="Push Forward">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
            <button className="telem-push-btn" onClick={() => onPushRobot("left")} title="Push Left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <button className="telem-push-btn" onClick={() => onPushRobot("backward")} title="Push Backward">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </button>
            <button className="telem-push-btn" onClick={() => onPushRobot("right")} title="Push Right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Undo / Redo ── */}
      {(onUndo || onRedo) && (
        <div className="telem-section" style={{ background: "none", border: "none" }}>
          <div style={{ display: "flex", gap: "4px", padding: "4px 10px" }}>
            <button
              className="telem-push-btn"
              style={{ flex: 1, height: "28px", fontSize: "0.68rem", gap: "4px", opacity: canUndo ? 1 : 0.35 }}
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              Undo
            </button>
            <button
              className="telem-push-btn"
              style={{ flex: 1, height: "28px", fontSize: "0.68rem", gap: "4px", opacity: canRedo ? 1 : 0.35 }}
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10"/>
              </svg>
              Redo
            </button>
          </div>
        </div>
      )}

      {/* ── Inverse Dynamics ── */}
      {onComputeInverseDyn && (
        <details className="telem-section">
          <summary className="telem-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h6l3-9 6 18 3-9h4"/>
            </svg>
            Inverse Dynamics
          </summary>
          <div className="telem-section-body">
            <button
              className="telem-push-btn"
              style={{ width: "100%", height: "28px", fontSize: "0.7rem", gap: "4px" }}
              onClick={onComputeInverseDyn}
            >
              Compute Required Forces
            </button>
            {inverseDynForces && (
              <div style={{ marginTop: "4px", maxHeight: "120px", overflowY: "auto" }}>
                {inverseDynForces.slice(6).map((f, i) => (
                  <div key={i} className="telem-row">
                    <span className="telem-label" style={{ flex: "0 0 80px", fontSize: "0.6rem" }}>
                      DOF {i + 6}
                    </span>
                    <span className="telem-val telem-val--wide">{fmt(f, 1)}</span>
                    <span className="telem-unit">N·m</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
