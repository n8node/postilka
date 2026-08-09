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
 * Auth-gated media is served via same-origin API URLs that redirect to S3.
 * Use <img src> (not fetch+blob): cookies apply on the API hop; img loads
 * cross-origin after redirect without CORS credential restrictions.
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
