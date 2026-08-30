import {
  generationCostForMode,
  generationWalletRubForMode,
  type GenerationPricing,
  type TextGenerationPricing,
} from "@/lib/generation-api";
import { generationModeLabels, type GenerationModeId } from "@/lib/generation-data";
import { formatMediaCreditCost } from "@/lib/generation-format";
import {
  videoCostBreakdown,
  videoWalletRubForCost,
  type VideoGenerationPricing,
} from "@/lib/video-generation-api";
import {
  REFERENCE_VIDEO_MAX,
  videoModeLabels,
  type VideoGenerationModeId,
  type VideoGenerationUpload,
} from "@/lib/video-generation-data";

export type WorkflowEconomicsItem = {
  id: string;
  nodeTitle: string;
  category: string;
  unit: string;
  quotaLabel: string;
  walletRubles: number;
};

export type WorkflowEconomicsSummary = {
  textCount: number;
  imageCount: number;
  videoCount: number;
  socialCount: number;
  totalNodes: number;
  estimatedTokens: number;
  estimatedImageCredits: number;
  estimatedVideoCredits: number;
  estimatedMediaCredits: number;
  totalWalletRubles: number;
  hasUnknownVideoDuration: boolean;
  items: WorkflowEconomicsItem[];
};

export type WorkflowCostPricing = {
  image?: GenerationPricing | null;
  video?: VideoGenerationPricing | null;
  text?: TextGenerationPricing | null;
  /** duration_seconds from workspace files, keyed by file id */
  fileDurations?: Record<string, number>;
};

const FALLBACK_IMAGE_PRICING: GenerationPricing = {
  text_to_image: 1,
  image_to_image: 1,
  combine: 1,
  media_credit_price_rub: 50,
  text_to_image_wallet_rub: 50,
  image_to_image_wallet_rub: 50,
  combine_wallet_rub: 50,
};

const FALLBACK_VIDEO_PRICING: VideoGenerationPricing = {
  text_to_video: 25,
  image_to_video: 25,
  reference_to_video: 40,
  credits_per_second_text_to_video: 5,
  credits_per_second_image_to_video: 5,
  credits_per_second_reference_to_video: 8,
  credits_per_extra_reference_image: 3,
  free_reference_images: 5,
  default_duration_text_to_video: 5,
  default_duration_image_to_video: 5,
  default_duration_reference_to_video: 5,
  media_credit_price_rub: 50,
};

/** Same heuristic as backend estimateTextTokens: ceil(runes / 4). */
export function estimateTextTokens(text: string): number {
  const n = Array.from(text).length;
  if (n <= 0) return 0;
  return Math.floor((n + 3) / 4);
}

function roundRubles(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function filledSlotCount(
  data: Record<string, unknown>,
  urlsKey: string,
  idsKey: string,
): number {
  const urls = Array.isArray(data[urlsKey]) ? data[urlsKey] : [];
  const ids = Array.isArray(data[idsKey]) ? data[idsKey] : [];
  const n = Math.max(urls.length, ids.length);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const url = String(urls[i] ?? "").trim();
    const id = String(ids[i] ?? "").trim();
    if (url || id) count++;
  }
  return count;
}

function filledScalar(
  data: Record<string, unknown>,
  urlKey: string,
  idKey: string,
  ...aliases: string[]
): boolean {
  if (String(data[urlKey] ?? "").trim() || String(data[idKey] ?? "").trim()) {
    return true;
  }
  return aliases.some((key) => String(data[key] ?? "").trim() !== "");
}

function dummyUpload(
  kind: VideoGenerationUpload["mediaKind"],
  durationSeconds?: number,
): VideoGenerationUpload {
  return { uploadId: "1", previewUrl: "", mediaKind: kind, durationSeconds };
}

const NODE_VAR_RE = /^\{\{\s*([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)\s*\}\}$/;

type WorkflowCostNode = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

function slotStrings(raw: unknown, len: number): string[] {
  const arr = Array.isArray(raw) ? raw.map((item) => String(item ?? "").trim()) : [];
  while (arr.length < len) arr.push("");
  return arr.slice(0, len);
}

function slotNumbers(raw: unknown, len: number): number[] {
  const arr = Array.isArray(raw)
    ? raw.map((item) => {
        const n = Number(item);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })
    : [];
  while (arr.length < len) arr.push(0);
  return arr.slice(0, len);
}

function durationFromVariable(
  value: string,
  nodes: WorkflowCostNode[],
): number | undefined {
  const match = value.trim().match(NODE_VAR_RE);
  if (!match) return undefined;
  const source = nodes.find((n) => n.id === match[1]);
  if (!source) return undefined;
  if (source.type === "ai_video") {
    const d = Number(source.data.durationSeconds);
    return d > 0 ? d : 5;
  }
  const d = Number(
    source.data.durationSeconds ??
      source.data.videoDurationSeconds ??
      (source.data.media_metadata as { duration_seconds?: number } | undefined)
        ?.duration_seconds,
  );
  return d > 0 ? d : undefined;
}

function referenceVideoUploads(
  data: Record<string, unknown>,
  nodes: WorkflowCostNode[],
  fileDurations?: Record<string, number>,
): VideoGenerationUpload[] {
  const urls = slotStrings(data.referenceVideos, REFERENCE_VIDEO_MAX);
  const ids = slotStrings(data.referenceVideoFileIds, REFERENCE_VIDEO_MAX);
  const stored = slotNumbers(data.referenceVideoDurations, REFERENCE_VIDEO_MAX);
  const uploads: VideoGenerationUpload[] = [];
  for (let i = 0; i < REFERENCE_VIDEO_MAX; i++) {
    if (!urls[i] && !ids[i]) continue;
    let duration = stored[i] > 0 ? stored[i] : undefined;
    if (duration == null && ids[i] && fileDurations?.[ids[i]]) {
      duration = fileDurations[ids[i]];
    }
    if (duration == null && urls[i]) {
      duration = durationFromVariable(urls[i], nodes);
    }
    uploads.push({
      uploadId: ids[i] || "1",
      previewUrl: urls[i] || "",
      mediaKind: "video",
      durationSeconds: duration,
    });
  }
  return uploads;
}

function imageModeOf(data: Record<string, unknown>): GenerationModeId {
  const mode = String(data.mode ?? "");
  if (mode === "image-to-image" || mode === "combine") return mode;
  return "text-to-image";
}

function videoModeOf(data: Record<string, unknown>): VideoGenerationModeId {
  const mode = String(data.mode ?? "");
  if (mode === "image-to-video" || mode === "reference-to-video") return mode;
  return "text-to-video";
}

function textWalletRubles(
  pricing: TextGenerationPricing | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!pricing) return 0;
  const input = Math.max(0, inputTokens) / 1000 * (pricing.input_per_1k || 0);
  const output = Math.max(0, outputTokens) / 1000 * (pricing.output_per_1k || 0);
  return roundRubles(input + output);
}

export function calculateWorkflowCost(
  nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>,
  pricing?: WorkflowCostPricing | null,
): WorkflowEconomicsSummary {
  const imagePricing = pricing?.image ?? FALLBACK_IMAGE_PRICING;
  const videoPricing = pricing?.video ?? FALLBACK_VIDEO_PRICING;
  const textPricing = pricing?.text ?? null;

  let textCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  let socialCount = 0;
  let estimatedTokens = 0;
  let estimatedImageCredits = 0;
  let estimatedVideoCredits = 0;
  let totalWalletRubles = 0;
  let hasUnknownVideoDuration = false;
  const items: WorkflowEconomicsItem[] = [];

  nodes.forEach((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const title = String(data.title || n.type);

    if (n.type === "ai_text") {
      textCount++;
      const role = String(data.role || "Опытный SMM-копирайтер");
      const prompt = String(data.prompt || "");
      const inputTokens = estimateTextTokens(role) + estimateTextTokens(prompt);
      const outputTokens = Math.max(200, inputTokens);
      const tokens = inputTokens + outputTokens;
      estimatedTokens += tokens;
      const rubles = textWalletRubles(textPricing, inputTokens, outputTokens);
      totalWalletRubles += rubles;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Текст AI",
        unit: `1 генерация (~${tokens} ток.: ${inputTokens} вход + ~${outputTokens} выход)`,
        quotaLabel: `~${tokens} токенов из квоты тарифа`,
        walletRubles: rubles,
      });
      return;
    }

    if (n.type === "ai_image") {
      imageCount++;
      const mode = imageModeOf(data);
      const credits = generationCostForMode(imagePricing, mode);
      const rubles = generationWalletRubForMode(imagePricing, mode);
      estimatedImageCredits += credits;
      totalWalletRubles += rubles;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Изображение AI",
        unit: `${generationModeLabels[mode]} · ${formatMediaCreditCost(credits)}`,
        quotaLabel: `${formatMediaCreditCost(credits)} из квоты тарифа`,
        walletRubles: rubles,
      });
      return;
    }

    if (n.type === "ai_video") {
      videoCount++;
      const mode = videoModeOf(data);
      const duration = Number(data.durationSeconds) || 5;
      const firstFrame = filledScalar(
        data,
        "firstFrame",
        "firstFrameFileId",
      )
        ? dummyUpload("image")
        : null;
      const lastFrame = filledScalar(data, "lastFrame", "lastFrameFileId")
        ? dummyUpload("image")
        : null;
      const imageSlots = filledSlotCount(
        data,
        "referenceImages",
        "referenceImageFileIds",
      );
      const refVideos =
        mode === "reference-to-video"
          ? referenceVideoUploads(data, nodes, pricing?.fileDurations)
          : [];
      const breakdown = videoCostBreakdown(videoPricing, {
        mode,
        duration,
        firstFrame,
        lastFrame,
        referenceImages: Array.from({ length: imageSlots }, () =>
          dummyUpload("image"),
        ),
        referenceVideos: refVideos,
      });
      if (breakdown.hasUnknownInputVideoDuration) {
        hasUnknownVideoDuration = true;
      }
      const credits = breakdown.totalCredits;
      const rubles = videoWalletRubForCost(videoPricing, credits);
      estimatedVideoCredits += credits;
      totalWalletRubles += rubles;
      const extras: string[] = [];
      if (breakdown.inputVideoDurationSeconds > 0) {
        extras.push(`+${breakdown.inputVideoDurationSeconds} сек реф. видео`);
      }
      if (breakdown.extraImageCount > 0) {
        extras.push(
          `+${breakdown.extraImageCount} фото сверх бесплатных`,
        );
      }
      if (breakdown.hasUnknownInputVideoDuration) {
        extras.push("реф. видео без длительности");
      }
      const extraLabel = extras.length > 0 ? ` · ${extras.join(", ")}` : "";
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Видео AI",
        unit: `${videoModeLabels[mode]}, ${breakdown.outputDurationSeconds} сек выход · ${formatMediaCreditCost(credits)}${extraLabel}`,
        quotaLabel: `${formatMediaCreditCost(credits)} из квоты тарифа`,
        walletRubles: rubles,
      });
      return;
    }

    if (n.type.startsWith("social_")) {
      socialCount++;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Публикация",
        unit: "1 публикация",
        quotaLabel: "Лимит постов тарифа",
        walletRubles: 0,
      });
    }
  });

  return {
    textCount,
    imageCount,
    videoCount,
    socialCount,
    totalNodes: nodes.length,
    estimatedTokens,
    estimatedImageCredits,
    estimatedVideoCredits,
    estimatedMediaCredits: estimatedImageCredits + estimatedVideoCredits,
    totalWalletRubles: roundRubles(totalWalletRubles),
    hasUnknownVideoDuration,
    items,
  };
}

export function formatWorkflowCostChip(summary: WorkflowEconomicsSummary): string {
  const parts: string[] = [];
  if (summary.estimatedMediaCredits > 0) {
    parts.push(`~${summary.estimatedMediaCredits} кред.`);
  }
  if (summary.estimatedTokens > 0) {
    parts.push(`~${summary.estimatedTokens} ток.`);
  }
  if (summary.totalWalletRubles > 0) {
    const digits = summary.totalWalletRubles >= 10 ? 0 : 1;
    parts.push(`~${summary.totalWalletRubles.toFixed(digits)} ₽`);
  }
  return parts.length > 0 ? parts.join(" · ") : "0 ₽";
}
