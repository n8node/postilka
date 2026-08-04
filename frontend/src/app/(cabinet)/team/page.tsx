import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { StubBadge } from "@/components/layout/StubBadge";

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Команда"
        description="Роли, инвайты и approval постов."
        actions={<StubBadge label="Волна 8" />}
      />
      <EmptyState
        title="Пока только вы"
        description="Приглашения участников и роли owner/admin/editor/viewer появятся позже."
        action={
          <button
            type="button"
            disabled
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white opacity-60"
          >
            Пригласить
          </button>
        }
      />
    </div>
  );
}
