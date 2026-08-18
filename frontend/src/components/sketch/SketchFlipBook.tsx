"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SketchCanvas, type SketchCanvasHandle } from "@/components/sketch/SketchCanvas";
import type { SavedSketch } from "@/lib/sketch-saves";
import type { SketchBrushId } from "@/lib/harmony-brushes";
import { cn } from "@/lib/utils";
import type { PageFlipController } from "react-pageflip";

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

type PageDef =
  | { kind: "blank" }
  | { kind: "save"; save: SavedSketch }
  | { kind: "draft" };

export type SketchFlipBookHandle = {
  turnToDraft: () => void;
  turnToSaveId: (id: string) => void;
  flipNext: () => void;
  flipPrev: () => void;
};

type SketchFlipBookProps = {
  savedSketches: SavedSketch[];
  pageWidth: number;
  pageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasRef: React.RefObject<SketchCanvasHandle | null>;
  brush: SketchBrushId;
  color: string;
  brushSize: number;
  backgroundImage: HTMLImageElement | null;
  backgroundOpacity: number;
  onHistoryChange: () => void;
  onPageChange: (payload: {
    pageIndex: number;
    kind: PageDef["kind"];
    save: SavedSketch | null;
    isNewSheet: boolean;
  }) => void;
  disabled?: boolean;
  className?: string;
};

function buildPageDefs(savedSketches: SavedSketch[]): PageDef[] {
  const savesOldestFirst = [...savedSketches].reverse();
  const defs: PageDef[] = [
    ...savesOldestFirst.map((save) => ({ kind: "save" as const, save })),
    { kind: "draft" },
    { kind: "blank" },
  ];
  if (defs.length % 2 === 1) {
    defs.unshift({ kind: "blank" });
  }
  return defs;
}

function findDraftIndex(defs: PageDef[]): number {
  return defs.findIndex((d) => d.kind === "draft");
}

const BookPage = forwardRef<
  HTMLDivElement,
  { children?: React.ReactNode; className?: string }
>(function BookPage({ children, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "box-border h-full w-full overflow-hidden bg-white dark:bg-zinc-100",
        className,
      )}
    >
      {children}
    </div>
  );
});

export const SketchFlipBook = forwardRef<SketchFlipBookHandle, SketchFlipBookProps>(
  function SketchFlipBook(
    {
      savedSketches,
      pageWidth,
      pageHeight,
      canvasWidth,
      canvasHeight,
      canvasRef,
      brush,
      color,
      brushSize,
      backgroundImage,
      backgroundOpacity,
      onHistoryChange,
      onPageChange,
      disabled,
      className,
    },
    ref,
  ) {
    const bookRef = useRef<{ pageFlip: () => PageFlipController | undefined }>(null);
    const skipFlipEventRef = useRef(false);
    const pageDefs = useMemo(() => buildPageDefs(savedSketches), [savedSketches]);
    const draftIndex = useMemo(() => findDraftIndex(pageDefs), [pageDefs]);
    const trailingBlankIndex = pageDefs.length - 1;

    const emitPage = useCallback(
      (pageIndex: number, isNewSheet = false) => {
        const def = pageDefs[pageIndex];
        if (!def) return;
        onPageChange({
          pageIndex,
          kind: def.kind,
          save: def.kind === "save" ? def.save : null,
          isNewSheet,
        });
      },
      [onPageChange, pageDefs],
    );

    const turnToPage = useCallback(
      (index: number) => {
        skipFlipEventRef.current = true;
        bookRef.current?.pageFlip()?.turnToPage(index);
        window.setTimeout(() => {
          skipFlipEventRef.current = false;
        }, 50);
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        turnToDraft: () => turnToPage(draftIndex),
        turnToSaveId: (id: string) => {
          const index = pageDefs.findIndex(
            (d) => d.kind === "save" && d.save.id === id,
          );
          if (index >= 0) turnToPage(index);
        },
        flipNext: () => {
          if (disabled) return;
          bookRef.current?.pageFlip()?.flipNext("bottom");
        },
        flipPrev: () => {
          if (disabled) return;
          bookRef.current?.pageFlip()?.flipPrev("bottom");
        },
      }),
      [disabled, draftIndex, pageDefs, turnToPage],
    );

    const handleInit = useCallback(() => {
      turnToPage(draftIndex);
    }, [draftIndex, turnToPage]);

    const handleFlip = useCallback(
      (e: { data: number }) => {
        if (skipFlipEventRef.current) return;
        const pageIndex = e.data;
        const def = pageDefs[pageIndex];
        if (!def) return;
        if (def.kind === "blank" && pageIndex === trailingBlankIndex) {
          emitPage(pageIndex, true);
          return;
        }
        if (def.kind === "blank") return;
        emitPage(pageIndex, false);
      },
      [emitPage, pageDefs, trailingBlankIndex],
    );

    if (pageWidth < 1 || pageHeight < 1) return null;

    return (
      <div className={cn("flex flex-col items-center", className)}>
        <HTMLFlipBook
          ref={bookRef}
          width={pageWidth}
          height={pageHeight}
          size="fixed"
          minWidth={pageWidth}
          maxWidth={pageWidth}
          minHeight={pageHeight}
          maxHeight={pageHeight}
          drawShadow
          flippingTime={680}
          usePortrait={false}
          useMouseEvents={!disabled}
          mobileScrollSupport={false}
          clickEventForward={false}
          showCover={false}
          autoSize
          className="sketch-flip-book"
          onInit={handleInit}
          onFlip={handleFlip}
        >
          {pageDefs.map((def, index) => {
            if (def.kind === "draft") {
              return (
                <BookPage key={`draft-${index}`}>
                  <SketchCanvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    displayWidth={pageWidth}
                    displayHeight={pageHeight}
                    brush={brush}
                    color={color}
                    brushSize={brushSize}
                    backgroundImage={backgroundImage}
                    backgroundOpacity={backgroundOpacity}
                    onHistoryChange={onHistoryChange}
                    className="h-full w-full rounded-none border-0 shadow-none"
                  />
                </BookPage>
              );
            }

            if (def.kind === "save") {
              return (
                <BookPage key={def.save.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={def.save.dataUrl}
                    alt=""
                    className="h-full w-full object-contain bg-white"
                    draggable={false}
                  />
                </BookPage>
              );
            }

            return (
              <BookPage key={`blank-${index}`} className="bg-zinc-50 dark:bg-zinc-200/80">
                <div className="flex h-full w-full items-end justify-end p-3">
                  <span className="text-[10px] text-zinc-400">новый лист</span>
                </div>
              </BookPage>
            );
          })}
        </HTMLFlipBook>

        <div className="mt-2 flex justify-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => bookRef.current?.pageFlip()?.flipPrev("bottom")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-400"
            aria-label="Предыдущий лист"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => bookRef.current?.pageFlip()?.flipNext("bottom")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-400"
            aria-label="Следующий лист"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  },
);
