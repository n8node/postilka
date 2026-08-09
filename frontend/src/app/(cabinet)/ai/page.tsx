import { PageHeader } from "@/components/layout/PageHeader";
import { GenerationPageContent } from "@/components/generation/GenerationPageContent";

export default function AiPage() {
  return (
    <div>
      <PageHeader
        title="AI контент"
        description="KIE для медиа: текст → фото, фото → фото и комбинации. Списание: квота тарифа → кошелёк."
      />
      <GenerationPageContent />
    </div>
  );
}
