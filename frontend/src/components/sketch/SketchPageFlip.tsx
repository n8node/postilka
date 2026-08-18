"use client";

import React, { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SketchCornerPeel } from "@/components/sketch/SketchCornerPeel";
import { cn } from "@/lib/utils";

type SketchPageFlipProps = {
  children: React.ReactNode;
  canFlipLeft: boolean;
  canFlipRight: boolean;
  onFlipLeft: () => void | Promise<void>;
  onFlipRight: () => void | Promise<void>;
  disabled?: boolean;
  showNav?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SketchPageFlip({
  children,
  canFlipLeft,
  canFlipRight,
  onFlipLeft,
  onFlipRight,
  disabled,
  showNav = true,
}: SketchPageFlipProps) {
  const [flipDeg, setFlipDeg] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [flipOrigin, setFlipOrigin] = useState<"bottom right" | "bottom left">("bottom right");

  const runFlip = useCallback(
    async (side: "left" | "right") => {
      if (disabled || isFlipping) return;
      if (side === "left" && !canFlipLeft) return;
      if (side === "right" && !canFlipRight) return;

      setFlipOrigin(side === "right" ? "bottom right" : "bottom left");
      setIsFlipping(true);
      setAnimate(true);
      setFlipDeg(side === "right" ? -88 : 88);
      await sleep(220);
      setAnimate(false);
      if (side === "right") await onFlipRight();
      else await onFlipLeft();
      setFlipDeg(0);
      await sleep(16);
      setIsFlipping(false);
    },
    [canFlipLeft, canFlipRight, disabled, isFlipping, onFlipLeft, onFlipRight],
  );

  return (
    <div className="flex flex-col items-stretch">
      <div className="relative" style={{ perspective: "1200px" }}>
        <div
          className={cn(
            "relative",
            isFlipping && "pointer-events-none",
          )}
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${flipDeg}deg)`,
            transformOrigin: flipOrigin,
            transition: animate ? "transform 220ms ease-in" : "none",
          }}
        >
          {children}
        </div>
        {!disabled && !isFlipping && (
          <>
            <SketchCornerPeel
              side="left"
              disabled={!canFlipLeft}
              onFlip={() => void runFlip("left")}
            />
            <SketchCornerPeel
              side="right"
              disabled={!canFlipRight}
              onFlip={() => void runFlip("right")}
            />
          </>
        )}
      </div>

      {showNav && (
        <div className="mt-2 flex justify-center gap-1">
          <button
            type="button"
            disabled={disabled || isFlipping || !canFlipLeft}
            onClick={() => void runFlip("left")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-400"
            aria-label="Предыдущий лист"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled || isFlipping || !canFlipRight}
            onClick={() => void runFlip("right")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-400"
            aria-label="Новый лист"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
