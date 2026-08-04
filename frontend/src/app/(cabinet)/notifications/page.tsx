import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { StubBadge } from "@/components/layout/StubBadge";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Уведомления"
        description="Публикации, ошибки, токены каналов и баланс."
        actions={<StubBadge />}
      />
      <EmptyState
        title="Нет уведомлений"
        description="In-app лента и настройки каналов доставки появятся позже."
      />
    </div>
  );
}
