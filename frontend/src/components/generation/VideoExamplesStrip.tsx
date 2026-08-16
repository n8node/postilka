"use client";

import { fetchVideoGenerationExamples, type KieVideoExample } from "@/lib/api";
import { exampleToPreset } from "@/lib/video-generation-data";
import { ProtectedMediaVideo } from "@/components/media/ProtectedMediaVideo";
import { Card } from "@/components/ui/Card";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type VideoExamplesStripProps = {
  onSelect: (preset: ReturnType<typeof exampleToPreset>) => void;
};

export function VideoExamplesStrip({ onSelect }: VideoExamplesStripProps) {
  const [examples, setExamples] = useState<KieVideoExample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchVideoGenerationExamples()
      .then((res) => setExamples(res.examples ?? []))
      .catch(() => setExamples([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || examples.length === 0) return null;

  return (
    <Card hover className="mb-0">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-accent" />
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          Примеры
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {examples.slice(0, 4).map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => onSelect(exampleToPreset(example))}
            className="flex gap-3 rounded-lg border border-border bg-bg p-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-zinc-100">
              {example.video_url ? (
                <ProtectedMediaVideo
                  url={example.video_url}
                  poster={example.source_image_urls?.[0]}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  autoPlay
                  controls={false}
                  lazy
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[12px] font-medium text-text">
                {example.prompt}
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                {example.aspect_ratio} · {example.duration} сек
              </p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
