"use client";

import { useEffect } from "react";
import {
  refreshActiveGenerationJob,
  resumeGenerationPoll,
} from "@/lib/generation-job-runner";
import { useGenerationJobStore } from "@/lib/generation-job-store";

/** Keeps generation polling alive across dashboard route changes. */
export function GenerationJobSync() {
  const running = useGenerationJobStore((s) => s.running);
  const jobId = useGenerationJobStore((s) => s.jobId);
  const pollSerial = useGenerationJobStore((s) => s.pollSerial);

  useEffect(() => {
    if (running && jobId) {
      resumeGenerationPoll();
    }
  }, [running, jobId, pollSerial]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshActiveGenerationJob();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, jobId]);

  return null;
}
