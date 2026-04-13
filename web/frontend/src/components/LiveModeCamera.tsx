import type { RefObject } from "react";
import type { Landmark3D } from "../lib/poseNormalize";

type LiveModeCameraProps = {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  landmarks: Landmark3D[] | null;
  confidence: number;
  fps: number;
  title: string;
};

const CONNECTIONS: Array<[number, number]> = [
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

export function LiveModeCamera({
  videoRef,
  canvasRef,
  landmarks,
  confidence,
  fps,
  title,
}: LiveModeCameraProps) {
  return (
    <div className="motion-capture-preview-wrap">
      <video ref={videoRef} className="motion-capture-source-video" autoPlay playsInline muted aria-hidden />
      <canvas ref={canvasRef} className="motion-capture-preview-canvas" width={640} height={480} aria-label={title} />
      {landmarks && (
        <svg className="live-mode-overlay" viewBox="0 0 640 480" aria-hidden>
          {CONNECTIONS.map(([a, b]) => {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            if (!p1 || !p2) return null;
            const x1 = (p1[0] * 0.5 + 0.5) * 640;
            const y1 = (p1[1] * 0.5 + 0.5) * 480;
            const x2 = (p2[0] * 0.5 + 0.5) * 640;
            const y2 = (p2[1] * 0.5 + 0.5) * 480;
            return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </svg>
      )}
      <div className="live-mode-stats">
        <span>FPS {fps.toFixed(0)}</span>
        <span>Conf {(confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
