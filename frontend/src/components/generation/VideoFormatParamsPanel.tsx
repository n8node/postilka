"use client";

import { AspectRatioPicker } from "@/components/generation/AspectRatioPicker";
import { Card } from "@/components/ui/Card";
import {
  videoAspectRatios,
  type VideoAspectRatioId,
} from "@/lib/video-generation-data";

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
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-text text-[10px] font-semibold leading-none text-white">
          {step}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text">
          Формат и длительность
        </p>
      </div>

      <AspectRatioPicker
        value={aspectRatio}
        onChange={onAspectRatioChange}
        ratios={videoAspectRatios}
        disabled={disabled}
        columnsClassName="grid-cols-3 sm:grid-cols-6"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
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
