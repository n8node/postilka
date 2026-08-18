"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SketchCornerPeelProps = {
  side: "left" | "right";
  disabled?: boolean;
  onFlip: () => void;
};

const FLIP_THRESHOLD = 48;

export function SketchCornerPeel({ side, disabled, onFlip }: SketchCornerPeelProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startRef = useRef({ x: 0, y: 0 });
  const triggeredRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    triggeredRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    setDragOffset(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    const signed =
      side === "right" ? Math.max(0, -dx - dy * 0.35) : Math.max(0, dx - dy * 0.35);
    setDragOffset(Math.min(signed, 80));
    if (signed >= FLIP_THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true;
      setDragging(false);
      setDragOffset(0);
      onFlip();
    }
  };

  const handlePointerUp = () => {
    if (dragging && dragOffset >= FLIP_THRESHOLD * 0.6 && !triggeredRef.current) {
      triggeredRef.current = true;
      onFlip();
    }
    setDragging(false);
    setDragOffset(0);
  };

  const peelSize = 36 + (hovered ? 4 : 0) + dragOffset * 0.25;
  const rotate = side === "right" ? -2 - dragOffset * 0.08 : 2 + dragOffset * 0.08;

  return (
    <div
      className={cn(
        "absolute bottom-0 z-20 touch-none select-none",
        side === "right" ? "right-0" : "left-0",
        disabled ? "cursor-not-allowed opacity-30" : "cursor-grab active:cursor-grabbing",
      )}
      style={{
        width: peelSize,
        height: peelSize,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        if (!dragging) setDragOffset(0);
      }}
      aria-hidden
    >
      <div
        className={cn(
          "absolute bottom-0 h-full w-full transition-shadow duration-200",
          side === "right" ? "right-0" : "left-0",
          hovered || dragging ? "drop-shadow-md" : "drop-shadow-sm",
        )}
        style={{
          transform: `rotate(${rotate}deg)`,
          transformOrigin: side === "right" ? "bottom right" : "bottom left",
          transition: dragging ? "none" : "transform 200ms ease, box-shadow 200ms ease",
        }}
      >
        <div
          className="absolute bottom-0 h-full w-full bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900"
          style={{
            clipPath:
              side === "right"
                ? "polygon(100% 0, 100% 100%, 0 100%)"
                : "polygon(0 0, 0 100%, 100% 100%)",
            boxShadow:
              hovered || dragging
                ? "inset 0 0 12px rgba(0,0,0,0.08)"
                : "inset 0 0 6px rgba(0,0,0,0.05)",
          }}
        />
      </div>
    </div>
  );
}
