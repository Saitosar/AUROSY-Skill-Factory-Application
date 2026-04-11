import { useTranslation } from "react-i18next";
import type { MotionValidationReport } from "../api/client";

export function ValidationReportPanel({ report }: { report: MotionValidationReport }) {
  const { t } = useTranslation();
  const errors = report.issues?.filter((i) => i.severity === "error") ?? [];
  const warnings = report.issues?.filter((i) => i.severity === "warning") ?? [];
  const ok = report.ok && errors.length === 0;

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
      {errors.length > 0 && (
        <ul className="pipeline-validation-list">
          {errors.slice(0, 40).map((issue, idx) => (
            <li key={`e-${idx}`}>
              <code>{issue.code}</code>: {issue.message}
              {issue.frame_index != null && ` [frame ${issue.frame_index}]`}
              {issue.motor_index != null && ` [motor ${issue.motor_index}]`}
            </li>
          ))}
          {errors.length > 40 && (
            <li className="muted">{t("pipeline.motionValidationTruncated", { count: errors.length - 40 })}</li>
          )}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="pipeline-validation-list pipeline-validation-list--warn">
          {warnings.slice(0, 30).map((issue, idx) => (
            <li key={`w-${idx}`}>
              <code>{issue.code}</code>: {issue.message}
              {issue.frame_index != null && ` [frame ${issue.frame_index}]`}
            </li>
          ))}
        </ul>
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
