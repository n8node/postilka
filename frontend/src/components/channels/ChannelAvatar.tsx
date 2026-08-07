"use client";

import { useEffect, useState } from "react";
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const displayName = channelDisplayName({ name, metadata });
  const initials = channelInitials(displayName);

  const directUrl = (avatarUrl?.trim() || metadata?.avatar_url?.trim() || "") || null;
  const publicDirectUrl =
    directUrl && isPublicChannelAvatarURL(directUrl, provider) ? directUrl : null;
  const proxyUrl = channelId ? channelProxyAvatarURL(channelId) : null;
  const needsProxyFetch = Boolean(
    channelId &&
      !publicDirectUrl &&
      (provider === "telegram" || provider === "max"),
  );

  useEffect(() => {
    setFailed(false);
    setBlobUrl(null);
  }, [channelId, directUrl, provider, name]);

  useEffect(() => {
    if (!needsProxyFetch || !proxyUrl) return;

    let active = true;
    let objectUrl: string | null = null;

    fetch(proxyUrl, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!blob.size) throw new Error("empty avatar");
        objectUrl = URL.createObjectURL(blob);
        if (active) setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [needsProxyFetch, proxyUrl]);

  const src = publicDirectUrl || blobUrl;

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
      onError={() => setFailed(true)}
    />
  );
}
