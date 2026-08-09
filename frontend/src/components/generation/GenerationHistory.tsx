"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { GenerationHistoryItem } from "@/lib/generation-data";
import { generationHistoryThumbSrc } from "@/lib/media-display";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import {
  GENERATION_HISTORY_DRAG_MIME,
  isUploadHistoryId,
  serializeHistoryDragItem,
} from "@/lib/generation-history-drop";
import { cn } from "@/lib/utils";

type GenerationHistoryProps = {
  items: GenerationHistoryItem[];
  title?: string;
  emptyText?: string;
  onSelect?: (item: GenerationHistoryItem) => void;
  onDelete?: (ids: string[]) => Promise<void>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  canDragToSources?: boolean;
};

export function GenerationHistory({
  items,
  title = "История генераций",
  emptyText = "История пуста",
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
  canDragToSources = false,
}: GenerationHistoryProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectableItems = useMemo(
    () => items.filter((item) => !item.usedInPost && !isUploadHistoryId(item.id)),
    [items],
  );

  const selectedCount = selectedIds.size;
  const showSelectHint = canDragToSources && !selectMode;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setDeleteError(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (!onDelete || selectedCount === 0 || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete([...selectedIds]);
      exitSelectMode();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Не удалось удалить выбранные фото",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="generation-history-wrap mt-4 min-w-0 border-t border-border pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectMode ? (
            <>
              {selectedCount > 0 && onDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                >
                  {deleting ? "Удаление…" : `Удалить (${selectedCount})`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={exitSelectMode}
                disabled={deleting}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-medium text-muted hover:bg-zinc-50"
              >
                Отмена
              </button>
            </>
          ) : selectableItems.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSelectMode(true);
                setDeleteError(null);
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
            >
              Выбрать
            </button>
          ) : null}
        </div>
      </div>

      {showSelectHint ? (
        <p className="mb-3 text-[10px] text-zinc-400">
          Перетащите фото в область исходных снимков слева
        </p>
      ) : (
        <div className="mb-3" />
      )}

      {deleteError ? (
        <p className="mb-3 text-[12px] text-red-600">{deleteError}</p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-[12px] text-zinc-400">
          {emptyText}
        </div>
      ) : (
        <div className="generation-history-grid w-full min-w-0">
          {items.map((item) => {
            const posted = item.usedInPost;
            const selectable =
              selectMode && !posted && !isUploadHistoryId(item.id);
            const selected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "relative min-w-0 rounded-lg",
                  posted && "generation-history-item--posted",
                )}
              >
                <button
                  type="button"
                  draggable={canDragToSources && !selectMode && !posted}
                  disabled={selectMode && posted}
                  onDragStart={(event) => {
                    if (!canDragToSources || selectMode || posted) return;
                    event.dataTransfer.setData(
                      GENERATION_HISTORY_DRAG_MIME,
                      serializeHistoryDragItem(item),
                    );
                    event.dataTransfer.effectAllowed = "copy";
                    onDragStart?.();
                  }}
                  onDragEnd={() => onDragEnd?.()}
                  onClick={() => {
                    if (selectMode) {
                      if (posted) return;
                      toggleSelected(item.id);
                      return;
                    }
                    onSelect?.(item);
                  }}
                  className={cn(
                    "group relative w-full min-w-0 rounded-lg border p-2 text-left transition-colors",
                    posted
                      ? "cursor-default border-border bg-zinc-50"
                      : selectMode
                        ? selected
                          ? "border-accent bg-blue-50 ring-2 ring-accent/30"
                          : "border-zinc-300 bg-bg hover:border-blue-200"
                        : "border-border bg-zinc-50 hover:border-zinc-300",
                    canDragToSources &&
                      !selectMode &&
                      !posted &&
                      "cursor-grab active:cursor-grabbing",
                  )}
                  title={
                    posted
                      ? "Фото в ленте"
                      : canDragToSources && !selectMode
                        ? `${item.prompt}\nПеретащите в исходные фото`
                        : item.prompt
                  }
                >
                  <ProtectedMediaImage
                    url={generationHistoryThumbSrc(item)}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "pointer-events-none aspect-square w-full rounded-md object-cover",
                      posted && "opacity-35",
                    )}
                  />
                  <p
                    className={cn(
                      "mt-1.5 truncate text-center text-[10px] leading-tight",
                      posted ? "text-zinc-400/70" : "text-zinc-400",
                    )}
                  >
                    {item.createdAt}
                  </p>
                  {posted ? (
                    <span className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-md bg-bg/55 px-1 text-center text-[10px] font-medium leading-tight text-zinc-400">
                      Фото в ленте
                    </span>
                  ) : null}
                </button>

                {selectable ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border",
                      selected
                        ? "border-accent bg-accent text-white"
                        : "border-zinc-300 bg-surface/90 text-transparent",
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
