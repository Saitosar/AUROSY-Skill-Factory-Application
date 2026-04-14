import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MotionValidationReport, MotionValidationIssue } from "../api/client";

type IssueSummary = {
  code: string;
  severity: string;
  count: number;
  frames: number[];
  motors: number[];
  firstMessage: string;
};

function summarizeIssues(issues: MotionValidationIssue[]): IssueSummary[] {
  const byCode = new Map<string, IssueSummary>();

  for (const issue of issues) {
    const existing = byCode.get(issue.code);
    if (existing) {
      existing.count++;
      if (issue.frame_index != null && !existing.frames.includes(issue.frame_index)) {
        existing.frames.push(issue.frame_index);
      }
      if (issue.motor_index != null && !existing.motors.includes(issue.motor_index)) {
        existing.motors.push(issue.motor_index);
      }
    } else {
      byCode.set(issue.code, {
        code: issue.code,
        severity: issue.severity,
        count: 1,
        frames: issue.frame_index != null ? [issue.frame_index] : [],
        motors: issue.motor_index != null ? [issue.motor_index] : [],
        firstMessage: issue.message,
      });
    }
  }

  return Array.from(byCode.values()).sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "error" ? -1 : 1;
    }
    return b.count - a.count;
  });
}

const MOTION_ISSUE_DESCRIPTIONS: Record<string, { label: string; suggestion: string }> = {
  JOINT_LIMIT_EXCEEDED: {
    label: "Joint limit exceeded",
    suggestion: "Reduce the range of motion or adjust the retargeting to stay within joint limits.",
  },
  SELF_COLLISION: {
    label: "Self-collision detected",
    suggestion: "Modify the pose to prevent body parts from colliding.",
  },
  VELOCITY_LIMIT_EXCEEDED: {
    label: "Velocity too high",
    suggestion: "Slow down the motion or increase transition times between keyframes.",
  },
  TORQUE_LIMIT_EXCEEDED: {
    label: "Torque limit exceeded",
    suggestion: "The motion requires too much force. Simplify the movement or reduce load.",
  },
  BALANCE_RISK: {
    label: "Balance risk detected",
    suggestion: "The center of mass may be outside the support polygon. Adjust weight distribution.",
  },
  JERK_TOO_HIGH: {
    label: "Motion jerk too high",
    suggestion: "Add smoother transitions between poses to reduce sudden acceleration changes.",
  },
  LOW_CONFIDENCE_FRAME: {
    label: "Low pose confidence",
    suggestion: "The pose estimation has low confidence. Consider excluding this frame or reviewing the source video.",
  },
  MISSING_LANDMARKS: {
    label: "Missing pose landmarks",
    suggestion: "Some body points could not be detected. Check if the person is fully visible in the video.",
  },
  FALL_DETECTED: {
    label: "Fall detected in simulation",
    suggestion: "The robot would fall during this motion. Add stability corrections or simplify the movement.",
  },
};

function getIssueDescription(code: string): { label: string; suggestion: string } {
  return MOTION_ISSUE_DESCRIPTIONS[code] ?? {
    label: code.replace(/_/g, " ").toLowerCase(),
    suggestion: "Review this issue and adjust the motion accordingly.",
  };
}

export function ValidationReportPanel({ report }: { report: MotionValidationReport }) {
  const { t } = useTranslation();
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const errors = report.issues?.filter((i) => i.severity === "error") ?? [];
  const warnings = report.issues?.filter((i) => i.severity === "warning") ?? [];
  const ok = report.ok && errors.length === 0;

  const summarizedIssues = useMemo(() => {
    return summarizeIssues(report.issues ?? []);
  }, [report.issues]);

  const frameRangesText = (frames: number[]): string => {
    if (frames.length === 0) return "";
    if (frames.length === 1) return `frame ${frames[0]}`;
    const sorted = [...frames].sort((a, b) => a - b);
    if (sorted.length <= 5) return `frames ${sorted.join(", ")}`;
    return `frames ${sorted[0]}-${sorted[sorted.length - 1]} (${frames.length} total)`;
  };

  return (
    <div className="pipeline-motion-validation" data-validation-ok={ok ? "true" : "false"}>
      <div className="pipeline-log-block-title">{t("pipeline.motionValidationTitle")}</div>
      <p className="muted" style={{ margin: "0 0 0.5rem" }}>
        {t("pipeline.motionValidationMeta", {
          pin: report.pinocchio_used ? t("common.yes") : t("common.no"),
          collision: report.collision_engine ?? "—",
        })}
      </p>

      {!ok && (
        <p className="pipeline-validation-status pipeline-validation-status--error" role="status">
          {t("pipeline.motionValidationFailed")}
        </p>
      )}
      {ok && warnings.length === 0 && (
        <p className="pipeline-validation-status pipeline-validation-status--ok" role="status">
          {t("pipeline.motionValidationPassed")}
        </p>
      )}
      {ok && warnings.length > 0 && (
        <p className="pipeline-validation-status pipeline-validation-status--warn" role="status">
          {t("pipeline.motionValidationWarnings", { count: warnings.length })}
        </p>
      )}

      {summarizedIssues.length > 0 && (
        <div className="validation-summary">
          <h4 className="validation-summary__title">
            {t("pipeline.issueSummary", "Issue Summary")}
          </h4>
          <ul className="validation-summary__list">
            {summarizedIssues.map((summary) => {
              const desc = getIssueDescription(summary.code);
              const isExpanded = expandedCode === summary.code;

              return (
                <li
                  key={summary.code}
                  className={`validation-summary__item validation-summary__item--${summary.severity}`}
                >
                  <button
                    type="button"
                    className="validation-summary__toggle"
                    onClick={() => setExpandedCode(isExpanded ? null : summary.code)}
                    aria-expanded={isExpanded}
                  >
                    <span className={`validation-badge validation-badge--${summary.severity}`}>
                      {summary.severity}
                    </span>
                    <span className="validation-summary__label">{desc.label}</span>
                    <span className="validation-summary__count">×{summary.count}</span>
                    <span className="validation-summary__chevron">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="validation-summary__details">
                      <p className="validation-summary__message">{summary.firstMessage}</p>
                      {summary.frames.length > 0 && (
                        <p className="validation-summary__frames">
                          <strong>{t("pipeline.affectedFrames", "Affected")}:</strong>{" "}
                          {frameRangesText(summary.frames)}
                        </p>
                      )}
                      {summary.motors.length > 0 && (
                        <p className="validation-summary__motors">
                          <strong>{t("pipeline.affectedMotors", "Motors")}:</strong>{" "}
                          {summary.motors.join(", ")}
                        </p>
                      )}
                      <p className="validation-summary__suggestion">
                        <strong>{t("pipeline.suggestion", "Suggestion")}:</strong>{" "}
                        {desc.suggestion}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <details className="validation-details">
          <summary>
            {t("pipeline.allErrors", "All errors")} ({errors.length})
          </summary>
          <ul className="pipeline-validation-list">
            {errors.slice(0, 40).map((issue, idx) => (
              <li key={`e-${idx}`}>
                <code>{issue.code}</code>: {issue.message}
                {issue.frame_index != null && ` [frame ${issue.frame_index}]`}
                {issue.motor_index != null && ` [motor ${issue.motor_index}]`}
              </li>
            ))}
            {errors.length > 40 && (
              <li className="muted">
                {t("pipeline.motionValidationTruncated", { count: errors.length - 40 })}
              </li>
            )}
          </ul>
        </details>
      )}

      {warnings.length > 0 && (
        <details className="validation-details">
          <summary>
            {t("pipeline.allWarnings", "All warnings")} ({warnings.length})
          </summary>
          <ul className="pipeline-validation-list pipeline-validation-list--warn">
            {warnings.slice(0, 30).map((issue, idx) => (
              <li key={`w-${idx}`}>
                <code>{issue.code}</code>: {issue.message}
                {issue.frame_index != null && ` [frame ${issue.frame_index}]`}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(report.notes?.length ?? 0) > 0 && (
        <ul className="muted pipeline-validation-notes">
          {report.notes!.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
