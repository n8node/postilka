"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiContentHub } from "@/components/generation/AiContentHub";

export function AiPageWrapper() {
  return (
    <div>
      <PageHeader
        title="AI контент"
        description="Студия, тренды, фото, видео и набросок. Списание: квота тарифа → кошелёк."
      />
      <Suspense fallback={null}>
        <AiContentHub />
      </Suspense>
    </div>
  );
}
