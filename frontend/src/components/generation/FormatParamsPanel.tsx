"use client";

import { AspectRatioPicker } from "@/components/generation/AspectRatioPicker";
import { Card } from "@/components/ui/Card";
import type { AspectRatioId } from "@/lib/generation-data";

type FormatParamsPanelProps = {
  step: number;
  aspectRatio: AspectRatioId;
  onAspectRatioChange: (value: AspectRatioId) => void;
};

export function FormatParamsPanel({
  step,
  aspectRatio,
  onAspectRatioChange,
}: FormatParamsPanelProps) {
  return (
    <Card hover>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-text text-[10px] font-semibold leading-none text-white">
          {step}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text">
          Формат
        </p>
      </div>

      <AspectRatioPicker value={aspectRatio} onChange={onAspectRatioChange} />
    </Card>
  );
}
