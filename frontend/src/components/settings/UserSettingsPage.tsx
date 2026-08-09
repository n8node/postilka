"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { UserInvitesBlock } from "@/components/settings/UserInvitesBlock";
import { LoginIdentitiesBlock } from "@/components/settings/LoginIdentitiesBlock";
import { ChangeEmailForm } from "@/components/settings/ChangeEmailForm";
import { WorkspaceSettingsBlock } from "@/components/settings/WorkspaceSettingsBlock";
import { TimezoneSettingsBlock } from "@/components/settings/TimezoneSettingsBlock";
import { fetchUserInvites } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export type UserSettingsKey =
  | "profile"
  | "workspace"
  | "email"
  | "invites"
  | "login"
  | "timezone";

const SETTINGS_MENU: {
  key: UserSettingsKey;
  label: string;
  description: string;
}[] = [
  { key: "profile", label: "Профиль", description: "Имя и email" },
  { key: "workspace", label: "Workspace", description: "Команда и доступ" },
  { key: "email", label: "Смена email", description: "Подтверждение адреса" },
  { key: "invites", label: "Мои инвайты", description: "Ключи регистрации" },
  { key: "login", label: "Вход через соцсети", description: "VK и MAX" },
  { key: "timezone", label: "Таймзона", description: "Расписание публикаций" },
];

function isSettingsKey(value: string | null): value is UserSettingsKey {
  return SETTINGS_MENU.some((item) => item.key === value);
}

function ProfileSection() {
  const { user } = useAuth();
  const emailVerified = Boolean(user.email_verified_at);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Профиль</h2>
        <p className="mt-1 text-sm text-muted">Основные данные вашего аккаунта.</p>
      </div>
      <dl className="max-w-lg space-y-4 text-sm">
        <div>
          <dt className="text-muted">Имя</dt>
          <dd className="mt-1 font-medium">{user.name || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="mt-1 font-medium">
            {user.email}
            {!emailVerified && (
              <span className="ml-2 text-xs text-amber-700">не подтверждён</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function EmailSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Смена email</h2>
        <p className="mt-1 text-sm text-muted">
          После смены адреса потребуется подтверждение нового email по ссылке из письма.
        </p>
      </div>
      <div className="max-w-lg">
        <ChangeEmailForm embedded />
      </div>
    </div>
  );
}

function SettingsSectionContent({
  selected,
}: {
  selected: UserSettingsKey;
}) {
  switch (selected) {
    case "profile":
      return <ProfileSection />;
    case "workspace":
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text">Workspace</h2>
            <p className="mt-1 text-sm text-muted">
              Переименование, удаление и приглашение участников по email.
            </p>
          </div>
          <WorkspaceSettingsBlock embedded />
        </div>
      );
    case "email":
      return <EmailSection />;
    case "invites":
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-text">Мои инвайты</h2>
            <p className="mt-1 text-sm text-muted">
              Делитесь ключами для регистрации новых пользователей.
            </p>
          </div>
          <UserInvitesBlock embedded />
        </div>
      );
    case "login":
      return <LoginIdentitiesBlock embedded />;
    case "timezone":
      return <TimezoneSettingsBlock embedded />;
    default:
      return null;
  }
}

export function UserSettingsPage() {
  const searchParams = useSearchParams();
  const initialSection = searchParams.get("section");

  const [selected, setSelected] = useState<UserSettingsKey>(
    isSettingsKey(initialSection) ? initialSection : "profile",
  );
  const [invitesEnabled, setInvitesEnabled] = useState(false);

  useEffect(() => {
    fetchUserInvites()
      .then((data) => setInvitesEnabled(data.invite_registration_enabled))
      .catch(() => setInvitesEnabled(false));
  }, []);

  useEffect(() => {
    const section = searchParams.get("section");
    if (isSettingsKey(section)) {
      setSelected(section);
    }
  }, [searchParams]);

  const menu = useMemo(
    () => SETTINGS_MENU.filter((item) => item.key !== "invites" || invitesEnabled),
    [invitesEnabled],
  );

  useEffect(() => {
    if (selected === "invites" && !invitesEnabled) {
      setSelected("profile");
    }
  }, [selected, invitesEnabled]);

  function selectSection(key: UserSettingsKey) {
    setSelected(key);
    const url = new URL(window.location.href);
    url.searchParams.set("section", key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Настройки"
        description="Профиль, workspace, вход и параметры публикаций."
        className="mb-4"
      />

      <div className="flex min-h-[620px] overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-zinc-50">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Разделы
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {menu.map((item) => {
                const active = selected === item.key;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => selectSection(item.key)}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-white font-medium text-text shadow-sm"
                          : "text-muted hover:bg-white/70 hover:text-text",
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="mt-0.5 block text-xs text-muted/80">
                        {item.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <SettingsSectionContent selected={selected} />
        </div>
      </div>
    </div>
  );
}
