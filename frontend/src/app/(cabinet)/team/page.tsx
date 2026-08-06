import { PageHeader } from "@/components/layout/PageHeader";
import { TeamInvitePanel } from "@/components/team/TeamInvitePanel";

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Команда"
        description="Приглашения участников в workspace и роли доступа."
      />
      <section className="max-w-2xl rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Пригласить участника</h2>
        <TeamInvitePanel />
      </section>
    </div>
  );
}
