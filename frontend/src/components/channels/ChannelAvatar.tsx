"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChannelMetadata, ChannelProvider } from "@/lib/api";
import {
  channelDisplayName,
  channelInitials,
  channelProxyAvatarURL,
  isPublicChannelAvatarURL,
} from "@/lib/channelPresentation";
import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

type ChannelAvatarProps = {
  name: string;
  metadata?: ChannelMetadata;
  channelId?: string;
  avatarUrl?: string;
  provider?: ChannelProvider;
  chatType?: string;
  size?: keyof typeof sizeClass;
  cacheKey?: string;
  className?: string;
};

export function ChannelAvatar({
  name,
  metadata,
  channelId,
  avatarUrl,
  provider,
  chatType,
  size = "md",
  cacheKey,
  className,
}: ChannelAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [businessBlobUrl, setBusinessBlobUrl] = useState<string | null>(null);
  const displayName = channelDisplayName({ name, metadata });
  const initials = channelInitials(displayName);

  const directUrl = (avatarUrl?.trim() || metadata?.avatar_url?.trim() || "") || null;
  const isBusinessTelegram =
    provider === "telegram" &&
    (chatType === "business" || Boolean(metadata?.business_user_id?.trim()));
  const cachedDataUrl = directUrl?.startsWith("data:") ? directUrl : null;
  const publicDirectUrl =
    !isBusinessTelegram && directUrl && isPublicChannelAvatarURL(directUrl, provider)
      ? directUrl
      : null;
  const proxyUrl = channelId ? channelProxyAvatarURL(channelId, cacheKey) : null;
  const canProxy = Boolean(
    channelId &&
      (provider === "telegram" || provider === "max" || provider === "youtube" || provider === "photochka") &&
      proxyUrl,
  );

  useEffect(() => {
    if (!isBusinessTelegram || cachedDataUrl || !canProxy || !proxyUrl) {
      setBusinessBlobUrl(null);
      return;
    }

    let cancelled = false;

    void fetch(proxyUrl, { credentials: "include" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        const nextUrl = URL.createObjectURL(blob);
        setBusinessBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setBusinessBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isBusinessTelegram, cachedDataUrl, canProxy, proxyUrl, channelId]);

  const src = useMemo(() => {
    if (useProxy && canProxy) return proxyUrl;
    if (isBusinessTelegram) {
      if (cachedDataUrl) return cachedDataUrl;
      if (businessBlobUrl) return businessBlobUrl;
      return null;
    }
    if (publicDirectUrl) return publicDirectUrl;
    if (canProxy) return proxyUrl;
    return null;
  }, [useProxy, canProxy, proxyUrl, publicDirectUrl, isBusinessTelegram, cachedDataUrl, businessBlobUrl]);

  useEffect(() => {
    setFailed(false);
    setUseProxy(false);
    setBusinessBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [channelId, directUrl, provider, name, cacheKey]);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-medium text-zinc-600 ring-1 ring-border/60",
          sizeClass[size],
          className,
        )}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "shrink-0 rounded-full bg-zinc-100 object-cover ring-1 ring-border/60",
        sizeClass[size],
        className,
      )}
      onError={() => {
        if (!useProxy && canProxy && src !== proxyUrl) {
          setUseProxy(true);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
