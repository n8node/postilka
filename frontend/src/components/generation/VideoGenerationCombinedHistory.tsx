"use client";

import { useState } from "react";
import { GenerationHistory } from "@/components/generation/GenerationHistory";
import { VideoGenerationHistory } from "@/components/generation/VideoGenerationHistory";
import type { GenerationHistoryItem } from "@/lib/generation-data";
import type { VideoGenerationHistoryItem } from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";

type HistoryTab = "photo" | "video";

type VideoGenerationCombinedHistoryProps = {
  photoItems: GenerationHistoryItem[];
  videoItems: VideoGenerationHistoryItem[];
  photoLoadError?: string | null;
  videoLoadError?: string | null;
  canDragPhotos?: boolean;
  canDragVideos?: boolean;
  onSelectPhoto?: (item: GenerationHistoryItem) => void;
  onSelectVideo?: (item: VideoGenerationHistoryItem) => void;
  onDeletePhotos?: (ids: string[]) => Promise<void>;
  onDeleteVideos?: (ids: string[]) => Promise<void>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

export function VideoGenerationCombinedHistory({
  photoItems,
  videoItems,
  photoLoadError = null,
  videoLoadError = null,
  canDragPhotos = false,
  canDragVideos = false,
  onSelectPhoto,
  onSelectVideo,
  onDeletePhotos,
  onDeleteVideos,
  onDragStart,
  onDragEnd,
}: VideoGenerationCombinedHistoryProps) {
  const [tab, setTab] = useState<HistoryTab>("video");

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          История
        </p>
        <div className="flex rounded-lg border border-border bg-zinc-50 p-0.5">
          <button
            type="button"
            onClick={() => setTab("photo")}
            className={cn(
              "rounded-md px-3 py-1 text-[11px] font-medium transition-colors",
              tab === "photo"
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text",
            )}
          >
            Фото
          </button>
          <button
            type="button"
            onClick={() => setTab("video")}
            className={cn(
              "rounded-md px-3 py-1 text-[11px] font-medium transition-colors",
              tab === "video"
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text",
            )}
          >
            Видео
          </button>
        </div>
      </div>

      {tab === "photo" ? (
        <GenerationHistory
          items={photoItems}
          title=""
          emptyText="История фото пуста"
          loadError={photoLoadError}
          canDragToSources={canDragPhotos}
          onSelect={onSelectPhoto}
          onDelete={onDeletePhotos}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ) : (
        <VideoGenerationHistory
          items={videoItems}
          embedded
          loadError={videoLoadError}
          canDragToReferences={canDragVideos}
          onSelect={onSelectVideo}
          onDelete={onDeleteVideos}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      )}
    </div>
  );
}
