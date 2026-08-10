import { ApiError, apiFetch, fetchBillingOverview, type BillingOverview } from "@/lib/api";
import type { VideoGenerationModeId } from "@/lib/video-generation-data";
import { VIDEO_DURATION_MAX, VIDEO_DURATION_MIN } from "@/lib/video-generation-data";
import { useGenerationCreditsStore } from "@/lib/generation-credits-store";
import type { GenerationJob } from "@/lib/generation-api";

export type VideoGenerationItem = {
  id: string;
  mode: string;
  prompt: string;
  model: string;
  aspect_ratio?: string;
  video_duration_seconds?: number;
  video_url?: string;
  image_url: string;
  thumb_url?: string;
  media_type?: string;
  created_at: string;
  used_in_post?: boolean;
};

export type VideoGenerationPricing = {
  text_to_video: number;
  image_to_video: number;
  reference_to_video: number;
  credits_per_second_text_to_video: number;
  credits_per_second_image_to_video: number;
  credits_per_second_reference_to_video: number;
  default_duration_text_to_video: number;
  default_duration_image_to_video: number;
  default_duration_reference_to_video: number;
  media_credit_price_rub: number;
  credits_remaining?: number | null;
  unlimited?: boolean;
};

export type VideoGenerationJob = GenerationJob & {
  video_duration_seconds?: number;
};

export type GenerateVideoBody = {
  mode: VideoGenerationModeId;
  prompt: string;
  aspect_ratio: string;
  duration: number;
  source_upload_id?: string;
  last_frame_upload_id?: string;
  reference_upload_ids?: string[];
  reference_video_upload_ids?: string[];
  reference_audio_upload_ids?: string[];
};

export function creditsPerSecondForMode(
  pricing: VideoGenerationPricing,
  mode: VideoGenerationModeId,
): number {
  switch (mode) {
    case "image-to-video":
      return pricing.credits_per_second_image_to_video;
    case "reference-to-video":
      return pricing.credits_per_second_reference_to_video;
    default:
      return pricing.credits_per_second_text_to_video;
  }
}

export function defaultDurationForMode(
  pricing: VideoGenerationPricing,
  mode: VideoGenerationModeId,
): number {
  switch (mode) {
    case "image-to-video":
      return pricing.default_duration_image_to_video;
    case "reference-to-video":
      return pricing.default_duration_reference_to_video;
    default:
      return pricing.default_duration_text_to_video;
  }
}

export function videoCostForModeDuration(
  pricing: VideoGenerationPricing,
  mode: VideoGenerationModeId,
  duration: number,
): number {
  const sec = clampDuration(duration);
  return sec * creditsPerSecondForMode(pricing, mode);
}

export function videoWalletRubForCost(
  pricing: VideoGenerationPricing,
  credits: number,
): number {
  return credits * pricing.media_credit_price_rub;
}

function clampDuration(n: number): number {
  if (n < VIDEO_DURATION_MIN) return VIDEO_DURATION_MIN;
  if (n > VIDEO_DURATION_MAX) return VIDEO_DURATION_MAX;
  return n;
}

function mediaCreditsFromOverview(overview: BillingOverview): number | null {
  const quota = overview.plan?.ai_media_credits_quota;
  if (quota == null) return null;
  return Math.max(0, quota - overview.usage.ai_media_credits_used);
}

export async function fetchVideoGenerationPricing() {
  try {
    return await apiFetch<{ pricing: VideoGenerationPricing }>(
      "/generation/video/pricing",
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      const overview = await fetchBillingOverview();
      return {
        pricing: {
          text_to_video: 25,
          image_to_video: 25,
          reference_to_video: 40,
          credits_per_second_text_to_video: 5,
          credits_per_second_image_to_video: 5,
          credits_per_second_reference_to_video: 8,
          default_duration_text_to_video: 5,
          default_duration_image_to_video: 5,
          default_duration_reference_to_video: 5,
          media_credit_price_rub: 50,
          credits_remaining: mediaCreditsFromOverview(overview),
        },
      };
    }
    throw err;
  }
}

export async function startVideoGeneration(body: GenerateVideoBody) {
  return apiFetch<{ job: VideoGenerationJob }>("/generation/video/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchVideoGenerationJob(jobId: string) {
  return apiFetch<{
    job: VideoGenerationJob;
    credits_remaining?: number | null;
  }>(`/generation/video/jobs/${encodeURIComponent(jobId)}`);
}

export async function fetchVideoGenerationHistory(limit = 50) {
  const qs = limit > 0 ? `?limit=${limit}` : "";
  return apiFetch<{ items: VideoGenerationItem[] }>(
    `/generation/video/history${qs}`,
  );
}

export async function deleteVideoGenerationHistory(ids: string[]) {
  return apiFetch<{ deleted_ids: string[] }>(
    "/generation/video/history/delete",
    {
      method: "POST",
      body: JSON.stringify({ ids }),
    },
  );
}

export async function pollVideoGenerationJob(
  jobId: string,
  onUpdate: (job: VideoGenerationJob) => void,
  opts?: { intervalMs?: number; maxMs?: number },
): Promise<VideoGenerationJob> {
  const intervalMs = opts?.intervalMs ?? 3000;
  const maxMs = opts?.maxMs ?? 30 * 60 * 1000;
  const started = Date.now();

  for (;;) {
    const res = await fetchVideoGenerationJob(jobId);
    onUpdate(res.job);
    if (res.credits_remaining !== undefined) {
      useGenerationCreditsStore.getState().setCreditsRemaining(res.credits_remaining);
    }
    if (res.job.status === "succeeded" || res.job.status === "failed") {
      return res.job;
    }
    if (Date.now() - started > maxMs) {
      throw new Error("Превышено время ожидания генерации видео");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export async function uploadVideoGenerationMedia(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<{
    upload: { id: string; content_type: string; created_at: string };
  }>("/generation/video/upload", {
    method: "POST",
    body: form,
  });
  return {
    id: res.upload.id,
    content_type: res.upload.content_type,
    url: "",
  };
}
