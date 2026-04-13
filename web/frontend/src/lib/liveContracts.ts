export const LIVE_MODE_WS_MESSAGE_TYPES = {
  ping: "ping",
  pong: "pong",
  pose: "pose",
  recordingStarted: "recording_started",
  recordingStopped: "recording_stopped",
} as const;

export const LIVE_MODE_DEFAULTS = {
  cameraWidth: 640,
  cameraHeight: 480,
  captureFps: 15,
  retargetFps: 10,
  calibrationSeconds: 3,
  retargetSmoothingAlpha: 0.6,
} as const;

export type LiveModeSource = "ws_pose" | "local_mediapipe" | "none";

export const LIVE_MODE_LANDMARK_COUNT = 33;
export const LIVE_MODE_CORE_LANDMARK_IDS = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;
