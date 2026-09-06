import { ApiError, apiFetch, fetchBillingOverview, type BillingOverview } from "@/lib/api";
import type { GenerationJob } from "@/lib/generation-api";
import { postGenerationMultipart } from "@/lib/generation-upload";
import type { VideoGenerationModeId } from "@/lib/video-generation-data";
import {
  KIE_VIDEO_FREE_REFERENCE_IMAGES,
  VIDEO_DURATION_MAX,
  VIDEO_DURATION_MIN,
  type VideoGenerationUpload,
} from "@/lib/video-generation-data";
import { useGenerationCreditsStore } from "@/lib/generation-credits-store";

export type VideoGenerationPricing = {
  text_to_video: number;
  image_to_video: number;
  reference_to_video: number;
  credits_per_second_text_to_video: number;
  credits_per_second_image_to_video: number;
  credits_per_second_reference_to_video: number;
  credits_per_extra_reference_image: number;
  free_reference_images: number;
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

export type VideoGenerationCostInput = {
  mode: VideoGenerationModeId;
  duration: number;
  firstFrame: VideoGenerationUpload | null;
  lastFrame: VideoGenerationUpload | null;
  referenceImages: (VideoGenerationUpload | null)[];
  referenceVideos: (VideoGenerationUpload | null)[];
};

export type VideoGenerationCostBreakdown = {
  outputDurationSeconds: number;
  inputVideoDurationSeconds: number;
  billableSeconds: number;
  ratePerSecond: number;
  baseCredits: number;
  inputImageCount: number;
  freeReferenceImages: number;
  extraImageCount: number;
  extraImageCredits: number;
  totalCredits: number;
  hasUnknownInputVideoDuration: boolean;
};

function clampDuration(n: number): number {
  if (n < VIDEO_DURATION_MIN) return VIDEO_DURATION_MIN;
  if (n > VIDEO_DURATION_MAX) return VIDEO_DURATION_MAX;
  return n;
}

function ceilSeconds(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value);
}

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

export function inputImageCountForVideoMode(input: VideoGenerationCostInput): number {
  switch (input.mode) {
    case "reference-to-video":
      return input.referenceImages.filter((item) => item !== null).length;
    case "image-to-video": {
      let count = 0;
      if (input.firstFrame) count++;
      if (input.lastFrame) count++;
      return count;
    }
    default:
      return 0;
  }
}

export function videoCostBreakdown(
  pricing: VideoGenerationPricing,
  input: VideoGenerationCostInput,
): VideoGenerationCostBreakdown {
  const outputDurationSeconds = clampDuration(input.duration);
  const ratePerSecond = creditsPerSecondForMode(pricing, input.mode);
  const freeReferenceImages =
    pricing.free_reference_images > 0
      ? pricing.free_reference_images
      : KIE_VIDEO_FREE_REFERENCE_IMAGES;
  const extraImageRate = Math.max(0, pricing.credits_per_extra_reference_image ?? 0);

  let inputVideoDurationSeconds = 0;
  let hasUnknownInputVideoDuration = false;
  for (const item of input.referenceVideos) {
    if (!item) continue;
    if (
      item.durationSeconds == null ||
      !Number.isFinite(item.durationSeconds) ||
      item.durationSeconds <= 0
    ) {
      hasUnknownInputVideoDuration = true;
      continue;
    }
    inputVideoDurationSeconds += ceilSeconds(item.durationSeconds);
  }

  const billableSeconds = outputDurationSeconds + inputVideoDurationSeconds;
  const baseCredits = billableSeconds * ratePerSecond;
  const inputImageCount = inputImageCountForVideoMode(input);
  const extraImageCount = Math.max(0, inputImageCount - freeReferenceImages);
  const extraImageCredits = extraImageCount * extraImageRate;

  return {
    outputDurationSeconds,
    inputVideoDurationSeconds,
    billableSeconds,
    ratePerSecond,
    baseCredits,
    inputImageCount,
    freeReferenceImages,
    extraImageCount,
    extraImageCredits,
    totalCredits: baseCredits + extraImageCredits,
    hasUnknownInputVideoDuration,
  };
}

export function videoCostForModeDuration(
  pricing: VideoGenerationPricing,
  mode: VideoGenerationModeId,
  duration: number,
): number {
  return videoCostBreakdown(pricing, {
    mode,
    duration,
    firstFrame: null,
    lastFrame: null,
    referenceImages: [],
    referenceVideos: [],
  }).totalCredits;
}

export function videoWalletRubForCost(
  pricing: VideoGenerationPricing,
  credits: number,
): number {
  return credits * pricing.media_credit_price_rub;
}

function mediaCreditsFromOverview(overview: BillingOverview): number | null {
  const media = overview.media_balance;
  if (media?.unlimited) return null;
  return Math.max(0, (media?.quota_remaining ?? 0) + (media?.purchased_remaining ?? 0));
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
          credits_per_extra_reference_image: 3,
          free_reference_images: KIE_VIDEO_FREE_REFERENCE_IMAGES,
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
  opts?: {
    intervalMs?: number;
    maxMs?: number;
    shouldContinue?: () => boolean;
  },
): Promise<VideoGenerationJob> {
  const intervalMs = opts?.intervalMs ?? 3000;
  const maxMs = opts?.maxMs ?? 30 * 60 * 1000;
  const started = Date.now();

  for (;;) {
    if (opts?.shouldContinue && !opts.shouldContinue()) {
      const abort = new Error("poll superseded");
      abort.name = "AbortError";
      throw abort;
    }
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
  const res = await postGenerationMultipart<{
    upload: {
      id: string;
      content_type: string;
      created_at: string;
      duration_seconds?: number;
    };
  }>("/generation/video/upload", form);
  return {
    id: res.upload.id,
    content_type: res.upload.content_type,
    duration_seconds: res.upload.duration_seconds,
    url: "",
  };
}

export async function uploadVideoGenerationMediaFromWorkspace(fileId: string) {
  const res = await apiFetch<{
    upload: {
      id: string;
      content_type: string;
      created_at: string;
      duration_seconds?: number;
    };
  }>("/generation/video/upload/from-file", {
    method: "POST",
    body: JSON.stringify({ file_id: fileId }),
  });
  return {
    id: res.upload.id,
    content_type: res.upload.content_type,
    duration_seconds: res.upload.duration_seconds,
  };
}

export async function uploadVideoGenerationMediaFromGeneration(generationId: string) {
  const res = await apiFetch<{ upload: { id: string; content_type: string; duration_seconds?: number } }>(
    "/generation/video/upload/from-generation",
    { method: "POST", body: JSON.stringify({ generation_id: generationId }) },
  );
  return { id: res.upload.id, content_type: res.upload.content_type, duration_seconds: res.upload.duration_seconds };
}

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
