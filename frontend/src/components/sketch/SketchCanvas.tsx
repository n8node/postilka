"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import {
  redrawSketchCanvas,
  type SketchBrushId,
  type SketchPoint,
  type SketchStroke,
} from "@/lib/sketch-brushes";

export type SketchCanvasHandle = {
  exportPNG: () => Promise<Blob>;
  clear: () => void;
  undo: () => void;
  canUndo: () => boolean;
  hasContent: () => boolean;
};

type SketchCanvasProps = {
  width: number;
  height: number;
  brush: SketchBrushId;
  color: string;
  brushSize: number;
  backgroundImage: HTMLImageElement | null;
  backgroundOpacity: number;
  onHistoryChange?: () => void;
};

export const SketchCanvas = forwardRef<SketchCanvasHandle, SketchCanvasProps>(
  function SketchCanvas(
    {
      width,
      height,
      brush,
      color,
      brushSize,
      backgroundImage,
      backgroundOpacity,
      onHistoryChange,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const strokesRef = useRef<SketchStroke[]>([]);
    const undoStackRef = useRef<SketchStroke[][]>([]);
    const drawingRef = useRef(false);
    const currentStrokeRef = useRef<SketchStroke | null>(null);
    const [, setTick] = useState(0);

    const paint = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      redrawSketchCanvas(
        ctx,
        width,
        height,
        strokesRef.current,
        "#ffffff",
        backgroundImage,
        backgroundOpacity,
      );
    }, [width, height, backgroundImage, backgroundOpacity]);

    useEffect(() => {
      paint();
    }, [paint]);

    const pushUndo = useCallback(() => {
      undoStackRef.current.push(strokesRef.current.map((s) => ({ ...s, points: [...s.points] })));
      if (undoStackRef.current.length > 40) {
        undoStackRef.current.shift();
      }
      onHistoryChange?.();
    }, [onHistoryChange]);

    const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>): SketchPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const p = pointerPos(e);
      if (!p) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      pushUndo();
      currentStrokeRef.current = {
        brush,
        color,
        size: brushSize,
        points: [p],
        opacity: 1,
      };
      strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
      paint();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || !currentStrokeRef.current) return;
      const p = pointerPos(e);
      if (!p) return;
      const last = currentStrokeRef.current.points[currentStrokeRef.current.points.length - 1];
      if (last && Math.hypot(last.x - p.x, last.y - p.y) < 1.5) return;
      currentStrokeRef.current.points.push(p);
      paint();
    };

    const finishStroke = () => {
      drawingRef.current = false;
      currentStrokeRef.current = null;
      setTick((v) => v + 1);
      onHistoryChange?.();
    };

    useImperativeHandle(
      ref,
      () => ({
        exportPNG: async () => {
          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Холст недоступен");
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("Экспорт не удался"))),
              "image/png",
              1,
            );
          });
          return blob;
        },
        clear: () => {
          pushUndo();
          strokesRef.current = [];
          paint();
          setTick((v) => v + 1);
        },
        undo: () => {
          const prev = undoStackRef.current.pop();
          if (prev) {
            strokesRef.current = prev;
            paint();
            setTick((v) => v + 1);
            onHistoryChange?.();
          }
        },
        canUndo: () => undoStackRef.current.length > 0,
        hasContent: () =>
          strokesRef.current.some((s) => s.points.length > 1 || (s.points.length === 1 && s.size > 0)),
      }),
      [paint, pushUndo],
    );

    return (
      <div
        ref={containerRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          onPointerCancel={finishStroke}
          className="max-h-full max-w-full touch-none rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700"
          style={{ aspectRatio: `${width} / ${height}` }}
        />
      </div>
    );
  },
);
