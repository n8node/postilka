import type { WorkspaceFile } from "@/lib/files-api";

export function formatMediaDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getFileDuration(file: WorkspaceFile): number | undefined {
  const d = file.media_metadata?.duration_seconds;
  return typeof d === "number" && d > 0 ? d : undefined;
}

export function isVideoMime(mime: string, name?: string): boolean {
  if (mime.startsWith("video/")) return true;
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  return ["mp4", "mov", "avi", "webm", "mkv", "m4v"].includes(ext);
}

export function isAudioMime(mime: string, name?: string): boolean {
  if (mime.startsWith("audio/")) return true;
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  return ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext);
}

export function isMediaWithDuration(mime: string, name?: string): boolean {
  return isVideoMime(mime, name) || isAudioMime(mime, name);
}

export async function probeMediaDuration(
  blob: Blob,
  mimeType: string,
): Promise<number | undefined> {
  if (!isMediaWithDuration(mimeType)) return undefined;

  return new Promise((resolve) => {
    const isVideo = mimeType.startsWith("video/");
    const el = document.createElement(isVideo ? "video" : "audio");
    const url = URL.createObjectURL(blob);
    const cleanup = () => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
    };

    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const duration = Math.round(el.duration);
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? duration : undefined);
    };
    el.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    el.src = url;
  });
}
