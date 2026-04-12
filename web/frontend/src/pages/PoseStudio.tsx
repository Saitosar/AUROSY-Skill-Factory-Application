import { useTranslation } from "react-i18next";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/ds/PageHeader";
import JointWasmSliderRow from "../components/JointWasmSliderRow";
import MuJoCoG1Viewer from "../components/mujoco/MuJoCoG1Viewer";
import { getJoints, savePoseDraft } from "../api/client";
import { SKILL_KEYS_IN_JOINT_MAP_ORDER } from "../mujoco/jointMapping";
import { jointRangeRad, qposToSkillJointAngles } from "../mujoco/qposToSkillAngles";
import {
  buildKeyframesDocumentFromPoses,
  buildSdkPoseJsonArray,
  stringifySdkPoseJson,
} from "../lib/poseAuthoringBridge";
import {
  captureFullJointAnglesSkillKeys,
  segmentDurationSec,
  smoothStepJointAnglesRad,
} from "../lib/motionInterpolation";
import type { JointAngles } from "../lib/telemetryTypes";
import { JOINT_SLIDER_RAD_MAX, JOINT_SLIDER_RAD_MIN } from "../lib/telemetryTypes";
import { getJointLabel } from "../lib/jointDisplayLabel";
import {
  defaultJointMapFromSkillKeys,
  WASM_FALLBACK_JOINT_INDICES,
} from "../lib/wasmJointLayoutFallback";
import { DANCE_LIBRARY, type DanceSequence } from "../lib/danceSequences";

const FALLBACK_JOINT_MAP = defaultJointMapFromSkillKeys();

const MAX_SAVED_WASM_POSES = 3;
const WASM_MOTION_SPEED_RAD_S = 0.5;
const MIN_MOTION_SEGMENT_SEC = 0.05;
const KEYFRAME_TIMESTAMP_STEP_S = 0.5;

export default function PoseStudio() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<{ name: string; indices: number[] }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expert, setExpert] = useState(false);
  const [filterGroupName, setFilterGroupName] = useState<string | null>(null);
  const [selectedJointIndex, setSelectedJointIndex] = useState<number | null>(null);

  const [wasmJointRad, setWasmJointRad] = useState<JointAngles>({});
  const wasmJointRadRef = useRef<JointAngles>({});
  const [wasmRanges, setWasmRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmViewerError, setWasmViewerError] = useState<string | null>(null);
  const [savedWasmPoses, setSavedWasmPoses] = useState<JointAngles[]>([]);
  const [wasmMotionPlaying, setWasmMotionPlaying] = useState(false);
  const wasmMotionPlayingRef = useRef(false);
  const wasmMotionCancelRef = useRef(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [freeStand, setFreeStand] = useState(false);
  const [autoBalance, setAutoBalance] = useState(true);
  const [dancePlaying, setDancePlaying] = useState(false);
  const danceCancelRef = useRef(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [draftName, setDraftName] = useState("");
  const [activeDanceName, setActiveDanceName] = useState<string | null>(null);

  useEffect(() => {
    wasmJointRadRef.current = wasmJointRad;
  }, [wasmJointRad]);

  useEffect(() => {
    wasmMotionPlayingRef.current = wasmMotionPlaying;
  }, [wasmMotionPlaying]);

  useEffect(() => {
    void getJoints()
      .then((j) => {
        setGroups(j.groups);
        setNames(j.joint_map);
        setLoadError(null);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  const mergedForExport = useMemo(() => {
    if (!wasmReady) return null;
    for (const k of SKILL_KEYS_IN_JOINT_MAP_ORDER) {
      const v = wasmJointRad[k];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
    }
    return wasmJointRad;
  }, [wasmReady, wasmJointRad]);

  const keyframesListForExport = useMemo(() => {
    if (!mergedForExport) return null;
    const cur = captureFullJointAnglesSkillKeys(mergedForExport);
    if (savedWasmPoses.length === 0) return [cur];
    return [cur, ...savedWasmPoses];
  }, [mergedForExport, savedWasmPoses]);

  const saveWasmDraft = useCallback(async () => {
    if (!keyframesListForExport?.length) {
      toast.error(t("pose.saveDraftNoPose"));
      return;
    }
    const name = draftName.trim();
    if (!name) {
      toast.error(t("pose.saveDraftEmptyName"));
      return;
    }
    try {
      const doc = buildKeyframesDocumentFromPoses(keyframesListForExport, {
        timestampS: 0,
        timestampStepS: KEYFRAME_TIMESTAMP_STEP_S,
      });
      const { path } = await savePoseDraft({ name, document: doc });
      toast.success(t("pose.saveDraftOk", { path }));
      setDraftName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("pose.saveDraftFail"), { description: msg });
    }
  }, [keyframesListForExport, draftName, t]);

  const addWasmPose = useCallback(() => {
    if (!mergedForExport || savedWasmPoses.length >= MAX_SAVED_WASM_POSES || wasmMotionPlayingRef.current) return;
    setSavedWasmPoses((prev) => [...prev, captureFullJointAnglesSkillKeys(mergedForExport)]);
    toast.success(
      t("pose.addPoseOk", {
        n: savedWasmPoses.length + 1,
        maxSaved: MAX_SAVED_WASM_POSES,
      })
    );
  }, [mergedForExport, savedWasmPoses.length, t]);

  const clearWasmSavedPoses = useCallback(() => {
    setSavedWasmPoses([]);
    toast.success(t("pose.clearPosesOk"));
  }, [t]);

  const downloadSdkPoseJson = useCallback(() => {
    const list = keyframesListForExport;
    if (!list?.length) {
      toast.error(t("pose.sdkDownloadNoPose"));
      return;
    }
    const sdk = buildSdkPoseJsonArray(list);
    const blob = new Blob([stringifySdkPoseJson(sdk)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pose.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t("pose.sdkDownloadOk"));
  }, [keyframesListForExport, t]);

  const stopWasmMotion = useCallback(() => {
    wasmMotionCancelRef.current = true;
    danceCancelRef.current = true;
  }, []);

  const playWasmMotion = useCallback(async () => {
    if (savedWasmPoses.length === 0 || !wasmReady || wasmMotionPlayingRef.current) return;
    wasmMotionCancelRef.current = false;
    setWasmMotionPlaying(true);
    try {
      let from = captureFullJointAnglesSkillKeys(wasmJointRadRef.current);
      for (let s = 0; s < savedWasmPoses.length; s++) {
        if (wasmMotionCancelRef.current) break;
        const to = savedWasmPoses[s]!;
        const durationMs =
          segmentDurationSec(from, to, WASM_MOTION_SPEED_RAD_S, MIN_MOTION_SEGMENT_SEC) * 1000;
        await new Promise<void>((resolve) => {
          const t0 = performance.now();
          const step = (now: number) => {
            if (wasmMotionCancelRef.current) {
              resolve();
              return;
            }
            const u = Math.min(1, (now - t0) / durationMs);
            setWasmJointRad(smoothStepJointAnglesRad(from, to, u));
            if (u < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
        from = to;
      }
    } finally {
      setWasmMotionPlaying(false);
      wasmMotionCancelRef.current = false;
    }
  }, [savedWasmPoses, wasmReady]);

  const playDance = useCallback(async (dance: DanceSequence) => {
    if (!wasmReady || wasmMotionPlayingRef.current || dancePlaying) return;
    danceCancelRef.current = false;
    setDancePlaying(true);
    setWasmMotionPlaying(true);
    setActiveDanceName(dance.name);
    try {
      const totalLoops = dance.loops || 1;
      for (let loop = 0; loop < totalLoops; loop++) {
        if (danceCancelRef.current) break;
        let from = captureFullJointAnglesSkillKeys(wasmJointRadRef.current);
        for (const kf of dance.keyframes) {
          if (danceCancelRef.current) break;
          const to = kf.pose;
          const durationMs = kf.duration * 1000;
          await new Promise<void>((resolve) => {
            const t0 = performance.now();
            const step = (now: number) => {
              if (danceCancelRef.current) { resolve(); return; }
              const u = Math.min(1, (now - t0) / durationMs);
              setWasmJointRad(smoothStepJointAnglesRad(from, to, u));
              if (u < 1) requestAnimationFrame(step);
              else resolve();
            };
            requestAnimationFrame(step);
          });
          from = to;
        }
      }
    } finally {
      setDancePlaying(false);
      setWasmMotionPlaying(false);
      setActiveDanceName(null);
      danceCancelRef.current = false;
    }
  }, [wasmReady, dancePlaying]);

  const effectiveNames = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(names)) {
      if (names[k]) n += 1;
    }
    return n >= 29 ? names : FALLBACK_JOINT_MAP;
  }, [names]);

  const wasmFallbackGroups = useMemo(
    () => [
      { name: t("pose.fallbackGroups.leftArm"), indices: [...WASM_FALLBACK_JOINT_INDICES.leftArm] },
      { name: t("pose.fallbackGroups.rightArm"), indices: [...WASM_FALLBACK_JOINT_INDICES.rightArm] },
      { name: t("pose.fallbackGroups.torso"), indices: [...WASM_FALLBACK_JOINT_INDICES.torso] },
      { name: t("pose.fallbackGroups.leftLeg"), indices: [...WASM_FALLBACK_JOINT_INDICES.leftLeg] },
      { name: t("pose.fallbackGroups.rightLeg"), indices: [...WASM_FALLBACK_JOINT_INDICES.rightLeg] },
    ],
    [t]
  );

  const effectiveGroups = useMemo(
    () => (groups.length > 0 ? groups : wasmFallbackGroups),
    [groups, wasmFallbackGroups]
  );

  const onWasmReady = useCallback(
    ({ model, data }: { model: unknown; data: unknown }) => {
      const ranges: Record<string, { min: number; max: number }> = {};
      for (let i = 0; i < 29; i++) {
        const sk = effectiveNames[String(i)];
        if (!sk) continue;
        const r = jointRangeRad(model as never, sk);
        if (r) ranges[sk] = r;
      }
      setWasmRanges(ranges);
      setWasmJointRad(qposToSkillJointAngles(model as never, data as { qpos: Float64Array }));
      setWasmReady(true);
      setWasmViewerError(null);
    },
    [effectiveNames]
  );

  const onWasmJointChange = useCallback((skillKey: string, rad: number) => {
    setWasmJointRad((prev) => ({ ...prev, [skillKey]: rad }));
  }, []);

  const filteredGroups =
    filterGroupName == null
      ? effectiveGroups
      : effectiveGroups.filter((g) => g.name === filterGroupName);

  const toggleGroupCollapse = useCallback((name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const dash = t("common.dash");

  return (
    <div className="pose-studio-page">
      <PageHeader title={t("pose.title")} description={t("pose.lead")} />

      <div className="pose-studio-layout">
        {/* ── Left: 3D Viewer ── */}
        <section
          className="pose-studio-visual panel pose-studio-visual--wasm"
          aria-label={t("pose.wasmViewerAria")}
        >
          <div className="pose-studio-wasm-host">
            <Suspense fallback={<p className="muted">{t("pose.wasmLoading")}</p>}>
              <MuJoCoG1Viewer
                jointRad={wasmJointRad}
                physicsEnabled={physicsEnabled}
                freeStand={freeStand}
                autoBalance={autoBalance}
                onReady={onWasmReady}
                onError={(e) => {
                  setWasmViewerError(e.message);
                  setWasmReady(false);
                }}
              />
            </Suspense>
            {/* Status overlay on viewer */}
            {dancePlaying && activeDanceName && (
              <div className="pose-studio-playing-badge">
                <span className="pose-studio-playing-dot" />
                {activeDanceName}
              </div>
            )}
          </div>
        </section>

        {/* ── Right: Sidebar ── */}
        <div className="pose-studio-sidebar">

          {/* ═══ §1 SIMULATION ═══ */}
          <div className="ps-section panel">
            <h3 className="ps-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Simulation
            </h3>
            <div className="ps-toggle-row">
              <label className="ps-toggle">
                <input type="checkbox" checked={physicsEnabled} onChange={(e) => setPhysicsEnabled(e.target.checked)} />
                <span className="ps-toggle-track"><span className="ps-toggle-thumb" /></span>
                <span>Physics</span>
              </label>
              <label className={`ps-toggle${!physicsEnabled ? " ps-toggle--disabled" : ""}`}>
                <input type="checkbox" checked={freeStand} disabled={!physicsEnabled} onChange={(e) => setFreeStand(e.target.checked)} />
                <span className="ps-toggle-track"><span className="ps-toggle-thumb" /></span>
                <span>Free Stand</span>
              </label>
              <label className={`ps-toggle${!physicsEnabled || !freeStand ? " ps-toggle--disabled" : ""}`}>
                <input type="checkbox" checked={autoBalance} disabled={!physicsEnabled || !freeStand} onChange={(e) => setAutoBalance(e.target.checked)} />
                <span className="ps-toggle-track"><span className="ps-toggle-thumb" /></span>
                <span>Auto Balance</span>
              </label>
            </div>
          </div>

          {/* ═══ §2 KEYFRAMES ═══ */}
          <div className="ps-section panel">
            <h3 className="ps-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
              Keyframes
              {savedWasmPoses.length > 0 && (
                <span className="ps-badge">{savedWasmPoses.length}/{MAX_SAVED_WASM_POSES}</span>
              )}
            </h3>
            <div className="ps-btn-row">
              <button
                type="button"
                className="ps-btn ps-btn--primary"
                disabled={!mergedForExport || savedWasmPoses.length >= MAX_SAVED_WASM_POSES || wasmMotionPlaying}
                onClick={addWasmPose}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                {t("pose.addPose")}
              </button>
              <button
                type="button"
                className="ps-btn ps-btn--ghost"
                disabled={savedWasmPoses.length === 0 || wasmMotionPlaying}
                onClick={clearWasmSavedPoses}
                title={t("pose.clearSavedPoses")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
            <button
              type="button"
              className="ps-btn ps-btn--outline ps-btn--full"
              disabled={!keyframesListForExport?.length || wasmMotionPlaying}
              onClick={downloadSdkPoseJson}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {t("pose.downloadSdkPoseJson")}
            </button>
            <div className="ps-draft-row">
              <input
                type="text"
                className="ps-draft-input"
                placeholder={t("pose.saveDraftPrompt")}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void saveWasmDraft(); }}
                disabled={wasmMotionPlaying}
              />
              <button
                type="button"
                className="ps-btn ps-btn--primary ps-btn--sm"
                disabled={!mergedForExport || !draftName.trim() || wasmMotionPlaying}
                onClick={() => void saveWasmDraft()}
                title={t("pose.saveDraft")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
              </button>
            </div>
          </div>

          {/* ═══ §3 PLAYBACK ═══ */}
          <div className="ps-section panel">
            <h3 className="ps-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Playback
            </h3>
            <div className="ps-btn-row">
              <button
                type="button"
                className="ps-btn ps-btn--primary"
                disabled={savedWasmPoses.length === 0 || !wasmReady || wasmMotionPlaying}
                onClick={() => void playWasmMotion()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {t("pose.createMotion")}
              </button>
              <button
                type="button"
                className="ps-btn ps-btn--destructive"
                disabled={!wasmMotionPlaying && !dancePlaying}
                onClick={stopWasmMotion}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12"/></svg>
                {t("pose.stopMotion")}
              </button>
            </div>
            <div className="ps-dance-grid">
              {DANCE_LIBRARY.map((dance) => (
                <button
                  key={dance.name}
                  type="button"
                  className={`ps-btn ps-btn--dance${activeDanceName === dance.name ? " ps-btn--dance-active" : ""}`}
                  disabled={!wasmReady || wasmMotionPlaying || dancePlaying}
                  onClick={() => void playDance(dance)}
                >
                  💃 {dance.name}
                </button>
              ))}
            </div>
          </div>

          {/* ═══ §4 JOINTS ═══ */}
          <aside
            className="ps-section ps-joints-panel panel"
            aria-labelledby="pose-studio-joints-heading"
          >
            <div className="ps-section-title-row">
              <h3 className="ps-section-title" id="pose-studio-joints-heading">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                {t("pose.jointsPanelTitle")}
              </h3>
              <div className="ps-joint-controls">
                <label className="ps-toggle ps-toggle--compact">
                  <input type="checkbox" checked={expert} onChange={(e) => setExpert(e.target.checked)} />
                  <span className="ps-toggle-track"><span className="ps-toggle-thumb" /></span>
                  <span className="tag-secondary">{t("telemetry.expertLabel")}</span>
                </label>
                {filterGroupName != null && (
                  <button
                    type="button"
                    className="ps-btn ps-btn--ghost ps-btn--sm"
                    onClick={() => setFilterGroupName(null)}
                  >
                    {t("pose.allGroups")}
                  </button>
                )}
              </div>
            </div>
            {!wasmReady && !wasmViewerError && <p className="muted">{t("pose.wasmSlidersHint")}</p>}
            {filteredGroups.map((g) => {
              const isCollapsed = collapsedGroups.has(g.name);
              return (
                <div key={g.name} className="ps-joint-group">
                  <button
                    type="button"
                    className="ps-joint-group-header"
                    onClick={() => toggleGroupCollapse(g.name)}
                    aria-expanded={!isCollapsed}
                  >
                    <svg
                      className={`ps-chevron${isCollapsed ? "" : " ps-chevron--open"}`}
                      width="12" height="12" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>{g.name}</span>
                    <span className="ps-joint-count">{g.indices.length}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="ps-joint-group-body">
                      {g.indices.map((i) => {
                        const key = String(i);
                        const skillKey = effectiveNames[key] ?? dash;
                        const displayLabel = getJointLabel(skillKey, t);
                        const r = wasmRanges[skillKey];
                        const lo = r?.min ?? JOINT_SLIDER_RAD_MIN;
                        const hi = r?.max ?? JOINT_SLIDER_RAD_MAX;
                        const v = wasmJointRad[skillKey] ?? 0;
                        return (
                          <JointWasmSliderRow
                            key={i}
                            jointIndex={i}
                            label={displayLabel}
                            expertCanonicalLabel={skillKey}
                            skillKey={skillKey}
                            valueRad={v}
                            minRad={lo}
                            maxRad={hi}
                            unit="deg"
                            expert={expert}
                            isSelected={selectedJointIndex === i}
                            onActivate={() => {
                              setSelectedJointIndex(i);
                              setFilterGroupName(g.name);
                            }}
                            onChangeRad={onWasmJointChange}
                            numberInputAriaLabel={t("pose.commandValueAria", { label: displayLabel })}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>

          {/* ═══ ERRORS ═══ */}
          {(wasmViewerError || loadError) && (
            <div className="ps-section panel ps-error-panel" aria-live="polite">
              {wasmViewerError && (
                <p className="err" style={{ margin: 0, wordBreak: "break-word" }}>{wasmViewerError}</p>
              )}
              {loadError && (
                <p className="muted" style={{ margin: wasmViewerError ? "8px 0 0" : 0, fontSize: "0.82rem", wordBreak: "break-word" }}>{loadError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
