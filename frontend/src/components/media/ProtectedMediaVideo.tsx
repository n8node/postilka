"use client";

import { isLocalMediaUrl, mediaUrl } from "@/lib/media-display";

type ProtectedMediaVideoProps = {
  url: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
};

export function ProtectedMediaVideo({
  url,
  className,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  poster,
}: ProtectedMediaVideoProps) {
  if (!url) return null;
  const src = isLocalMediaUrl(url) ? url : mediaUrl(url);

  return (
    <video
      src={src}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      poster={poster}
      playsInline
      preload={autoPlay ? "auto" : "metadata"}
    />
  );
}
