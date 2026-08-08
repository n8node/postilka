"use client";

import { useEffect, useState } from "react";
import { FileAudio, FileText, FileVideo, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/files-api";

type Props = {
  fileId?: string;
  name: string;
  mimeType: string;
  size?: "sm" | "md";
  className?: string;
};

function iconForMime(mime: string, name?: string) {
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "webm", "mkv", "m4v"].includes(ext)) {
    return FileVideo;
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) {
    return FileAudio;
  }
  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("pdf") ||
    ["txt", "md", "csv", "doc", "docx", "rtf"].includes(ext)
  ) {
    return FileText;
  }
  return FileText;
}

export function FileCirclePreview({ fileId, name, mimeType, size = "md", className }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const isImage = mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage || !fileId) return;
    let revoked: string | null = null;
    let cancelled = false;
    void downloadFile(fileId)
      .then(({ url }) => {
        if (cancelled) return;
        revoked = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (revoked?.startsWith("blob:")) URL.revokeObjectURL(revoked);
    };
  }, [fileId, isImage]);

  const Icon = iconForMime(mimeType, name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-border bg-zinc-100",
        dim,
        className,
      )}
      title={name}
    >
      {isImage && previewUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted">
          {isImage && !previewUrl && !failed ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isImage && failed ? (
            <ImageIcon className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
      )}
    </div>
  );
}

/** Local blob preview before server id exists */
export function LocalFileCirclePreview({
  file,
  mimeType,
  name,
  size = "md",
}: {
  file?: File | Blob | null;
  mimeType: string;
  name?: string;
  size?: "sm" | "md";
}) {
  const [url, setUrl] = useState<string | null>(null);
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const isImage = mimeType.startsWith("image/");
  const Icon = iconForMime(mimeType, name);

  useEffect(() => {
    if (!file || !isImage) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-border bg-zinc-100",
        dim,
      )}
    >
      {isImage && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
