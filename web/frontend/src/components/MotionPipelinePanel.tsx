import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  downloadSkillBundle,
  getMotionPipelineStatus,
  postMotionPipelineRun,
  type ApiMetaResponse,
} from "../api/client";
import {
  type AmpTrainSize,
  type MotionPipelineTrainMode,
  buildAmpTrainConfig,
  buildSmokeTrainConfig,
} from "../lib/motionPipelineTrainConfig";

const STORAGE_KEY = "g1_motion_pipeline_id";

type StageRow = { id: string; labelKey: string };

const STAGES: StageRow[] = [
  { id: "capture", labelKey: "motionPipeline.stageCapture" },
  { id: "reference", labelKey: "motionPipeline.stageReference" },
  { id: "train", labelKey: "motionPipeline.stageTrain" },
  { id: "eval", labelKey: "motionPipeline.stageEval" },
  { id: "export", labelKey: "motionPipeline.stageExport" },
];

function readStoredPipelineId(): string {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v && v.trim()) return v.trim();
  } catch {
    /* ignore */
  }
  return "";
}

function writeStoredPipelineId(id: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

function newPipelineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `mp-${Date.now()}`;
}

type MotionPipelinePanelProps = {
  apiMeta: ApiMetaResponse | null;
  /** When set with onLandmarksArtifactChange, the landmarks filename field is controlled (e.g. auto-filled after camera upload). */
  landmarksArtifact?: string;
  onLandmarksArtifactChange?: (value: string) => void;
};

export function MotionPipelinePanel({
  apiMeta,
  landmarksArtifact: landmarksArtifactProp,
  onLandmarksArtifactChange,
}: MotionPipelinePanelProps) {
  const { t } = useTranslation();
  const [pipelineId, setPipelineId] = useState(readStoredPipelineId);
  const [refArtifact, setRefArtifact] = useState("");
  const [internalLandmarksArtifact, setInternalLandmarksArtifact] = useState("");
  const landmarksControlled =
    landmarksArtifactProp !== undefined && typeof onLandmarksArtifactChange === "function";
  const landmarksArtifact = landmarksControlled ? (landmarksArtifactProp as string) : internalLandmarksArtifact;
  const setLandmarksArtifact = landmarksControlled
    ? (onLandmarksArtifactChange as (v: string) => void)
    : setInternalLandmarksArtifact;
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [trainMode, setTrainMode] = useState<MotionPipelineTrainMode>("amp");
  const [ampSize, setAmpSize] = useState<AmpTrainSize>("short");

  const mjcf = apiMeta?.mjcf_default ?? "";

  const trainConfig = useMemo(() => {
    if (trainMode === "smoke") return buildSmokeTrainConfig();
    if (!mjcf) return buildAmpTrainConfig("/missing-mjcf.xml", "short");
    return buildAmpTrainConfig(mjcf, ampSize);
  }, [ampSize, mjcf, trainMode]);

  const effectiveTrainMode = trainMode === "amp" ? ("amp" as const) : ("smoke" as const);

  const refresh = useCallback(async () => {
    if (!pipelineId.trim()) return;
    try {
      const r = await getMotionPipelineStatus(pipelineId);
      setSnapshot((r.state as Record<string, unknown>) ?? null);
    } catch {
      setSnapshot(null);
    }
  }, [pipelineId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stages = (snapshot?.stages as Record<string, { status?: string; error?: string | null }> | undefined) ?? {};

  const run = useCallback(
    async (action: Parameters<typeof postMotionPipelineRun>[0]["action"], extra?: Partial<Parameters<typeof postMotionPipelineRun>[0]>) => {
      if (!pipelineId.trim()) {
        toast.error(t("motionPipeline.needPipelineId"));
        return;
      }
      setBusy(true);
      try {
        const r = await postMotionPipelineRun({
          pipeline_id: pipelineId,
          action,
          train_config: trainConfig,
          train_mode: effectiveTrainMode,
          ...extra,
        });
        setSnapshot((r.state as Record<string, unknown>) ?? null);
        if (r.job_id) toast.message(t("motionPipeline.jobEnqueued", { id: r.job_id }));
        if (r.package_id) toast.success(t("motionPipeline.packaged", { id: r.package_id }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [effectiveTrainMode, pipelineId, t, trainConfig],
  );

  const onInit = useCallback(async () => {
    const id = newPipelineId();
    setPipelineId(id);
    writeStoredPipelineId(id);
    setBusy(true);
    try {
      const r = await postMotionPipelineRun({ pipeline_id: id, action: "init" });
      setSnapshot((r.state as Record<string, unknown>) ?? null);
      toast.success(t("motionPipeline.inited"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const onDownload = useCallback(async () => {
    const ex = stages.export as { package_id?: string } | undefined;
    const pid = typeof ex?.package_id === "string" ? ex.package_id : "";
    if (!pid) return;
    try {
      const { blob, filename } = await downloadSkillBundle(pid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("motionPipeline.downloadStarted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, [stages.export, t]);

  if (apiMeta?.motion_pipeline_enabled !== true) {
    return null;
  }

  const ampTrainDisabled = trainMode === "amp" && !mjcf;

  return (
    <section className="pose-studio-motion-pipeline panel" aria-labelledby="motion-pipeline-heading">
      <div className="motion-capture-header">
        <h2 id="motion-pipeline-heading" className="pose-studio-panel-heading">
          {t("motionPipeline.title")}
        </h2>
        <button
          type="button"
          className="motion-capture-collapse-btn"
          aria-expanded={!collapsed}
          aria-controls="motion-pipeline-body"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? t("motionPipeline.expand") : t("motionPipeline.collapse")}
        </button>
      </div>
      {!collapsed && (
        <div id="motion-pipeline-body">
      <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
        {t("motionPipeline.lead")}
      </p>

      <div className="motion-pipeline-field motion-pipeline-field--row">
        <span className="motion-pipeline-field-label">{t("motionPipeline.trainModeLabel")}</span>
        <label className="motion-pipeline-radio">
          <input
            type="radio"
            name="motion-train-mode"
            checked={trainMode === "amp"}
            onChange={() => setTrainMode("amp")}
          />
          {t("motionPipeline.trainModeAmp")}
        </label>
        <label className="motion-pipeline-radio">
          <input
            type="radio"
            name="motion-train-mode"
            checked={trainMode === "smoke"}
            onChange={() => setTrainMode("smoke")}
          />
          {t("motionPipeline.trainModeSmoke")}
        </label>
      </div>
      {trainMode === "amp" ? (
        <div className="motion-pipeline-field motion-pipeline-field--row">
          <span className="motion-pipeline-field-label">{t("motionPipeline.ampSizeLabel")}</span>
          <label className="motion-pipeline-radio">
            <input
              type="radio"
              name="motion-amp-size"
              checked={ampSize === "short"}
              onChange={() => setAmpSize("short")}
            />
            {t("motionPipeline.ampSizeShort")}
          </label>
          <label className="motion-pipeline-radio">
            <input
              type="radio"
              name="motion-amp-size"
              checked={ampSize === "standard"}
              onChange={() => setAmpSize("standard")}
            />
            {t("motionPipeline.ampSizeStandard")}
          </label>
        </div>
      ) : null}

      <div className="motion-pipeline-timeline" role="list">
        {STAGES.map((s) => {
          const st = stages[s.id];
          const status = typeof st?.status === "string" ? st.status : "pending";
          const err = typeof st?.error === "string" ? st.error : "";
          return (
            <div key={s.id} className={`motion-pipeline-step motion-pipeline-step--${status}`} role="listitem">
              <span className="motion-pipeline-step__dot" aria-hidden />
              <div>
                <div className="motion-pipeline-step__label">{t(s.labelKey)}</div>
                <div className="motion-pipeline-step__status">{status}</div>
                {err ? (
                  <div className="motion-pipeline-step__err" title={err}>
                    {err}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="motion-pipeline-controls">
        <label className="motion-pipeline-field">
          <span>{t("motionPipeline.pipelineId")}</span>
          <input
            type="text"
            value={pipelineId}
            onChange={(e) => {
              const v = e.target.value;
              setPipelineId(v);
              writeStoredPipelineId(v);
            }}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <div className="motion-pipeline-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => void onInit()}>
            {t("motionPipeline.newRun")}
          </button>
          <button type="button" className="secondary" disabled={busy || !pipelineId.trim()} onClick={() => void refresh()}>
            {t("motionPipeline.sync")}
          </button>
        </div>
        <label className="motion-pipeline-field">
          <span>{t("motionPipeline.referenceArtifact")}</span>
          <input
            type="text"
            value={refArtifact}
            onChange={(e) => setRefArtifact(e.target.value)}
            placeholder="reference_trajectory.json"
            spellCheck={false}
          />
        </label>
        <label className="motion-pipeline-field">
          <span>{t("motionPipeline.landmarksArtifact")}</span>
          <input
            type="text"
            value={landmarksArtifact}
            onChange={(e) => setLandmarksArtifact(e.target.value)}
            placeholder="capture-landmarks.json"
            spellCheck={false}
          />
        </label>
        <div className="motion-pipeline-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy || !pipelineId.trim() || !refArtifact.trim()}
            onClick={() =>
              void run("build_reference", {
                reference_artifact: refArtifact.trim(),
              })
            }
          >
            {t("motionPipeline.loadReference")}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy || !pipelineId.trim() || !landmarksArtifact.trim()}
            onClick={() =>
              void run("build_reference", {
                landmarks_artifact: landmarksArtifact.trim(),
              })
            }
          >
            {t("motionPipeline.loadFromLandmarks")}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy || !pipelineId.trim() || ampTrainDisabled}
            title={ampTrainDisabled ? t("motionPipeline.mjcfMissingHint") : undefined}
            onClick={() => void run("enqueue_train")}
          >
            {t("motionPipeline.enqueueTrain")}
          </button>
          <button type="button" className="secondary" disabled={busy || !pipelineId.trim()} onClick={() => void run("sync")}>
            {t("motionPipeline.syncStages")}
          </button>
          <button type="button" className="secondary" disabled={busy || !pipelineId.trim()} onClick={() => void run("request_pack")}>
            {t("motionPipeline.requestPack")}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!((stages.export as { package_id?: string } | undefined)?.package_id)}
            onClick={() => void onDownload()}
          >
            {t("motionPipeline.downloadBundle")}
          </button>
        </div>
        {(stages.train as { job_id?: string } | undefined)?.job_id ? (
          <p className="muted motion-pipeline-meta">
            {t("motionPipeline.jobLabel")}: {(stages.train as { job_id?: string }).job_id}
          </p>
        ) : null}
        {(stages.export as { package_id?: string } | undefined)?.package_id ? (
          <p className="muted motion-pipeline-meta">
            {t("motionPipeline.packageLabel")}: {(stages.export as { package_id?: string }).package_id}
          </p>
        ) : null}
      </div>
        </div>
      )}
    </section>
  );
}
