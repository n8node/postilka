export function isLocalMediaUrl(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
}

export function mediaUrl(url: string): string {
  if (!url) return "";
  if (isLocalMediaUrl(url)) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/app/")) return url;
  if (url.startsWith("/api/v1/")) return `/app${url}`;
  if (url.startsWith("/api/")) return `/app${url}`;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${apiBase()}${path}`;
}

export function requiresProtectedMedia(url: string): boolean {
  const resolved = mediaUrl(url);
  return (
    resolved.includes("/media/ai-generations/") ||
    resolved.includes("/media/generation-uploads/") ||
    resolved.includes("/ad-studio/templates/") ||
    resolved.includes("/sketch/styles/")
  );
}

export function generationHistoryThumbSrc(item: {
  imageUrl: string;
  thumbUrl?: string;
}): string {
  if (item.thumbUrl) return mediaUrl(item.thumbUrl);
  return mediaUrl(item.imageUrl);
}
