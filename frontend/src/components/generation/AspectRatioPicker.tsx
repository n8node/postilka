"use client";

import { aspectRatios, type AspectRatioId } from "@/lib/generation-data";
import { cn } from "@/lib/utils";

export type AspectRatioOption<T extends string = string> = {
  id: T;
  label: string;
  iconW: number;
  iconH: number;
};

type AspectRatioPickerProps<T extends string = AspectRatioId> = {
  value: T;
  onChange: (value: T) => void;
  ratios?: AspectRatioOption<T>[];
  disabled?: boolean;
  columnsClassName?: string;
};

export function AspectRatioPicker<T extends string = AspectRatioId>({
  value,
  onChange,
  ratios,
  disabled = false,
  columnsClassName = "grid-cols-2 sm:grid-cols-4",
}: AspectRatioPickerProps<T>) {
  const options = (ratios ??
    aspectRatios) as AspectRatioOption<T>[];

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.04em] text-zinc-400">
        Соотношение сторон
      </p>
      <div className={cn("grid gap-2", columnsClassName)}>
        {options.map((ratio) => {
          const selected = value === ratio.id;

          return (
            <button
              key={ratio.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(ratio.id)}
              className={cn(
                "flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-lg border px-1 py-3 transition-colors",
                selected
                  ? "border-accent bg-blue-50 text-blue-900"
                  : "border-border bg-bg text-muted hover:border-zinc-300",
                disabled && "cursor-not-allowed opacity-60",
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
