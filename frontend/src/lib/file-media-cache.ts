import { downloadFile } from "@/lib/files-api";

type CacheEntry = {
  url: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

const REFRESH_BUFFER_MS = 2 * 60 * 1000;

function cacheKey(fileId: string, variant: "preview" | "download") {
  return `${fileId}:${variant}`;
}

export async function getCachedFileMediaUrl(
  fileId: string,
  variant: "preview" | "download" = "preview",
): Promise<string> {
  const key = cacheKey(fileId, variant);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return hit.url;
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = downloadFile(fileId, variant === "preview" ? "inline" : "attachment")
      .then(({ url, expires_in }) => {
        const ttlMs = (expires_in ?? 3600) * 1000;
        cache.set(key, {
          url,
          expiresAt: Date.now() + ttlMs,
        });
        return url;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }

  return pending;
}

export function invalidateFileMediaCache(fileId?: string) {
  if (!fileId) {
    cache.clear();
    return;
  }
  cache.delete(cacheKey(fileId, "preview"));
  cache.delete(cacheKey(fileId, "download"));
}
