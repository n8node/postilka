"use client";

import { isLocalMediaUrl, mediaUrl } from "@/lib/media-display";

type ProtectedMediaImageProps = {
  url: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  draggable?: boolean;
};

/**
 * Auth-gated media is streamed from same-origin API (backend proxies S3).
 */
export function ProtectedMediaImage({
  url,
  alt = "",
  className,
  style,
  loading,
  decoding,
  draggable,
}: ProtectedMediaImageProps) {
  if (!url) return null;

  const src = isLocalMediaUrl(url) ? url : mediaUrl(url);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding={decoding}
      draggable={draggable}
    />
  );
}
