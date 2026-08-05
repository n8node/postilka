"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { StubBadge } from "@/components/layout/StubBadge";
import { UserInvitesBlock } from "@/components/settings/UserInvitesBlock";
import { LoginIdentitiesBlock } from "@/components/settings/LoginIdentitiesBlock";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user, workspace } = useAuth();

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Профиль, таймзона и уведомления workspace."
        actions={<StubBadge label="Макет" />}
      />

      <div className="max-w-xl space-y-4">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Профиль</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Имя</dt>
              <dd className="font-medium">{user.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Workspace</dt>
              <dd className="font-medium">
                {workspace?.name ?? "—"}
                {workspace?.slug ? (
                  <span className="text-muted"> ({workspace.slug})</span>
                ) : null}
              </dd>
            </div>
          </dl>
        </section>

        <UserInvitesBlock />

        <LoginIdentitiesBlock />

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Таймзона</h2>
          <p className="mt-2 text-sm text-muted">
            Выбор таймзоны для расписания — заглушка. Сейчас используется TZ workspace на
            бэкенде.
          </p>
          <select
            disabled
            className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm opacity-60"
            defaultValue="Europe/Moscow"
          >
            <option value="Europe/Moscow">Europe/Moscow</option>
          </select>
        </section>
      </div>
    </div>
  );
}
