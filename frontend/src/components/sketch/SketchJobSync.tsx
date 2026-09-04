"use client";

import { useEffect } from "react";
import { refreshActiveSketchJob, resumeSketchPoll } from "@/lib/sketch-job-runner";
import { useSketchJobStore } from "@/lib/sketch-job-store";

export function SketchJobSync() {
  const running = useSketchJobStore((s) => s.running);
  const jobId = useSketchJobStore((s) => s.jobId);
  const pollSerial = useSketchJobStore((s) => s.pollSerial);

  useEffect(() => {
    if (running && jobId) {
      resumeSketchPoll();
    }
  }, [running, jobId, pollSerial]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      refreshActiveSketchJob();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, jobId]);

  return null;
}
