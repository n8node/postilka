import type { ChannelMetadata, ChannelProvider } from "@/lib/api";

export function channelDisplayName(input: {
  name: string;
  metadata?: ChannelMetadata;
}) {
  const title = input.metadata?.provider_title?.trim();
  if (title && input.name.startsWith("http")) return title;
  return input.name.trim() || "Канал";
}

export function channelInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "?";

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }

  const single = words[0] ?? cleaned;
  const letters = [...single].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length >= 2) {
    return `${letters[0]}${letters[1]}`.toUpperCase();
  }
  if (letters.length === 1) {
    return letters[0]!.toUpperCase();
  }
  return single.slice(0, 2).toUpperCase();
}

export function isPublicChannelAvatarURL(url: string, provider?: ChannelProvider) {
  const normalized = url.trim();
  if (!normalized) return false;
  if (normalized.startsWith("data:")) return true;
  if (provider === "max") return false;
  if (provider === "telegram") return false;
  if (provider === "youtube") return false;
  if (provider === "photochka") return false;
  return true;
}

export function channelAvatarCacheKey(ch?: {
  metadata_refreshed_at?: string;
  updated_at?: string;
}) {
  return ch?.metadata_refreshed_at?.trim() || ch?.updated_at?.trim() || "";
}

export function channelProxyAvatarURL(channelId: string, cacheKey?: string) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/app/api/v1";
  const url = `${base}/channels/${channelId}/avatar`;
  const key = cacheKey?.trim();
  if (!key) return url;
  return `${url}?t=${encodeURIComponent(key)}`;
}

export function channelAvatarSrc(input: {
  channelId?: string;
  metadata?: ChannelMetadata;
  avatarUrl?: string;
  provider?: ChannelProvider;
  chatType?: string;
  cacheKey?: string;
}) {
  const direct = input.avatarUrl?.trim() || input.metadata?.avatar_url?.trim();
  const isBusinessTelegram =
    input.provider === "telegram" &&
    (input.chatType === "business" || Boolean(input.metadata?.business_user_id?.trim()));

  if (isBusinessTelegram) {
    if (direct?.startsWith("data:")) return direct;
    if (input.channelId) return channelProxyAvatarURL(input.channelId, input.cacheKey);
    return null;
  }

  if (direct && isPublicChannelAvatarURL(direct, input.provider)) {
    return direct;
  }
  if (input.channelId && (input.provider === "telegram" || input.provider === "max" || input.provider === "youtube" || input.provider === "photochka")) {
    return channelProxyAvatarURL(input.channelId, input.cacheKey);
  }
  if (direct) return direct;
  return null;
}
