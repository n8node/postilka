"use client";

import { Film, Wand2 } from "lucide-react";
import { RotatingGenerationPhrase } from "@/components/generation/RotatingGenerationPhrase";
import { RotatingVideoGenerationPhrase } from "@/components/generation/RotatingVideoGenerationPhrase";
import { useSmoothProgress } from "@/components/generation/useSmoothProgress";

type GenerationProgressPanelProps = {
  progress: number;
  status: string;
  active: boolean;
  empty?: boolean;
  variant?: "image" | "video";
};

export function GenerationProgressPanel({
  progress,
  status,
  active,
  empty = false,
  variant = "image",
}: GenerationProgressPanelProps) {
  const pct = useSmoothProgress(progress, active);
  const isVideo = variant === "video";
  const Icon = isVideo ? Film : Wand2;

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
      <div
        className={[
          "generation-shimmer-wrap mb-4",
          active ? "generation-shimmer-wrap--active" : "",
        ].join(" ")}
      >
        <div className="generation-shimmer-inner flex h-12 w-12 items-center justify-center rounded-[10px] border border-border bg-surface">
          <Icon
            size={22}
            className={active ? "text-accent" : "text-zinc-400"}
          />
        </div>
      </div>

      {active ? (
        <div className="mb-4 w-full max-w-[320px]">
          <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
            {isVideo ? (
              <RotatingVideoGenerationPhrase status={status} active={active} />
            ) : (
              <RotatingGenerationPhrase status={status} active={active} />
            )}
            <span className="shrink-0 tabular-nums text-accent">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="generation-progress-bar h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {empty && !active ? (
        <p className="max-w-[360px] text-[13px] leading-relaxed text-muted">
          {isVideo
            ? "Здесь появится сгенерированное видео. Выберите режим, опишите сцену и нажмите «Сгенерировать»."
            : "Здесь появится сгенерированное фото. Выберите режим, опишите что хотите получить и нажмите «Сгенерировать»."}
        </p>
      ) : null}
    </div>
  );
}
