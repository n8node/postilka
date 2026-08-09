"use client";

import { aspectRatios, type AspectRatioId } from "@/lib/generation-data";
import { cn } from "@/lib/utils";

type AspectRatioPickerProps = {
  value: AspectRatioId;
  onChange: (value: AspectRatioId) => void;
};

export function AspectRatioPicker({ value, onChange }: AspectRatioPickerProps) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.04em] text-zinc-400">
        Соотношение сторон
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {aspectRatios.map((ratio) => {
          const selected = value === ratio.id;

          return (
            <button
              key={ratio.id}
              type="button"
              onClick={() => onChange(ratio.id)}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-lg border px-1 py-3 transition-colors",
                selected
                  ? "border-accent bg-blue-50 text-blue-900"
                  : "border-border bg-bg text-muted hover:border-zinc-300",
              )}
            >
              <div className="flex h-6 items-center justify-center">
                <div
                  aria-hidden
                  className={cn(
                    "rounded-[2px] border-[1.5px] border-solid",
                    selected ? "border-accent" : "border-zinc-400",
                  )}
                  style={{ width: ratio.iconW, height: ratio.iconH }}
                />
              </div>
              <span className="text-[11px] font-medium leading-none">
                {ratio.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
