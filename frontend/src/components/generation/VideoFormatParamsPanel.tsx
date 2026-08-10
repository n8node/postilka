"use client";

import {
  aspectBoxSize,
  VIDEO_SUPPORTED_ASPECT_RATIOS,
  type VideoAspectRatioId,
} from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

type VideoFormatParamsPanelProps = {
  step: number;
  aspectRatio: VideoAspectRatioId;
  duration: number;
  onAspectRatioChange: (value: VideoAspectRatioId) => void;
  onDurationChange: (value: number) => void;
  disabled?: boolean;
};

export function VideoFormatParamsPanel({
  step,
  aspectRatio,
  duration,
  onAspectRatioChange,
  onDurationChange,
  disabled,
}: VideoFormatParamsPanelProps) {
  return (
    <Card hover>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
        {step} · Формат и длительность
      </p>

      <p className="mb-2 text-[11px] text-zinc-400">Ориентация</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {VIDEO_SUPPORTED_ASPECT_RATIOS.map((ratio) => {
          const { w, h } = aspectBoxSize(ratio);
          const selected = aspectRatio === ratio;
          return (
            <button
              key={ratio}
              type="button"
              disabled={disabled}
              onClick={() => onAspectRatioChange(ratio)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2 transition-colors",
                selected
                  ? "border-blue-200 bg-blue-50"
                  : "border-border bg-bg hover:border-zinc-300",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded border bg-white",
                  selected ? "border-blue-300" : "border-zinc-200",
                )}
                style={{ width: w, height: h }}
              >
                <span className="text-[9px] font-medium text-zinc-500">
                  {ratio}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-400">Длительность</p>
        <span className="text-[12px] font-medium tabular-nums text-text">
          {duration} сек
        </span>
      </div>
      <input
        type="range"
        min={4}
        max={15}
        step={1}
        value={duration}
        disabled={disabled}
        onChange={(e) => onDurationChange(Number(e.target.value))}
        className="mt-2 w-full accent-accent"
      />
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>4 сек</span>
        <span>15 сек</span>
      </div>
    </Card>
  );
}
