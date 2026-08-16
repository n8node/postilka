"use client";

import { useEffect, useRef, useState } from "react";
import { isLocalMediaUrl, mediaUrl } from "@/lib/media-display";
import { useLazyInView } from "@/lib/use-lazy-in-view";
import { cn } from "@/lib/utils";
import { ProtectedMediaImage } from "./ProtectedMediaImage";

type ProtectedMediaVideoProps = {
  url: string;
  className?: string;
  wrapperClassName?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  lazy?: boolean;
  lazyRootMargin?: string;
  pauseWhenOffscreen?: boolean;
};

export function ProtectedMediaVideo({
  url,
  className,
  wrapperClassName,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  poster,
  lazy = false,
  lazyRootMargin,
  pauseWhenOffscreen = true,
}: ProtectedMediaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref, inView } = useLazyInView({
    enabled: lazy,
    rootMargin: lazyRootMargin,
  });
  const [activated, setActivated] = useState(!lazy);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (inView) setActivated(true);
  }, [inView]);

  useEffect(() => {
    setVideoReady(false);
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activated) return;
    if (!autoPlay) return;
    if (inView || !pauseWhenOffscreen) {
      void video.play().catch(() => {});
      return;
    }
    video.pause();
  }, [activated, autoPlay, inView, pauseWhenOffscreen, videoReady]);

  if (!url) return null;

  const src = isLocalMediaUrl(url) ? url : mediaUrl(url);
  const showPoster = Boolean(poster) && (!activated || !videoReady);

  return (
    <div
      ref={lazy ? ref : undefined}
      className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}
    >
      {showPoster && poster ? (
        <ProtectedMediaImage
          url={poster}
          alt=""
          className={cn("absolute inset-0 h-full w-full", className)}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      {activated ? (
        <video
          ref={videoRef}
          src={src}
          className={cn(
            "h-full w-full transition-opacity duration-200",
            className,
            showPoster ? "opacity-0" : "opacity-100",
          )}
          controls={controls}
          autoPlay={autoPlay && (inView || !pauseWhenOffscreen)}
          loop={loop}
          muted={muted}
          poster={undefined}
          playsInline
          preload={autoPlay ? "auto" : "metadata"}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
        />
      ) : null}
    </div>
  );
}
