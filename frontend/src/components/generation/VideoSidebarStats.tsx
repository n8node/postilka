"use client";

import { Clock, Coins, Zap } from "lucide-react";
import {
  videoCostBreakdown,
  type VideoGenerationCostInput,
  type VideoGenerationPricing,
} from "@/lib/video-generation-api";
import {
  formatGenerationDuration,
  formatMediaCreditCost,
} from "@/lib/generation-format";
import {
  type VideoGenerationModeId,
  videoModeLabels,
} from "@/lib/video-generation-data";
import { Card } from "@/components/ui/Card";
import { MediaSpendHint, mediaQuotaHeadline } from "@/components/billing/MediaSpendHint";
import { useBillingBalancesStore } from "@/lib/billing-balances-store";

type LastRunStats = {
  tokenCost: number;
  durationMs: number;
};

type VideoSidebarStatsProps = {
  creditsRemaining: number | null;
  mode: VideoGenerationModeId;
  duration: number;
  pricing: VideoGenerationPricing | null;
  costInput: Omit<VideoGenerationCostInput, "mode" | "duration">;
  generating: boolean;
  generationStartedAt: number | null;
  lastRun: LastRunStats | null;
};

function clientElapsedMs(generationStartedAt: number | null): number {
  if (generationStartedAt === null) return 0;
  return Math.max(0, Date.now() - generationStartedAt);
}

function formatCostBreakdown(
  breakdown: ReturnType<typeof videoCostBreakdown>,
): string {
  const parts: string[] = [];
  if (breakdown.inputVideoDurationSeconds > 0) {
    parts.push(
      `${breakdown.outputDurationSeconds} сек выход + ${breakdown.inputVideoDurationSeconds} сек реф.видео`,
    );
  } else {
    parts.push(`${breakdown.outputDurationSeconds} сек`);
  }
  parts.push(`× ${breakdown.ratePerSecond} кред/сек`);
  if (breakdown.extraImageCount > 0) {
    parts.push(
      `+ ${breakdown.extraImageCount} доп. фото × ${breakdown.extraImageCredits / breakdown.extraImageCount} кред`,
    );
  }
  return parts.join(" · ");
}

export function VideoSidebarStats({
  creditsRemaining,
  mode,
  duration,
  pricing,
  costInput,
  generating,
  generationStartedAt,
  lastRun,
}: VideoSidebarStatsProps) {
  const balances = useBillingBalancesStore((s) => s.balances);
  const breakdown =
    pricing !== null
      ? videoCostBreakdown(pricing, { mode, duration, ...costInput })
      : null;
  const elapsedMs = generating ? clientElapsedMs(generationStartedAt) : 0;
  const showLastRun = !generating && lastRun !== null;

  return (
    <Card className="border-blue-200 bg-blue-50 p-4" hover={false}>
      <div className="flex items-start gap-3">
        <Zap size={18} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-blue-900">
            {mediaQuotaHeadline(balances, creditsRemaining)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-accent">
            <MediaSpendHint creditsRemaining={creditsRemaining} />
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-blue-200/60 bg-surface/60 p-3">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="flex items-center gap-2 text-muted">
            <Coins size={14} className="shrink-0 text-accent" />
            Стоимость
          </span>
          <span className="font-medium text-blue-900">
            {breakdown !== null
              ? formatMediaCreditCost(breakdown.totalCredits)
              : "—"}
          </span>
          <span className="col-span-2 text-[10px] leading-snug text-zinc-400">
            {breakdown !== null ? formatCostBreakdown(breakdown) : "—"}
          </span>
          {breakdown?.hasUnknownInputVideoDuration ? (
            <span className="col-span-2 text-[10px] leading-snug text-amber-700">
              Длительность части референс-видео неизвестна — итог может быть выше
            </span>
          ) : null}
          <span className="col-span-2 text-[10px] leading-snug text-zinc-400">
            Режим «{videoModeLabels[mode]}»
            {breakdown && breakdown.inputImageCount > breakdown.freeReferenceImages
              ? ` · ${breakdown.inputImageCount} фото (${breakdown.freeReferenceImages} бесплатно у KIE)`
              : null}
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-[1fr_auto] items-center gap-x-3 border-t border-border/80 pt-2.5 text-[12px]">
          <span className="flex items-center gap-2 text-muted">
            <Clock size={14} className="shrink-0 text-accent" />
            {generating ? "Время" : "Длительность"}
          </span>
          <span className="font-medium tabular-nums text-blue-900">
            {generating
              ? formatGenerationDuration(elapsedMs)
              : showLastRun
                ? formatGenerationDuration(lastRun.durationMs)
                : "—"}
          </span>
        </div>

        {showLastRun ? (
          <p className="mt-2 border-t border-border/80 pt-2 text-[10px] leading-snug text-zinc-400">
            Последняя генерация · списано{" "}
            {formatMediaCreditCost(lastRun.tokenCost)}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
