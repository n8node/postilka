"use client";

import { useState } from "react";
import type { ChannelMetadata, ChannelProvider } from "@/lib/api";
import {
  channelAvatarSrc,
  channelDisplayName,
  channelInitials,
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
  const displayName = channelDisplayName({ name, metadata });
  const initials = channelInitials(displayName);
  const src = channelAvatarSrc({ channelId, metadata, avatarUrl, provider });

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
