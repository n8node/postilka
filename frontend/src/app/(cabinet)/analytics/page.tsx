import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { StubBadge } from "@/components/layout/StubBadge";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Аналитика"
        description="Метрики постов и каналов из API сетей."
        actions={<StubBadge label="Волна 9" />}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {["Охваты", "Вовлечённость", "Публикации"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">—</p>
          </div>
        ))}
      </div>
      <EmptyState
        title="Графики появятся позже"
        description="Дашборд периода подключится, когда провайдеры начнут отдавать метрики."
      />
    </div>
  );
}
