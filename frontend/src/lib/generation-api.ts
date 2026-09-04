import { ApiError, apiFetch, fetchBillingOverview, type BillingOverview } from "@/lib/api";
import type { GenerationModeId } from "@/lib/generation-data";
import { fetchProtectedMedia, mediaUrl } from "@/lib/media-display";

export type GenerationItem = {
  id: string;
  mode: string;
  prompt: string;
  model: string;
  aspect_ratio?: string;
  image_url: string;
  video_url?: string;
  media_type?: string;
  thumb_url?: string;
  created_at: string;
  used_in_post?: boolean;
};

export type GenerationPricing = {
  text_to_image: number;
  image_to_image: number;
  combine: number;
  media_credit_price_rub: number;
  text_to_image_wallet_rub: number;
  image_to_image_wallet_rub: number;
  combine_wallet_rub: number;
  credits_remaining?: number | null;
  unlimited?: boolean;
};

export type TextGenerationPricing = {
  input_per_1k: number;
  output_per_1k: number;
  currency: string;
};

export type GenerationJob = {
  id: string;
  status: string;
  kie_state: string;
  progress: number;
  mode?: string;
  token_cost?: number;
  credit_cost?: number;
  elapsed_ms?: number;
  duration_ms?: number;
  fail_message?: string;
  generation?: GenerationItem;
};

export type GenerationUploadResult = {
  id: string;
  url: string;
  thumb_url?: string;
  content_type: string;
};

type RawGenerationUpload = Partial<GenerationUploadResult> & { id?: string };

export function generationCostForMode(
  pricing: GenerationPricing,
  mode: GenerationModeId,
): number {
  switch (mode) {
    case "image-to-image":
      return pricing.image_to_image;
    case "combine":
      return pricing.combine;
    default:
      return pricing.text_to_image;
  }
}

export function generationWalletRubForMode(
  pricing: GenerationPricing,
  mode: GenerationModeId,
): number {
  switch (mode) {
    case "image-to-image":
      return pricing.image_to_image_wallet_rub;
    case "combine":
      return pricing.combine_wallet_rub;
    default:
      return pricing.text_to_image_wallet_rub;
  }
}

export function mediaCreditsFromOverview(overview: BillingOverview): number | null {
  const media = overview.media_balance;
  if (media?.unlimited) return null;
  return Math.max(0, (media?.quota_remaining ?? 0) + (media?.purchased_remaining ?? 0));
}

export async function fetchTextGenerationPricing() {
  try {
    return await apiFetch<{ pricing: TextGenerationPricing }>(
      "/generation/text-pricing",
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      return {
        pricing: {
          input_per_1k: 0,
          output_per_1k: 0,
          currency: "RUB",
        },
      };
    }
    throw err;
  }
}

export async function fetchGenerationPricing() {
  try {
    return await apiFetch<{ pricing: GenerationPricing }>("/generation/pricing");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      const overview = await fetchBillingOverview();
      return {
        pricing: {
          text_to_image: 1,
          image_to_image: 1,
          combine: 1,
          media_credit_price_rub: 50,
          text_to_image_wallet_rub: 50,
          image_to_image_wallet_rub: 50,
          combine_wallet_rub: 50,
          credits_remaining: mediaCreditsFromOverview(overview),
        },
      };
    }
    throw err;
  }
}

export async function fetchGenerationUsageHistory(limit = 50) {
  const qs = limit > 0 ? `?limit=${limit}` : "";
  return apiFetch<{ items: AIUsageHistoryItem[] }>(`/generation/usage-history${qs}`);
}

export type AIUsageHistoryItem = {
  id: string;
  created_at: string;
  mode: string;
  prompt: string;
  credit_cost: number;
  quota_credits_used: number;
  wallet_cents_charged: number;
  generation_id?: string | null;
  workspace_file_id?: string | null;
  ai_content_folder_id?: string | null;
  preview_url?: string;
  mime_type?: string;
};

export type GenerateImageBody = {
  mode: GenerationModeId;
  prompt: string;
  aspect_ratio: string;
  source_upload_id?: string;
  combine_upload_ids?: string[];
};

export type ComposePostTextPayload = {
  task?: string;
  text?: string;
  prompt?: string;
  tone?: string;
  length?: "short" | "medium" | "long";
};

export function composePostText(payload: ComposePostTextPayload) {
  return apiFetch<{ text: string }>("/generation/compose-text", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function improveGenerationPrompt(payload: {
  prompt: string;
  mode: GenerationModeId | string;
}) {
  return apiFetch<{ prompt: string }>("/generation/improve-prompt", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function startGeneration(body: GenerateImageBody) {
  return apiFetch<{ job: GenerationJob }>("/generation/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchGenerationJob(jobId: string) {
  return apiFetch<{ job: GenerationJob; credits_remaining?: number | null }>(
    `/generation/jobs/${encodeURIComponent(jobId)}`,
  );
}

const TERMINAL_JOB_STATUSES = new Set(["succeeded", "failed"]);

export function isGenerationJobDone(job: GenerationJob): boolean {
  return TERMINAL_JOB_STATUSES.has(job.status);
}

export function pollGenerationJob(
  jobId: string,
  onUpdate: (job: GenerationJob) => void,
  options?: { intervalMs?: number; maxMs?: number },
): Promise<{ job: GenerationJob; credits_remaining?: number | null }> {
  const intervalMs = options?.intervalMs ?? 2500;
  const maxMs = options?.maxMs ?? 15 * 60 * 1000;
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetchGenerationJob(jobId);
        onUpdate(res.job);
        if (isGenerationJobDone(res.job)) {
          resolve(res);
          return;
        }
        if (Date.now() - started > maxMs) {
          reject(new Error("Превышено время ожидания генерации"));
          return;
        }
        setTimeout(() => void tick(), intervalMs);
      } catch (err) {
        reject(err);
      }
    };
    void tick();
  });
}

export function fetchGenerationHistory(limit = 50) {
  return apiFetch<{ items: GenerationItem[] }>(
    `/generation/history?limit=${limit}`,
  );
}

export function deleteGenerationHistory(ids: string[]) {
  return apiFetch<{ deleted_ids: string[] }>("/generation/history/delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function uploadGenerationMedia(file: File): Promise<GenerationUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
  const res = await fetch(`${base}/generation/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }

  const payload = data as { upload?: RawGenerationUpload } & RawGenerationUpload;
  const raw = payload.upload ?? payload;
  if (!raw.id) {
    throw new ApiError(res.status, "Некорректный ответ сервера при загрузке фото");
  }
  return {
    id: raw.id,
    url: raw.url ?? "",
    thumb_url: raw.thumb_url,
    content_type: raw.content_type ?? file.type,
  };
}

export async function uploadGenerationMediaFromWorkspace(
  fileId: string,
): Promise<GenerationUploadResult> {
  const res = await apiFetch<{ upload?: RawGenerationUpload } & RawGenerationUpload>(
    "/generation/upload/from-file",
    {
      method: "POST",
      body: JSON.stringify({ file_id: fileId }),
    },
  );
  const raw = res.upload ?? res;
  if (!raw.id) {
    throw new ApiError(0, "Некорректный ответ сервера при загрузке с диска");
  }
  return {
    id: raw.id,
    url: raw.url ?? "",
    thumb_url: raw.thumb_url,
    content_type: raw.content_type ?? "",
  };
}

/** Downloads a generated image (auth via cookie) for attaching to sources. */
export async function fetchGenerationImageBlob(generationId: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetchProtectedMedia(
      mediaUrl(`/media/ai-generations/${encodeURIComponent(generationId)}`),
    );
  } catch {
    throw new ApiError(0, "Не удалось загрузить сгенерированное фото");
  }
  if (!res.ok) {
    throw new ApiError(res.status, "Не удалось загрузить сгенерированное фото");
  }
  return res.blob();
}
