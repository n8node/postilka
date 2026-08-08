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
  size?: keyof typeof sizeClass;
  className?: string;
};

export function ChannelAvatar({
  name,
  metadata,
  channelId,
  avatarUrl,
  provider,
  size = "md",
  className,
}: ChannelAvatarProps) {
  const [failed, setFailed] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const displayName = channelDisplayName({ name, metadata });
  const initials = channelInitials(displayName);

  const directUrl = (avatarUrl?.trim() || metadata?.avatar_url?.trim() || "") || null;
  const publicDirectUrl =
    directUrl && isPublicChannelAvatarURL(directUrl, provider) ? directUrl : null;
  const proxyUrl = channelId ? channelProxyAvatarURL(channelId) : null;
  const canProxy = Boolean(
    channelId && (provider === "telegram" || provider === "max" || provider === "youtube") && proxyUrl,
  );

  const src = useMemo(() => {
    if (useProxy && canProxy) return proxyUrl;
    if (publicDirectUrl) return publicDirectUrl;
    if (canProxy) return proxyUrl;
    return null;
  }, [useProxy, canProxy, proxyUrl, publicDirectUrl]);

  useEffect(() => {
    setFailed(false);
    setUseProxy(false);
  }, [channelId, directUrl, provider, name]);

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
        if (!useProxy && canProxy && publicDirectUrl && src === publicDirectUrl) {
          setUseProxy(true);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
