import type { User } from "@/lib/api";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
}

export function userAvatarSrc(user: Pick<User, "avatar_url">, cacheKey?: number | string) {
  if (!user.avatar_url?.trim()) return null;
  const path = user.avatar_url.startsWith("/") ? user.avatar_url : `/${user.avatar_url}`;
  const base = apiBase();
  const url = path.startsWith("/app/") ? path : `${base}${path}`;
  if (cacheKey == null) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(String(cacheKey))}`;
}
