"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiContentHub } from "@/components/generation/AiContentHub";

function AiPageInner() {
  const searchParams = useSearchParams();
  const isSketch = searchParams.get("tab") === "sketch";

  return (
    <div>
      {!isSketch && (
        <PageHeader
          title="AI контент"
          description="Студия рекламы, фото, видео и набросок. Списание: квота тарифа → кошелёк."
        />
      )}
      <AiContentHub />
    </div>
  );
}

export function AiPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AiPageInner />
    </Suspense>
  );
}
