import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiContentHub } from "@/components/generation/AiContentHub";

export default function AiPage() {
  return (
    <div>
      <PageHeader
        title="AI контент"
        description="Студия рекламы, фото и видео. Списание: квота тарифа → кошелёк."
      />
      <Suspense fallback={null}>
        <AiContentHub />
      </Suspense>
    </div>
  );
}
