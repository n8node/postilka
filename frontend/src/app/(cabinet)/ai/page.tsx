import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { StubBadge } from "@/components/layout/StubBadge";

export default function AiPage() {
  return (
    <div>
      <PageHeader
        title="AI"
        description="Yandex GPT для текста и KIE для медиа. Списание: квота тарифа → кошелёк."
        actions={<StubBadge label="Волна 7" />}
      />
      <EmptyState
        title="AI пока недоступен"
        description="Генерация и рерайт появятся в композере. Здесь будет история запросов и остаток квоты."
      />
    </div>
  );
}
