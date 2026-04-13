import { LIVE_MODE_CORE_LANDMARK_IDS, LIVE_MODE_LANDMARK_COUNT } from "./liveContracts";

export type Landmark3D = [number, number, number];

export function normalizeLandmarks(landmarks: number[][]): Landmark3D[] | null {
  if (!Array.isArray(landmarks) || landmarks.length !== LIVE_MODE_LANDMARK_COUNT) return null;
  const cast = landmarks.map((row) => [Number(row[0]), Number(row[1]), Number(row[2] ?? 0)] as Landmark3D);
  if (cast.some((row) => row.some((v) => !Number.isFinite(v)))) return null;

  const lHip = cast[LIVE_MODE_CORE_LANDMARK_IDS.leftHip];
  const rHip = cast[LIVE_MODE_CORE_LANDMARK_IDS.rightHip];
  const lShoulder = cast[LIVE_MODE_CORE_LANDMARK_IDS.leftShoulder];
  const rShoulder = cast[LIVE_MODE_CORE_LANDMARK_IDS.rightShoulder];
  if (!lHip || !rHip || !lShoulder || !rShoulder) return null;

  const hipCenter: Landmark3D = [
    (lHip[0] + rHip[0]) / 2,
    (lHip[1] + rHip[1]) / 2,
    (lHip[2] + rHip[2]) / 2,
  ];
  const shoulderCenter: Landmark3D = [
    (lShoulder[0] + rShoulder[0]) / 2,
    (lShoulder[1] + rShoulder[1]) / 2,
    (lShoulder[2] + rShoulder[2]) / 2,
  ];

  const torsoDx = shoulderCenter[0] - hipCenter[0];
  const torsoDy = shoulderCenter[1] - hipCenter[1];
  const torsoDz = shoulderCenter[2] - hipCenter[2];
  const torsoLen = Math.hypot(torsoDx, torsoDy, torsoDz);
  const scale = torsoLen > 1e-6 ? 1 / torsoLen : 1;

  return cast.map((row) => [
    (row[0] - hipCenter[0]) * scale,
    (row[1] - hipCenter[1]) * scale,
    (row[2] - hipCenter[2]) * scale,
  ]);
}
