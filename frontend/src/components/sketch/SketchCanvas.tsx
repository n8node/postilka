"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import {
  createHarmonyBrush,
  parseSketchColor,
  type HarmonyBrush,
  type SketchBrushId,
} from "@/lib/harmony-brushes";

export type SketchCanvasHandle = {
  exportPNG: () => Promise<Blob>;
  exportDataUrl: () => Promise<string>;
  loadFromDataUrl: (dataUrl: string) => Promise<void>;
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

function paintBaseLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage: HTMLImageElement | null,
  backgroundOpacity: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (backgroundImage) {
    ctx.save();
    ctx.globalAlpha = backgroundOpacity;
    const scale = Math.max(
      width / backgroundImage.width,
      height / backgroundImage.height,
    );
    const w = backgroundImage.width * scale;
    const h = backgroundImage.height * scale;
    ctx.drawImage(backgroundImage, (width - w) / 2, (height - h) / 2, w, h);
    ctx.restore();
  }
}

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
    const displayRef = useRef<HTMLCanvasElement>(null);
    const baseRef = useRef<HTMLCanvasElement | null>(null);
    const strokeRef = useRef<HTMLCanvasElement | null>(null);
    const brushRef = useRef<HarmonyBrush | null>(null);
    const undoStackRef = useRef<ImageData[]>([]);
    const hasContentRef = useRef(false);
    const drawingRef = useRef(false);

    const ensureLayers = useCallback(() => {
      if (!baseRef.current) {
        baseRef.current = document.createElement("canvas");
      }
      if (!strokeRef.current) {
        strokeRef.current = document.createElement("canvas");
      }
      // Resizing clears canvas pixels — only resize when dimensions change.
      if (baseRef.current.width !== width || baseRef.current.height !== height) {
        baseRef.current.width = width;
        baseRef.current.height = height;
      }
      if (strokeRef.current.width !== width || strokeRef.current.height !== height) {
        strokeRef.current.width = width;
        strokeRef.current.height = height;
      }
    }, [width, height]);

    const composite = useCallback(() => {
      const display = displayRef.current;
      const base = baseRef.current;
      const stroke = strokeRef.current;
      if (!display || !base || !stroke) return;
      const ctx = display.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(base, 0, 0);
      ctx.drawImage(stroke, 0, 0);
    }, [width, height]);

    const paintBase = useCallback(() => {
      ensureLayers();
      const base = baseRef.current;
      if (!base) return;
      const ctx = base.getContext("2d");
      if (!ctx) return;
      paintBaseLayer(ctx, width, height, backgroundImage, backgroundOpacity);
      composite();
    }, [width, height, backgroundImage, backgroundOpacity, ensureLayers, composite]);

    const destroyBrush = useCallback(() => {
      brushRef.current?.destroy();
      brushRef.current = null;
    }, []);

    const createBrush = useCallback(() => {
      ensureLayers();
      const stroke = strokeRef.current;
      if (!stroke) return;
      const ctx = stroke.getContext("2d");
      if (!ctx) return;
      destroyBrush();
      brushRef.current = createHarmonyBrush(brush, ctx, {
        color: parseSketchColor(color),
        size: brushSize,
        pressure: 1,
        canvasWidth: width,
        canvasHeight: height,
      });
    }, [brush, color, brushSize, width, height, ensureLayers, destroyBrush]);

    useEffect(() => {
      paintBase();
    }, [paintBase]);

    useEffect(() => {
      createBrush();
      return () => destroyBrush();
    }, [createBrush, destroyBrush]);

    useEffect(() => {
      ensureLayers();
      const stroke = strokeRef.current;
      if (stroke) {
        const ctx = stroke.getContext("2d");
        ctx?.clearRect(0, 0, width, height);
      }
      undoStackRef.current = [];
      hasContentRef.current = false;
      composite();
      onHistoryChange?.();
    }, [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (brush !== "ribbon") return;
      let raf = 0;
      const loop = () => {
        composite();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [brush, composite]);

    const pushUndo = useCallback(() => {
      ensureLayers();
      const stroke = strokeRef.current;
      if (!stroke) return;
      const ctx = stroke.getContext("2d");
      if (!ctx) return;
      undoStackRef.current.push(ctx.getImageData(0, 0, width, height));
      if (undoStackRef.current.length > 40) {
        undoStackRef.current.shift();
      }
      onHistoryChange?.();
    }, [width, height, ensureLayers, onHistoryChange]);

    const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = displayRef.current;
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
      if (e.button !== 0 || !brushRef.current) return;
      const p = pointerPos(e);
      if (!p) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      pushUndo();
      brushRef.current.strokeStart(p.x, p.y);
      hasContentRef.current = true;
      composite();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || !brushRef.current) return;
      const p = pointerPos(e);
      if (!p) return;
      brushRef.current.stroke(p.x, p.y);
      composite();
    };

    const finishStroke = () => {
      if (drawingRef.current && brushRef.current) {
        brushRef.current.strokeEnd();
      }
      drawingRef.current = false;
      composite();
      onHistoryChange?.();
    };

    const loadImageOntoStroke = useCallback(
      (image: HTMLImageElement) => {
        ensureLayers();
        const stroke = strokeRef.current;
        if (!stroke) return;
        const ctx = stroke.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        undoStackRef.current = [];
        hasContentRef.current = true;
        composite();
        onHistoryChange?.();
      },
      [width, height, ensureLayers, composite, onHistoryChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        exportPNG: async () => {
          ensureLayers();
          const base = baseRef.current;
          const stroke = strokeRef.current;
          if (!base || !stroke) throw new Error("Холст недоступен");
          const exportCanvas = document.createElement("canvas");
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ctx = exportCanvas.getContext("2d");
          if (!ctx) throw new Error("Холст недоступен");
          ctx.drawImage(base, 0, 0);
          ctx.drawImage(stroke, 0, 0);
          const blob = await new Promise<Blob>((resolve, reject) => {
            exportCanvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("Экспорт не удался"))),
              "image/png",
              1,
            );
          });
          return blob;
        },
        exportDataUrl: async () => {
          ensureLayers();
          const base = baseRef.current;
          const stroke = strokeRef.current;
          if (!base || !stroke) throw new Error("Холст недоступен");
          const exportCanvas = document.createElement("canvas");
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ctx = exportCanvas.getContext("2d");
          if (!ctx) throw new Error("Холст недоступен");
          ctx.drawImage(base, 0, 0);
          ctx.drawImage(stroke, 0, 0);
          const dataUrl = exportCanvas.toDataURL("image/png", 0.92);
          if (!dataUrl) throw new Error("Экспорт не удался");
          return dataUrl;
        },
        loadFromDataUrl: async (dataUrl: string) => {
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Не удалось загрузить набросок"));
            image.src = dataUrl;
          });
          loadImageOntoStroke(image);
        },
        clear: () => {
          pushUndo();
          ensureLayers();
          const stroke = strokeRef.current;
          if (stroke) {
            const ctx = stroke.getContext("2d");
            ctx?.clearRect(0, 0, width, height);
          }
          hasContentRef.current = false;
          composite();
          onHistoryChange?.();
        },
        undo: () => {
          const prev = undoStackRef.current.pop();
          ensureLayers();
          const stroke = strokeRef.current;
          if (prev && stroke) {
            const ctx = stroke.getContext("2d");
            ctx?.putImageData(prev, 0, 0);
            hasContentRef.current = undoStackRef.current.length > 0;
            composite();
            onHistoryChange?.();
          }
        },
        canUndo: () => undoStackRef.current.length > 0,
        hasContent: () => hasContentRef.current,
      }),
      [width, height, ensureLayers, pushUndo, composite, onHistoryChange, loadImageOntoStroke],
    );

    return (
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        <canvas
          ref={displayRef}
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
