"use client";

import type { GenerationNavItem } from "@/lib/api";
import { generationNavLucideIcon } from "@/lib/generation-nav-icons";
import { mediaUrl } from "@/lib/media-display";
import { cn } from "@/lib/utils";

type GenerationNavIconProps = {
  item: Pick<GenerationNavItem, "icon_kind" | "icon_name" | "icon_url" | "title">;
  className?: string;
  imageClassName?: string;
};

export function GenerationNavIcon({ item, className, imageClassName }: GenerationNavIconProps) {
  if (item.icon_kind === "upload" && item.icon_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl(item.icon_url)}
        alt=""
        className={cn("h-4 w-4 shrink-0 rounded-sm object-contain", imageClassName, className)}
      />
    );
  }
  const Icon = generationNavLucideIcon(item.icon_name);
  return <Icon className={cn("h-4 w-4 shrink-0", className)} aria-hidden />;
}
