/**
 * MuJoCo Telemetry — real-time physics data extracted from MuJoCo simulation.
 *
 * Sensors defined in g1.xml:
 *   0-2: imu-torso-angular-velocity  (gyro, 3D)
 *   3-5: imu-torso-linear-acceleration (accel, 3D)
 *   6-8: imu-pelvis-angular-velocity  (gyro, 3D)
 *   9-11: imu-pelvis-linear-acceleration (accel, 3D)
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface IMUSensorData {
  /** Torso gyroscope — angular velocity (rad/s) */
  torsoGyro: Vec3;
  /** Torso accelerometer — linear accel (m/s²) */
  torsoAccel: Vec3;
  /** Pelvis gyroscope — angular velocity (rad/s) */
  pelvisGyro: Vec3;
  /** Pelvis accelerometer — linear accel (m/s²) */
  pelvisAccel: Vec3;
}

export interface ContactInfo {
  /** Total number of active contacts */
  ncon: number;
  /** Number of left foot contacts (geoms containing "left" in body) */
  leftFootContacts: number;
  /** Number of right foot contacts */
  rightFootContacts: number;
  /** Total contact force magnitude on left foot (N) */
  leftFootForce: number;
  /** Total contact force magnitude on right foot (N) */
  rightFootForce: number;
}

export interface PelvisState {
  /** Position (m) */
  pos: Vec3;
  /** Orientation quaternion */
  quat: { w: number; x: number; y: number; z: number };
  /** Euler angles (deg) computed from quat */
  euler: { pitch: number; roll: number; yaw: number };
  /** Linear velocity (m/s) */
  linVel: Vec3;
  /** Angular velocity (rad/s) */
  angVel: Vec3;
  /** Height above ground (m) */
  height: number;
}

export interface CenterOfMass {
  /** Whole-body CoM position (m) */
  pos: Vec3;
  /** CoM projected to ground plane — for stability analysis */
  groundProjection: { x: number; z: number };
}

export interface EnergyInfo {
  /** Potential energy (J) — from data.energy[0] */
  potential: number;
  /** Kinetic energy (J) — from data.energy[1] */
  kinetic: number;
  /** Total energy (J) */
  total: number;
}

export interface ActuatorInfo {
  /** Actuator forces — indexed by actuator id */
  forces: number[];
  /** Max absolute force across all actuators */
  maxForce: number;
  /** Actuator names for display */
  names: string[];
}

export interface PhysicsSettings {
  /** Simulation timestep (s) */
  timestep: number;
  /** Gravity vector (m/s²) */
  gravity: Vec3;
  /** Number of solver iterations */
  iterations: number;
}

export interface MuJoCoTelemetry {
  /** IMU sensor readings from data.sensordata */
  imu: IMUSensorData;
  /** Contact info — feet on ground */
  contacts: ContactInfo;
  /** Pelvis (floating base) state */
  pelvis: PelvisState;
  /** Center of mass */
  com: CenterOfMass;
  /** Energy (kinetic + potential) */
  energy: EnergyInfo;
  /** Actuator forces */
  actuators: ActuatorInfo;
  /** Physics settings */
  physics: PhysicsSettings;
  /** Simulation time (s) */
  simTime: number;
  /** Whether robot has fallen */
  fallen: boolean;
}

/** Zero-initialized telemetry for initial state */
export function createEmptyTelemetry(): MuJoCoTelemetry {
  const v0: Vec3 = { x: 0, y: 0, z: 0 };
  return {
    imu: {
      torsoGyro: { ...v0 },
      torsoAccel: { ...v0 },
      pelvisGyro: { ...v0 },
      pelvisAccel: { ...v0 },
    },
    contacts: {
      ncon: 0,
      leftFootContacts: 0,
      rightFootContacts: 0,
      leftFootForce: 0,
      rightFootForce: 0,
    },
    pelvis: {
      pos: { ...v0 },
      quat: { w: 1, x: 0, y: 0, z: 0 },
      euler: { pitch: 0, roll: 0, yaw: 0 },
      linVel: { ...v0 },
      angVel: { ...v0 },
      height: 0.793,
    },
    com: {
      pos: { ...v0 },
      groundProjection: { x: 0, z: 0 },
    },
    energy: { potential: 0, kinetic: 0, total: 0 },
    actuators: { forces: [], maxForce: 0, names: [] },
    physics: { timestep: 0.002, gravity: { x: 0, y: 0, z: -9.81 }, iterations: 100 },
    simTime: 0,
    fallen: false,
  };
}
