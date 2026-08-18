"use client";

import React, { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SavedSketch } from "@/lib/sketch-saves";
import { SKETCH_THUMB_SIZE, sketchThumbnailSrc } from "@/lib/sketch-thumbnail";
import { cn } from "@/lib/utils";

type SketchSaveStripProps = {
  saves: SavedSketch[];
  selectedId: string | null;
  onSelect: (item: SavedSketch) => void;
};

const MIN_SLOTS = 3;
const SLOT_GAP = 8;
const SLOT_HEIGHT = SKETCH_THUMB_SIZE;

export function SketchSaveStrip({
  saves,
  selectedId,
  onSelect,
}: SketchSaveStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slotCount = Math.max(MIN_SLOTS, saves.length);
  const viewportHeight = SLOT_HEIGHT * MIN_SLOTS + SLOT_GAP * (MIN_SLOTS - 1);

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const index = saves.findIndex((s) => s.id === selectedId);
    if (index < 0) return;
    scrollRef.current.scrollTo({
      top: index * (SLOT_HEIGHT + SLOT_GAP),
      behavior: "smooth",
    });
  }, [selectedId, saves]);

  const scrollBySlot = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({
      top: direction * (SLOT_HEIGHT + SLOT_GAP),
      behavior: "smooth",
    });
  };

  return (
    <div
      className="flex w-[72px] shrink-0 flex-col items-center gap-1"
      style={{ height: viewportHeight + 52 }}
    >
      <button
        type="button"
        onClick={() => scrollBySlot(-1)}
        className="flex h-6 w-full items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        aria-label="Прокрутить вверх"
      >
        <ChevronUp className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="w-full overflow-y-auto overflow-x-hidden"
        style={{ height: viewportHeight }}
      >
        <div className="flex flex-col" style={{ gap: SLOT_GAP }}>
          {Array.from({ length: slotCount }, (_, index) => {
            const item = saves[index];
            if (item) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "relative w-full shrink-0 overflow-hidden rounded-lg border bg-white transition",
                    selectedId === item.id
                      ? "border-indigo-500 ring-2 ring-indigo-500/30"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
                  )}
                  style={{ height: SLOT_HEIGHT }}
                  title={new Date(item.createdAt).toLocaleString("ru-RU")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sketchThumbnailSrc(item)}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </button>
              );
            }
            return (
              <div
                key={`empty-${index}`}
                className="w-full shrink-0 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40"
                style={{ height: SLOT_HEIGHT }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => scrollBySlot(1)}
          className="flex h-6 flex-1 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          aria-label="Прокрутить вниз"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="min-w-[1.25rem] text-center text-[11px] font-semibold tabular-nums text-zinc-500">
          {saves.length}
        </span>
      </div>
    </div>
  );
}
