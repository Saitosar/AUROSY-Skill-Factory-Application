import { useState, useCallback } from "react";
import {
  ingestYouTubeVideo,
  getVideoMetadata,
  enqueueVideoProcess,
  getJob,
  isTerminalJobStatus,
  type VideoIngestResponse,
  type VideoMetadata,
  type VideoProcessJobResult,
} from "../api/client";

export type VideoIngestState = {
  isLoading: boolean;
  error: string | null;
  video: VideoIngestResponse | null;
  processingJobId: string | null;
  processingStatus: string | null;
  processResult: VideoProcessJobResult | null;
};

export function useVideoIngest() {
  const [state, setState] = useState<VideoIngestState>({
    isLoading: false,
    error: null,
    video: null,
    processingJobId: null,
    processingStatus: null,
    processResult: null,
  });

  const ingest = useCallback(
    async (
      youtubeUrl: string,
      options?: { startSec?: number; endSec?: number; maxDurationSec?: number }
    ): Promise<VideoIngestResponse | null> => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const result = await ingestYouTubeVideo({
          youtube_url: youtubeUrl,
          start_sec: options?.startSec ?? null,
          end_sec: options?.endSec ?? null,
          max_duration_sec: options?.maxDurationSec ?? 120,
        });
        setState((s) => ({ ...s, isLoading: false, video: result }));
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setState((s) => ({ ...s, isLoading: false, error: msg }));
        return null;
      }
    },
    []
  );

  const startProcessing = useCallback(
    async (
      videoId: string,
      options?: { targetFps?: number; startSec?: number; endSec?: number }
    ): Promise<string | null> => {
      setState((s) => ({
        ...s,
        isLoading: true,
        error: null,
        processingStatus: "queued",
        processResult: null,
      }));
      try {
        const { job_id } = await enqueueVideoProcess({
          video_id: videoId,
          target_fps: options?.targetFps ?? 30,
          start_sec: options?.startSec ?? null,
          end_sec: options?.endSec ?? null,
        });
        setState((s) => ({ ...s, isLoading: false, processingJobId: job_id }));
        return job_id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setState((s) => ({ ...s, isLoading: false, error: msg, processingStatus: null }));
        return null;
      }
    },
    []
  );

  const pollProcessingStatus = useCallback(async (): Promise<boolean> => {
    const { processingJobId } = state;
    if (!processingJobId) return false;

    try {
      const job = await getJob(processingJobId);
      const status = job.status ?? "unknown";
      setState((s) => ({ ...s, processingStatus: status }));

      if (isTerminalJobStatus(status)) {
        if (status === "succeeded") {
          setState((s) => ({
            ...s,
            processResult: {
              status: "ok",
            },
          }));
        }
        return true;
      }
      return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, error: msg }));
      return true;
    }
  }, [state.processingJobId]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      video: null,
      processingJobId: null,
      processingStatus: null,
      processResult: null,
    });
  }, []);

  return {
    ...state,
    ingest,
    startProcessing,
    pollProcessingStatus,
    reset,
  };
}
