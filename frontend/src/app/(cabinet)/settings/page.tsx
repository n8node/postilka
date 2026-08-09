"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { UserInvitesBlock } from "@/components/settings/UserInvitesBlock";
import { LoginIdentitiesBlock } from "@/components/settings/LoginIdentitiesBlock";
import { ChangeEmailForm } from "@/components/settings/ChangeEmailForm";
import { WorkspaceSettingsBlock } from "@/components/settings/WorkspaceSettingsBlock";
import { TimezoneSettingsBlock } from "@/components/settings/TimezoneSettingsBlock";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const emailVerified = Boolean(user.email_verified_at);

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Профиль, привязка соцсетей для входа и параметры workspace."
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
              <dd className="font-medium">
                {user.email}
                {!emailVerified && (
                  <span className="ml-2 text-xs text-amber-700">не подтверждён</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <WorkspaceSettingsBlock />

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Смена email</h2>
          <p className="mt-2 text-sm text-muted">
            После смены адреса потребуется подтверждение нового email по ссылке из письма.
          </p>
          <ChangeEmailForm />
        </section>

        <UserInvitesBlock />

        <LoginIdentitiesBlock />

        <TimezoneSettingsBlock />
      </div>
    </div>
  );
}
