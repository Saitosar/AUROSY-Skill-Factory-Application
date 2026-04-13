import { useEffect, useState } from "react";
import { LIVE_MODE_DEFAULTS } from "../lib/liveContracts";

type LiveCalibrationProps = {
  active: boolean;
  onComplete: () => void;
};

export function LiveCalibration({ active, onComplete }: LiveCalibrationProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(LIVE_MODE_DEFAULTS.calibrationSeconds);

  useEffect(() => {
    if (!active) return;
    setSecondsLeft(LIVE_MODE_DEFAULTS.calibrationSeconds);
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, onComplete]);

  if (!active) return null;
  return (
    <div className="live-calibration-overlay" role="status" aria-live="polite">
      <div className="live-calibration-card">
        <p className="live-calibration-title">T-pose calibration</p>
        <p className="live-calibration-countdown">{secondsLeft}</p>
      </div>
    </div>
  );
}
