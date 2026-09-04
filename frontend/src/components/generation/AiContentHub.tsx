"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Film, ImageIcon, LayoutGrid, Paintbrush, TrendingUp } from "lucide-react";
import { AdStudioPage } from "@/components/generation/AdStudioPage";
import { GenerationPageContent } from "@/components/generation/GenerationPageContent";
import { VideoGenerationPageContent } from "@/components/generation/VideoGenerationPageContent";
import { SketchPage } from "@/components/sketch/SketchPage";
import { aiTabHref, type AiHubTab } from "@/lib/ad-studio";
import { cn } from "@/lib/utils";

const catalogTabs: { id: AiHubTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "studio", label: "Студия", icon: LayoutGrid },
  { id: "trends", label: "Тренды", icon: TrendingUp },
];

const toolTabs: { id: AiHubTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "photo", label: "Фото", icon: ImageIcon },
  { id: "video", label: "Видео", icon: Film },
  { id: "sketch", label: "Набросок", icon: Paintbrush },
];

function parseAiTab(raw: string | null): AiHubTab {
  if (raw === "video" || raw === "photo" || raw === "sketch" || raw === "trends") {
    return raw;
  }
  return "studio";
}

function TabLink({
  id,
  label,
  icon: Icon,
  active,
}: {
  id: AiHubTab;
  label: string;
  icon: typeof ImageIcon;
  active: boolean;
}) {
  return (
    <Link
      href={aiTabHref(id)}
      scroll={false}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-accent text-white shadow-sm"
          : "text-muted hover:bg-zinc-50 hover:text-text",
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

export function AiContentHub() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<AiHubTab>(parseAiTab(tabParam));
  const [sketchReady, setSketchReady] = useState(tabParam === "sketch");

  useEffect(() => {
    const next = parseAiTab(tabParam);
    setTab(next);
    if (next === "sketch") {
      setSketchReady(true);
    }
  }, [tabParam]);

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit max-w-full shrink-0 flex-wrap items-center rounded-lg border border-border bg-bg p-1">
        {catalogTabs.map((item) => (
          <TabLink key={item.id} {...item} active={tab === item.id} />
        ))}
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        {toolTabs.map((item) => (
          <TabLink key={item.id} {...item} active={tab === item.id} />
        ))}
      </div>

      {tab === "studio" ? (
        <AdStudioPage catalog="studio" />
      ) : tab === "trends" ? (
        <AdStudioPage catalog="trends" />
      ) : tab === "photo" ? (
        <GenerationPageContent />
      ) : tab === "video" ? (
        <VideoGenerationPageContent />
      ) : null}

      {sketchReady ? (
        <div className={cn(tab !== "sketch" && "hidden")}>
          <SketchPage />
        </div>
      ) : null}
    </div>
  );
}
