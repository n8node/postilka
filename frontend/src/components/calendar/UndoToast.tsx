"use client";

import { useEffect } from "react";
import { Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type UndoToastProps = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

export function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-200",
      )}
      role="status"
    >
      <span className="text-sm">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Отменить
      </button>
      <button type="button" onClick={onDismiss} className="rounded p-1 text-muted hover:text-text" aria-label="Закрыть">
        <X className="h-4 w-4" />
      </button>
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-b-lg bg-accent/40"
        style={{ width: "100%", animation: `calendar-undo-shrink ${durationMs}ms linear forwards` }}
      />
    </div>
  );
}
