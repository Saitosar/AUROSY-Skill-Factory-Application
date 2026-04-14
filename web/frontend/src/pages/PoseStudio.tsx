import { useTranslation } from "react-i18next";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import JointWasmSliderRow from "../components/JointWasmSliderRow";
import { MotionCapturePanel } from "../components/MotionCapturePanel";
import { MotionPipelinePanel } from "../components/MotionPipelinePanel";
import { PoseTimeline } from "../components/pose-timeline/PoseTimeline";
import MuJoCoG1Viewer from "../components/mujoco/MuJoCoG1Viewer";
import { getJoints, savePoseDraft } from "../api/client";
import { useApiMeta } from "../hooks/useApiMeta";
import { SKILL_KEYS_IN_JOINT_MAP_ORDER } from "../mujoco/jointMapping";
import { jointRangeRad, qposToSkillJointAngles } from "../mujoco/qposToSkillAngles";
import {
  buildKeyframesDocumentFromNlaTimeline,
  buildSdkPoseJsonArrayFromNlaTimeline,
  stringifySdkPoseJson,
} from "../lib/poseAuthoringBridge";
import {
  captureFullJointAnglesSkillKeys,
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
import type { LiveRecorderFrame } from "../hooks/useLiveRecorder";
import { evaluateNlaPoseAtTime, sampleNlaTimeline, smoothNoisySegment } from "../lib/nlaEvaluation";
import {
  cloneTimeline,
  createEmptyNlaTimeline,
  createNlaKeyframe,
  migrateSavedPosesToNlaTimeline,
  timelineDurationSec,
  type NlaTimeline,
  type NlaTrackId,
} from "../lib/nlaTimeline";

const FALLBACK_JOINT_MAP = defaultJointMapFromSkillKeys();

const MAX_SAVED_WASM_POSES = 3;
const KEYFRAME_TIMESTAMP_STEP_S = 0.5;
const NLA_PREVIEW_SAMPLE_HZ = 30;

export default function PoseStudio() {
  const { t } = useTranslation();
  const apiMeta = useApiMeta();
  const retargetingEnabled = apiMeta?.retargeting_enabled === true;
  const telemetryMode = apiMeta?.telemetry_mode ?? "unknown";
  const [liveModeEnabled, setLiveModeEnabled] = useState(false);
  const [liveTrackEnabled, setLiveTrackEnabled] = useState(false);
  const [landmarksArtifact, setLandmarksArtifact] = useState("");
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
  const [nlaTimeline, setNlaTimeline] = useState<NlaTimeline>(() => createEmptyNlaTimeline());
  const [timelineTimeSec, setTimelineTimeSec] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<NlaTrackId>("hands");
  const [selectedTrackJoint, setSelectedTrackJoint] = useState("left_shoulder_pitch");
  const [wasmMotionPlaying, setWasmMotionPlaying] = useState(false);
  const wasmMotionPlayingRef = useRef(false);
  const wasmMotionCancelRef = useRef(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [freeStand, setFreeStand] = useState(true);
  const [autoBalance, setAutoBalance] = useState(true);
  const [dancePlaying, setDancePlaying] = useState(false);
  const danceCancelRef = useRef(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [draftName, setDraftName] = useState("");
  const [activeDanceName, setActiveDanceName] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<"joints" | "timeline" | "capture">("joints");
  const [panelTab, setPanelTab] = useState<"joints" | "timeline" | "capture">("joints");

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

  const timelineEndSec = useMemo(() => timelineDurationSec(nlaTimeline), [nlaTimeline]);

  const keyframesListForExport = useMemo(() => {
    if (!mergedForExport) return null;
    const sampled = sampleNlaTimeline(nlaTimeline, {
      sampleRateHz: 1 / KEYFRAME_TIMESTAMP_STEP_S,
      basePose: mergedForExport,
    });
    if (sampled.poses.length > 0) return sampled.poses;
    return [captureFullJointAnglesSkillKeys(mergedForExport)];
  }, [mergedForExport, nlaTimeline]);

  const currentTimelinePose = useMemo(
    () => evaluateNlaPoseAtTime(nlaTimeline, timelineTimeSec, wasmJointRad),
    [nlaTimeline, timelineTimeSec, wasmJointRad]
  );

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
      const doc = buildKeyframesDocumentFromNlaTimeline(nlaTimeline, {
        sampleRateHz: 1 / KEYFRAME_TIMESTAMP_STEP_S,
        smoothAlpha: 0.2,
      });
      const { path } = await savePoseDraft({ name, document: doc });
      toast.success(t("pose.saveDraftOk", { path }));
      setDraftName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("pose.saveDraftFail"), { description: msg });
    }
  }, [keyframesListForExport, draftName, nlaTimeline, t]);

  useEffect(() => {
    if (liveTrackEnabled || wasmMotionPlayingRef.current) return;
    if (!wasmReady) return;
    setWasmJointRad((prev) => ({ ...prev, ...currentTimelinePose }));
  }, [currentTimelinePose, liveTrackEnabled, wasmReady]);

  const rebuildTimelineFromSavedPoses = useCallback(
    (poses: JointAngles[]) => {
      if (!mergedForExport) return;
      const timeline = migrateSavedPosesToNlaTimeline(
        [captureFullJointAnglesSkillKeys(mergedForExport), ...poses],
        {
          stepSec: KEYFRAME_TIMESTAMP_STEP_S,
          fps: NLA_PREVIEW_SAMPLE_HZ,
        }
      );
      setNlaTimeline(timeline);
      setTimelineTimeSec(0);
    },
    [mergedForExport]
  );

  const addWasmPose = useCallback(() => {
    if (
      !mergedForExport ||
      savedWasmPoses.length >= MAX_SAVED_WASM_POSES ||
      wasmMotionPlayingRef.current ||
      liveTrackEnabled
    ) {
      return;
    }
    setSavedWasmPoses((prev) => {
      const next = [...prev, captureFullJointAnglesSkillKeys(mergedForExport)];
      rebuildTimelineFromSavedPoses(next);
      return next;
    });
    toast.success(
      t("pose.addPoseOk", {
        n: savedWasmPoses.length + 1,
        maxSaved: MAX_SAVED_WASM_POSES,
      })
    );
  }, [liveTrackEnabled, mergedForExport, rebuildTimelineFromSavedPoses, savedWasmPoses.length, t]);

  const clearWasmSavedPoses = useCallback(() => {
    if (liveTrackEnabled) return;
    setSavedWasmPoses([]);
    rebuildTimelineFromSavedPoses([]);
    toast.success(t("pose.clearPosesOk"));
  }, [liveTrackEnabled, rebuildTimelineFromSavedPoses, t]);

  const downloadSdkPoseJson = useCallback(() => {
    const list = keyframesListForExport;
    if (!list?.length) {
      toast.error(t("pose.sdkDownloadNoPose"));
      return;
    }
    const sdk = buildSdkPoseJsonArrayFromNlaTimeline(
      nlaTimeline,
      1 / KEYFRAME_TIMESTAMP_STEP_S
    );
    const blob = new Blob([stringifySdkPoseJson(sdk)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pose.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t("pose.sdkDownloadOk"));
  }, [keyframesListForExport, nlaTimeline, t]);

  const stopWasmMotion = useCallback(() => {
    wasmMotionCancelRef.current = true;
    danceCancelRef.current = true;
  }, []);

  const playWasmMotion = useCallback(async () => {
    if (!wasmReady || wasmMotionPlayingRef.current || liveTrackEnabled) return;
    const sampled = sampleNlaTimeline(nlaTimeline, {
      sampleRateHz: NLA_PREVIEW_SAMPLE_HZ,
      basePose: wasmJointRadRef.current,
      smoothAlpha: 0.2,
    });
    if (!sampled.poses.length) return;
    wasmMotionCancelRef.current = false;
    setWasmMotionPlaying(true);
    try {
      for (let s = 0; s < sampled.poses.length; s++) {
        if (wasmMotionCancelRef.current) break;
        const to = sampled.poses[s]!;
        const durationMs = Math.max(16, Math.round((1 / NLA_PREVIEW_SAMPLE_HZ) * 1000));
        await new Promise<void>((resolve) => {
          const t0 = performance.now();
          const step = (now: number) => {
            if (wasmMotionCancelRef.current) {
              resolve();
              return;
            }
            const u = Math.min(1, (now - t0) / durationMs);
            const from = captureFullJointAnglesSkillKeys(wasmJointRadRef.current);
            setWasmJointRad(smoothStepJointAnglesRad(from, to, u));
            if (u < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        });
      }
    } finally {
      setWasmMotionPlaying(false);
      wasmMotionCancelRef.current = false;
    }
  }, [liveTrackEnabled, nlaTimeline, wasmReady]);

  const playDance = useCallback(async (dance: DanceSequence) => {
    if (!wasmReady || wasmMotionPlayingRef.current || dancePlaying || liveTrackEnabled) return;
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
  }, [liveTrackEnabled, wasmReady, dancePlaying]);

  const updateTimeline = useCallback((updater: (draft: NlaTimeline) => void) => {
    setNlaTimeline((prev) => {
      const draft = cloneTimeline(prev);
      updater(draft);
      return draft;
    });
  }, []);

  const addTimelineKeyframe = useCallback(
    (trackId: string, joint: string, timeSec: number) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        const clip = track?.clips[0];
        if (!track || !clip) return;
        const curve = clip.curves.find((item) => item.joint === joint);
        if (!curve) return;
        const value = typeof wasmJointRadRef.current[joint] === "number" ? wasmJointRadRef.current[joint]! : 0;
        curve.keyframes.push(createNlaKeyframe(timeSec, value));
      });
    },
    [updateTimeline]
  );

  const deleteTimelineKeyframe = useCallback(
    (trackId: string, joint: string, keyframeId: string) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        const curve = track?.clips[0]?.curves.find((item) => item.joint === joint);
        if (!curve) return;
        curve.keyframes = curve.keyframes.filter((item) => item.id !== keyframeId);
      });
    },
    [updateTimeline]
  );

  const moveTimelineKeyframe = useCallback(
    (trackId: string, joint: string, keyframeId: string, timeSec: number) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        const curve = track?.clips[0]?.curves.find((item) => item.joint === joint);
        if (!curve) return;
        const target = curve.keyframes.find((item) => item.id === keyframeId);
        if (!target) return;
        target.timeSec = Math.max(0, Number.isFinite(timeSec) ? timeSec : target.timeSec);
      });
    },
    [updateTimeline]
  );

  const updateTimelineBezierHandle = useCallback(
    (
      trackId: string,
      joint: string,
      keyframeId: string,
      side: "inHandle" | "outHandle",
      axis: "dt" | "dv",
      value: number
    ) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        const curve = track?.clips[0]?.curves.find((item) => item.joint === joint);
        const target = curve?.keyframes.find((item) => item.id === keyframeId);
        if (!target) return;
        target[side][axis] = Number.isFinite(value) ? value : target[side][axis];
      });
    },
    [updateTimeline]
  );

  const setTrackWeight = useCallback(
    (trackId: string, weight: number) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        if (!track) return;
        track.weight = Math.max(0, Math.min(1, weight));
      });
    },
    [updateTimeline]
  );

  const toggleTrackEnabled = useCallback(
    (trackId: string, enabled: boolean) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        if (!track) return;
        track.enabled = enabled;
      });
    },
    [updateTimeline]
  );

  const smoothTimelineJoint = useCallback(
    (trackId: string, joint: string) => {
      updateTimeline((draft) => {
        const track = draft.tracks.find((item) => item.id === trackId);
        const curve = track?.clips[0]?.curves.find((item) => item.joint === joint);
        if (!curve || curve.keyframes.length < 3) return;
        const next = [...curve.keyframes].sort((a, b) => a.timeSec - b.timeSec);
        for (let i = 1; i < next.length - 1; i++) {
          const prev = next[i - 1]!;
          const cur = next[i]!;
          const after = next[i + 1]!;
          const mean = (prev.valueRad + cur.valueRad + after.valueRad) / 3;
          cur.valueRad = cur.valueRad + (mean - cur.valueRad) * 0.45;
        }
        curve.keyframes = next;
      });
      toast.success(t("pose.timelineJointSmoothed"));
    },
    [t, updateTimeline]
  );

  const buildNlaFromLocalRecording = useCallback((frames: LiveRecorderFrame[]) => {
    if (frames.length < 2) return;
    const baseTs = frames[0]!.timestamp_ms;
    const rawPoses: JointAngles[] = [];
    for (const frame of frames) {
      rawPoses.push({ ...frame.joint_angles_rad });
    }
    const smoothed = smoothNoisySegment(rawPoses, 0.45);
    const step = Math.max(0.01, ((frames[1]!.timestamp_ms - baseTs) / 1000) || (1 / NLA_PREVIEW_SAMPLE_HZ));
    const timeline = migrateSavedPosesToNlaTimeline(smoothed, {
      stepSec: step,
      fps: NLA_PREVIEW_SAMPLE_HZ,
    });
    setNlaTimeline(timeline);
    setTimelineTimeSec(0);
    toast.success(t("pose.timelineImported"));
  }, [t]);

  const effectiveNames = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(names)) {
      if (names[k]) n += 1;
    }
    return n >= 29 ? names : FALLBACK_JOINT_MAP;
  }, [names]);

  useEffect(() => {
    const track = nlaTimeline.tracks.find((item) => item.id === selectedTrackId);
    if (!track) return;
    if (!track.joints.includes(selectedTrackJoint) && track.joints.length > 0) {
      setSelectedTrackJoint(track.joints[0]!);
    }
  }, [nlaTimeline, selectedTrackId, selectedTrackJoint]);

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
      const initialPose = qposToSkillJointAngles(model as never, data as { qpos: Float64Array });
      setWasmJointRad(initialPose);
      setWasmReady(true);
      setWasmViewerError(null);
      setNlaTimeline(
        migrateSavedPosesToNlaTimeline([captureFullJointAnglesSkillKeys(initialPose)], {
          stepSec: KEYFRAME_TIMESTAMP_STEP_S,
          fps: NLA_PREVIEW_SAMPLE_HZ,
        })
      );
    },
    [effectiveNames]
  );

  const onWasmJointChange = useCallback((skillKey: string, rad: number) => {
    if (liveTrackEnabled) return;
    setWasmJointRad((prev) => ({ ...prev, [skillKey]: rad }));
  }, [liveTrackEnabled]);

  const onLiveTrackAngles = useCallback((jointAngles: Record<string, number>) => {
    setWasmJointRad((prev) => ({ ...prev, ...jointAngles }));
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
      <div className="pose-studio-layout">
        {/* ── Full-screen 3D Viewer (background layer) ── */}
        <div className="ps-stage">
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
          {dancePlaying && activeDanceName && (
            <div className="pose-studio-playing-badge">
              <span className="pose-studio-playing-dot" />
              {activeDanceName}
            </div>
          )}
        </div>

        {/* ── Left: Mini Control Bar (overlay) ── */}
        <nav className="ps-minibar" aria-label="Quick controls">
          <div className="ps-minibar-group">
            <label className="ps-minibar-toggle" title="Physics">
              <input type="checkbox" checked={physicsEnabled} onChange={(e) => setPhysicsEnabled(e.target.checked)} />
              <span className="ps-minibar-toggle-track"><span className="ps-minibar-toggle-thumb" /></span>
              <span className="ps-minibar-toggle-label">Physics</span>
            </label>
            <label className={`ps-minibar-toggle${!physicsEnabled ? " ps-minibar-toggle--disabled" : ""}`} title="Free Stand">
              <input type="checkbox" checked={freeStand} disabled={!physicsEnabled} onChange={(e) => setFreeStand(e.target.checked)} />
              <span className="ps-minibar-toggle-track"><span className="ps-minibar-toggle-thumb" /></span>
              <span className="ps-minibar-toggle-label">Free</span>
            </label>
            <label className={`ps-minibar-toggle${(!physicsEnabled || !freeStand) ? " ps-minibar-toggle--disabled" : ""}`} title="Auto Balance">
              <input type="checkbox" checked={autoBalance} disabled={!physicsEnabled || !freeStand} onChange={(e) => setAutoBalance(e.target.checked)} />
              <span className="ps-minibar-toggle-track"><span className="ps-minibar-toggle-thumb" /></span>
              <span className="ps-minibar-toggle-label">Balance</span>
            </label>
          </div>

          <div className="ps-minibar-divider" />

          <div className="ps-minibar-group">
            <button
              type="button"
              className="ps-minibar-btn ps-minibar-btn--action"
              disabled={
                !mergedForExport ||
                savedWasmPoses.length >= MAX_SAVED_WASM_POSES ||
                wasmMotionPlaying ||
                liveTrackEnabled
              }
              onClick={addWasmPose}
              title={t("pose.addPose")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              <span>Pose</span>
              {savedWasmPoses.length > 0 && (
                <span className="ps-minibar-badge">{savedWasmPoses.length}</span>
              )}
            </button>
            <button
              type="button"
              className="ps-minibar-btn ps-minibar-btn--action"
              disabled={timelineEndSec <= 0 || !wasmReady || wasmMotionPlaying || liveTrackEnabled}
              onClick={() => void playWasmMotion()}
              title={t("pose.createMotion")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Play</span>
            </button>
            <button
              type="button"
              className="ps-minibar-btn ps-minibar-btn--stop"
              disabled={!wasmMotionPlaying && !dancePlaying}
              onClick={stopWasmMotion}
              title={t("pose.stopMotion")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12"/></svg>
              <span>Stop</span>
            </button>
          </div>

          <div className="ps-minibar-divider" />

          {/* ── Motion Library ── */}
          <div className="ps-motion-library">
            <div className="ps-motion-library-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
              <span>Motion Library</span>
            </div>
            {DANCE_LIBRARY.map((dance) => (
              <button
                key={dance.name}
                type="button"
                className={`ps-motion-card${activeDanceName === dance.name ? " ps-motion-card--active" : ""}`}
                disabled={!wasmReady || wasmMotionPlaying || dancePlaying || liveTrackEnabled}
                onClick={() => void playDance(dance)}
                title={dance.name}
              >
                <span className="ps-motion-card-icon">
                  {dance.name === "Lezginka" ? "🔥" : "👋"}
                </span>
                <span className="ps-motion-card-name">{dance.name}</span>
                <svg className="ps-motion-card-play" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            ))}
          </div>
        </nav>

        {/* ── Right: Control Panel (overlay) ── */}
        <div className="ps-control-panel">
          {/* ── Tab bar ── */}
          <div className="ps-panel-tabs">
            <button
              type="button"
              className={`ps-panel-tab${panelTab === "joints" ? " ps-panel-tab--active" : ""}`}
              onClick={() => setPanelTab("joints")}
              title="Joints"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="16" x2="8" y2="22"/><line x1="12" y1="16" x2="16" y2="22"/></svg>
              <span>Joints</span>
            </button>
            <button
              type="button"
              className={`ps-panel-tab${panelTab === "timeline" ? " ps-panel-tab--active" : ""}`}
              onClick={() => setPanelTab("timeline")}
              title="Timeline"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Timeline</span>
            </button>
            <button
              type="button"
              className={`ps-panel-tab${panelTab === "capture" ? " ps-panel-tab--active" : ""}`}
              onClick={() => setPanelTab("capture")}
              title="Capture"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Capture</span>
            </button>
          </div>

          {/* ── Joints Tab ── */}
          {panelTab === "joints" && (
            <div className="ps-card ps-card--joints" style={{ flex: 1, minHeight: 0 }}>
              <div className="ps-card-header">
                <h3 className="ps-card-title">{t("pose.jointsPanelTitle")}</h3>
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
              <div className="ps-card-body ps-joints-scroll">
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
              </div>
            </div>
          )}

          {/* ── Timeline Tab ── */}
          {panelTab === "timeline" && (
            <>
              {/* Keyframes compact toolbar */}
              <div className="ps-kf-bar">
                <span className="ps-kf-label">
                  KF
                  {savedWasmPoses.length > 0 && (
                    <span className="ps-badge">{savedWasmPoses.length}/{MAX_SAVED_WASM_POSES}</span>
                  )}
                </span>
                <input
                  type="text"
                  className="ps-kf-input"
                  placeholder={t("pose.saveDraftPrompt")}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void saveWasmDraft(); }}
                  disabled={wasmMotionPlaying || liveTrackEnabled}
                />
                <button
                  type="button"
                  className="ps-kf-icon-btn ps-kf-icon-btn--save"
                  disabled={!mergedForExport || !draftName.trim() || wasmMotionPlaying || liveTrackEnabled}
                  onClick={() => void saveWasmDraft()}
                  title={t("pose.saveDraft")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                </button>
                <button
                  type="button"
                  className="ps-kf-icon-btn ps-kf-icon-btn--download"
                  disabled={!keyframesListForExport?.length || wasmMotionPlaying || liveTrackEnabled}
                  onClick={downloadSdkPoseJson}
                  title={t("pose.downloadSdkPoseJson")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </button>
                <button
                  type="button"
                  className="ps-kf-icon-btn ps-kf-icon-btn--danger"
                  disabled={savedWasmPoses.length === 0 || wasmMotionPlaying || liveTrackEnabled}
                  onClick={clearWasmSavedPoses}
                  title={t("pose.clearSavedPoses")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>

              <PoseTimeline
                timeline={nlaTimeline}
                currentTimeSec={timelineTimeSec}
                maxTimeSec={Math.max(timelineEndSec, 2)}
                disabled={wasmMotionPlaying || liveTrackEnabled}
                selectedTrackId={selectedTrackId}
                selectedJoint={selectedTrackJoint}
                onCurrentTimeChange={setTimelineTimeSec}
                onSelectTrack={(trackId) => setSelectedTrackId(trackId as NlaTrackId)}
                onSelectJoint={setSelectedTrackJoint}
                onAddKeyframe={addTimelineKeyframe}
                onDeleteKeyframe={deleteTimelineKeyframe}
                onMoveKeyframe={moveTimelineKeyframe}
                onUpdateBezierHandle={updateTimelineBezierHandle}
                onSetTrackWeight={setTrackWeight}
                onToggleTrack={toggleTrackEnabled}
                onSmoothJoint={smoothTimelineJoint}
              />
            </>
          )}

          {/* ── Capture Tab ── */}
          {panelTab === "capture" && (
            <>
              <div className="ps-card ps-kf-bar">
                <label className="ps-toggle ps-toggle--compact">
                  <input
                    type="checkbox"
                    checked={liveModeEnabled}
                    disabled={!retargetingEnabled}
                    onChange={(e) => setLiveModeEnabled(e.target.checked)}
                  />
                  <span className="ps-toggle-track"><span className="ps-toggle-thumb" /></span>
                  <span className="tag-secondary">{t("pose.liveModeToggle")}</span>
                </label>
                {!retargetingEnabled && <span className="muted">{t("pose.motionCaptureUnavailable")}</span>}
              </div>
              {telemetryMode === "dds" && (
                <div className="ps-card ps-error-panel">
                  <p className="warn" style={{ margin: 0 }}>
                    {t("pose.ddsModeWarning")}
                  </p>
                </div>
              )}
              <MotionCapturePanel
                enabled={retargetingEnabled && liveModeEnabled}
                onLiveTrackChange={setLiveTrackEnabled}
                onJointAnglesUpdate={onLiveTrackAngles}
                onLandmarksArtifactUploaded={setLandmarksArtifact}
                onLocalRecordingAvailable={buildNlaFromLocalRecording}
              />
              <MotionPipelinePanel
                apiMeta={apiMeta}
                landmarksArtifact={landmarksArtifact}
                onLandmarksArtifactChange={setLandmarksArtifact}
              />
            </>
          )}

          {/* Errors */}
          {(wasmViewerError || loadError) && (
            <div className="ps-card ps-error-panel" aria-live="polite">
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
