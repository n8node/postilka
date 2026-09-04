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

function withFormatJson(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}format=json`;
}

/**
 * Fetch same-origin media that may 307-redirect to a signed S3 URL.
 *
 * Prefer `?format=json` so cookies never leave postilka.ru. Fallback: follow
 * the redirect with credentials "same-origin" (not "include") — otherwise the
 * browser sends cookies to Beget S3 and CORS fails because S3 cannot set
 * Access-Control-Allow-Credentials: true together with Allow-Origin: *.
 */
export async function fetchProtectedMedia(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = String(init.method ?? "GET").toUpperCase();
  try {
    const locRes = await fetch(withFormatJson(url), {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
    if (locRes.ok) {
      const contentType = locRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = (await locRes.json()) as { url?: unknown };
        if (typeof data.url === "string" && /^https?:\/\//i.test(data.url)) {
          return fetch(data.url, {
            ...init,
            credentials: "omit",
            redirect: "follow",
          });
        }
      } else if (method === "GET") {
        return locRes;
      }
    }
  } catch {
    // Fall through to a same-origin follow of the original URL.
  }

  return fetch(url, {
    ...init,
    credentials: "same-origin",
    redirect: "follow",
  });
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
