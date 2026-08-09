"use client";

import { useEffect, useState } from "react";
import {
  isLocalMediaUrl,
  mediaUrl,
  requiresProtectedMedia,
} from "@/lib/media-display";

type ProtectedMediaImageProps = {
  url: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  draggable?: boolean;
};

export function ProtectedMediaImage({
  url,
  alt = "",
  className,
  style,
  loading,
  decoding,
  draggable,
}: ProtectedMediaImageProps) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!url) {
      setSrc("");
      return;
    }

    if (isLocalMediaUrl(url) || !requiresProtectedMedia(url)) {
      setSrc(mediaUrl(url));
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const controller = new AbortController();

    void fetch(mediaUrl(url), {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("media fetch failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!url) return null;

  if (isLocalMediaUrl(url) || !requiresProtectedMedia(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl(url)}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        decoding={decoding}
        draggable={draggable}
      />
    );
  }

  if (!src) {
    return (
      <span
        className={className}
        style={style}
        role="img"
        aria-label={alt}
      />
    );
  }

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
