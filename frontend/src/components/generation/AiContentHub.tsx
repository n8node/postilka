"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Film, ImageIcon, LayoutGrid } from "lucide-react";
import { AdStudioPage } from "@/components/generation/AdStudioPage";
import { GenerationPageContent } from "@/components/generation/GenerationPageContent";
import { VideoGenerationPageContent } from "@/components/generation/VideoGenerationPageContent";
import { cn } from "@/lib/utils";

type AiTab = "studio" | "photo" | "video";

const tabs: { id: AiTab; label: string; icon: typeof ImageIcon }[] = [
  { id: "studio", label: "Студия", icon: LayoutGrid },
  { id: "photo", label: "Фото", icon: ImageIcon },
  { id: "video", label: "Видео", icon: Film },
];

export function AiContentHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<AiTab>(
    tabParam === "video" ? "video" : tabParam === "photo" ? "photo" : "studio",
  );

  useEffect(() => {
    setTab(tabParam === "video" ? "video" : tabParam === "photo" ? "photo" : "studio");
  }, [tabParam]);

  const switchTab = useCallback(
    (next: AiTab) => {
      setTab(next);
      const qs =
        next === "video" ? "?tab=video" : next === "photo" ? "?tab=photo" : "";
      router.replace(`/ai${qs}`, { scroll: false });
    },
    [router],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit rounded-lg border border-border bg-bg p-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:bg-zinc-50 hover:text-text",
              )}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "studio" ? (
        <AdStudioPage />
      ) : tab === "photo" ? (
        <GenerationPageContent />
      ) : (
        <VideoGenerationPageContent />
      )}
    </div>
  );
}
