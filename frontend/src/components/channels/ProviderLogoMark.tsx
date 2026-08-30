"use client";

import { useEffect, useState } from "react";
import type { ChannelProvider } from "@/lib/api";
import { mediaUrl } from "@/lib/media-display";
import { cn } from "@/lib/utils";
import { ProviderIcon } from "./ProviderIcon";

type ProviderLogoMarkProps = {
  provider: ChannelProvider;
  logoUrl?: string | null;
  cacheKey?: string;
  className?: string;
};

export function ProviderLogoMark({
  provider,
  logoUrl,
  cacheKey,
  className,
}: ProviderLogoMarkProps) {
  const [failed, setFailed] = useState(false);
  const resolved = logoUrl?.trim() ? mediaUrl(logoUrl) : null;
  const src = resolved
    ? cacheKey
      ? `${resolved}${resolved.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`
      : resolved
    : null;

  useEffect(() => {
    setFailed(false);
  }, [logoUrl, cacheKey]);

  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 ring-1 ring-border/70",
        className,
      )}
      aria-hidden
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <ProviderIcon provider={provider} className="h-3.5 w-3.5" />
      )}
    </span>
  );
}
