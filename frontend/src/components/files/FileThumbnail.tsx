"use client";

import { useEffect, useState } from "react";
import { FileAudio, FileVideo, ImageIcon, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/files-api";
import { formatMediaDuration, isAudioMime, isVideoMime } from "@/lib/file-media";

type Props = {
  fileId: string;
  name: string;
  mimeType: string;
  durationSeconds?: number;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  className?: string;
};

export function FileThumbnail({
  fileId,
  name,
  mimeType,
  durationSeconds,
  size = "md",
  selected,
  className,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = mimeType.startsWith("image/");
  const isVideo = isVideoMime(mimeType, name);
  const isAudio = isAudioMime(mimeType, name);

  useEffect(() => {
    if (!isImage && !isVideo) return;
    let revoked: string | null = null;
    let cancelled = false;
    void downloadFile(fileId)
      .then(({ url: downloadUrl }) => {
        if (cancelled) return;
        revoked = downloadUrl;
        setUrl(downloadUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (revoked?.startsWith("blob:")) URL.revokeObjectURL(revoked);
    };
  }, [fileId, isImage, isVideo]);

  const sizeClass =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-xs" : "text-[11px]";

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-xl border bg-zinc-100",
        selected ? "border-accent ring-2 ring-accent/30" : "border-border",
        className,
      )}
    >
      {isImage && url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : isVideo && url && !failed ? (
        <>
          <video src={url} muted preload="metadata" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
          {!failed && (isImage || isVideo) && !url ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isVideo ? (
            <FileVideo className="h-7 w-7" />
          ) : isAudio ? (
            <FileAudio className="h-7 w-7" />
          ) : isImage ? (
            <ImageIcon className="h-7 w-7" />
          ) : (
            <ImageIcon className="h-7 w-7" />
          )}
        </div>
      )}

      {durationSeconds != null && durationSeconds > 0 && (isVideo || isAudio) && (
        <span
          className={cn(
            "absolute bottom-1.5 right-1.5 rounded-md bg-black/65 px-1.5 py-0.5 font-medium tabular-nums text-white",
            sizeClass,
          )}
        >
          {formatMediaDuration(durationSeconds)}
        </span>
      )}
    </div>
  );
}
