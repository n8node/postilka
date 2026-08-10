"use client";

import { useEffect } from "react";
import {
  refreshActiveVideoGenerationJob,
  resumeVideoGenerationPoll,
} from "@/lib/video-generation-job-runner";
import { useVideoGenerationJobStore } from "@/lib/video-generation-job-store";

export function VideoGenerationJobSync() {
  const running = useVideoGenerationJobStore((s) => s.running);
  const jobId = useVideoGenerationJobStore((s) => s.jobId);
  const pollSerial = useVideoGenerationJobStore((s) => s.pollSerial);

  useEffect(() => {
    if (running && jobId) {
      resumeVideoGenerationPoll();
    }
  }, [running, jobId, pollSerial]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshActiveVideoGenerationJob();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, jobId]);

  return null;
}
