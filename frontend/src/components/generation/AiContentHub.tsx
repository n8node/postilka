"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Film, ImageIcon, LayoutGrid, Paintbrush } from "lucide-react";
import { AdStudioPage } from "@/components/generation/AdStudioPage";
import { GenerationPageContent } from "@/components/generation/GenerationPageContent";
import { VideoGenerationPageContent } from "@/components/generation/VideoGenerationPageContent";
import { SketchPage } from "@/components/sketch/SketchPage";
import { aiTabHref } from "@/lib/ad-studio";
import { cn } from "@/lib/utils";

type AiTab = "studio" | "photo" | "video" | "sketch";

const tabs: { id: AiTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "studio", label: "Студия", icon: LayoutGrid },
  { id: "photo", label: "Фото", icon: ImageIcon },
  { id: "video", label: "Видео", icon: Film },
  { id: "sketch", label: "Набросок", icon: Paintbrush },
];

export function AiContentHub() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<AiTab>(
    tabParam === "video"
      ? "video"
      : tabParam === "photo"
        ? "photo"
        : tabParam === "sketch"
          ? "sketch"
          : "studio",
  );

  useEffect(() => {
    setTab(
      tabParam === "video"
        ? "video"
        : tabParam === "photo"
          ? "photo"
          : tabParam === "sketch"
            ? "sketch"
            : "studio",
    );
  }, [tabParam]);

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit shrink-0 rounded-lg border border-border bg-bg p-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <Link
              key={item.id}
              href={aiTabHref(item.id)}
              scroll={false}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:bg-zinc-50 hover:text-text",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {tab === "studio" ? (
        <AdStudioPage />
      ) : tab === "photo" ? (
        <GenerationPageContent />
      ) : tab === "video" ? (
        <VideoGenerationPageContent />
      ) : (
        <SketchPage />
      )}
    </div>
  );
}
