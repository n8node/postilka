"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchAdminAuthSettings,
  fetchAdminInvites,
  issueAdminInvites,
  revokeAdminInvite,
  updateAdminAuthSettings,
  type AdminInvite,
  type AdminInvitesQuery,
  type InviteRelation,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
      : status === "USED"
        ? "bg-slate-100 text-slate-600 ring-slate-500/10"
        : status === "EXPIRED"
          ? "bg-amber-50 text-amber-700 ring-amber-600/15"
          : "bg-rose-50 text-rose-700 ring-rose-600/15";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tone,
      )}
    >
      {status}
    </span>
  );
}

export function AdminInvitesPage() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [relations, setRelations] = useState<InviteRelation[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    total_relations: 0,
    unique_inviters: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [scope, setScope] = useState("");

  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [vkLoginEnabled, setVkLoginEnabled] = useState(false);
  const [maxLoginEnabled, setMaxLoginEnabled] = useState(false);
  const [vkClientId, setVkClientId] = useState("");
  const [vkClientSecret, setVkClientSecret] = useState("");
  const [vkClientSecretSet, setVkClientSecretSet] = useState(false);
  const [vkRedirectUri, setVkRedirectUri] = useState("");
  const [maxBotUsername, setMaxBotUsername] = useState("");
  const [maxBotToken, setMaxBotToken] = useState("");
  const [maxBotTokenSet, setMaxBotTokenSet] = useState(false);
  const [maxWebhookSecret, setMaxWebhookSecret] = useState("");
  const [maxWebhookSecretSet, setMaxWebhookSecretSet] = useState(false);
  const [maxWebhookUrl, setMaxWebhookUrl] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [issueCount, setIssueCount] = useState(10);
  const [issuing, setIssuing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchAdminAuthSettings();
      setInviteEnabled(data.invite_registration_enabled);
      setVkLoginEnabled(Boolean(data.vk_login_enabled));
      setMaxLoginEnabled(Boolean(data.max_login_enabled));
      setVkClientId(data.oauth?.vk.client_id ?? "");
      setVkClientSecret("");
      setVkClientSecretSet(Boolean(data.oauth?.vk.client_secret_set));
      setVkRedirectUri(data.oauth?.vk.redirect_uri ?? "");
      setMaxBotUsername(data.oauth?.max.bot_username ?? "");
      setMaxBotToken("");
      setMaxBotTokenSet(Boolean(data.oauth?.max.bot_token_set));
      setMaxWebhookSecret("");
      setMaxWebhookSecretSet(Boolean(data.oauth?.max.webhook_secret_set));
      setMaxWebhookUrl(data.oauth?.max.webhook_url ?? "");
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: AdminInvitesQuery = { page, limit: 30 };
    if (search.trim()) query.search = search.trim();
    if (status) query.status = status;
    if (scope) query.scope = scope;

    try {
      const data = await fetchAdminInvites(query);
      setInvites(data.invites);
      setRelations(data.relations);
      setStats(data.stats);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить инвайты");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, scope]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  const relationStats = useMemo(
    () => ({
      totalRelations: stats.total_relations,
      invitersCount: stats.unique_inviters,
    }),
    [stats],
  );

  async function handleSaveAuthSettings() {
    setSettingsSaving(true);
    setError(null);
    try {
      await updateAdminAuthSettings({
        invite_registration_enabled: inviteEnabled,
        vk_login_enabled: vkLoginEnabled,
        max_login_enabled: maxLoginEnabled,
        vk: {
          client_id: vkClientId,
          client_secret: vkClientSecret,
        },
        max: {
          bot_username: maxBotUsername,
          bot_token: maxBotToken,
          webhook_secret: maxWebhookSecret,
        },
      });
      await loadSettings();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить настройки");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleIssue() {
    setIssuing(true);
    setError(null);
    try {
      await issueAdminInvites(issueCount);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось выпустить инвайты");
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevoke(invite: AdminInvite) {
    if (invite.effective_status !== "ACTIVE") return;
    if (!window.confirm(`Отозвать инвайт ${invite.code}?`)) return;
    setRevokingId(invite.id);
    try {
      await revokeAdminInvite(invite.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось отозвать инвайт");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Инвайты
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Управление регистрацией по ключам и статистика активаций
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Обновить
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Всего", value: stats.total },
          { label: "Активных", value: stats.active },
          { label: "Использовано", value: stats.used },
          { label: "Связей", value: relationStats.totalRelations },
          { label: "Уник. пригласивших", value: relationStats.invitersCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Настройки входа и регистрации
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Инвайты, VK ID и MAX — ключи хранятся в базе, доступны только админам.
            </p>
          </div>
          <button
            type="button"
            disabled={settingsSaving}
            onClick={() => void handleSaveAuthSettings()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {settingsSaving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3">
            <input
              type="checkbox"
              checked={inviteEnabled}
              disabled={settingsSaving}
              onChange={(e) => setInviteEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Регистрация по инвайтам</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3">
            <input
              type="checkbox"
              checked={vkLoginEnabled}
              disabled={settingsSaving}
              onChange={(e) => setVkLoginEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Вход через ВКонтакте</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3">
            <input
              type="checkbox"
              checked={maxLoginEnabled}
              disabled={settingsSaving}
              onChange={(e) => setMaxLoginEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Вход через MAX</span>
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="text-sm font-medium text-slate-900">VK ID</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-slate-500">
                Client ID
                <input
                  value={vkClientId}
                  onChange={(e) => setVkClientId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Client Secret
                <input
                  type="password"
                  value={vkClientSecret}
                  onChange={(e) => setVkClientSecret(e.target.value)}
                  placeholder={vkClientSecretSet ? "Уже задан — оставьте пустым" : "Введите secret"}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {vkRedirectUri && (
                <p className="text-xs text-slate-500">
                  Redirect URI для VK ID:{" "}
                  <code className="rounded bg-slate-100 px-1">{vkRedirectUri}</code>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 p-4">
            <h3 className="text-sm font-medium text-slate-900">MAX бот</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-slate-500">
                Username бота
                <input
                  value={maxBotUsername}
                  onChange={(e) => setMaxBotUsername(e.target.value)}
                  placeholder="my_bot"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Bot token
                <input
                  type="password"
                  value={maxBotToken}
                  onChange={(e) => setMaxBotToken(e.target.value)}
                  placeholder={maxBotTokenSet ? "Уже задан — оставьте пустым" : "Токен бота"}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Webhook secret
                <input
                  type="password"
                  value={maxWebhookSecret}
                  onChange={(e) => setMaxWebhookSecret(e.target.value)}
                  placeholder={maxWebhookSecretSet ? "Уже задан — оставьте пустым" : "Секрет для X-Max-Bot-Api-Secret"}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {maxWebhookUrl && (
                <p className="text-xs text-slate-500">
                  Webhook URL:{" "}
                  <code className="rounded bg-slate-100 px-1">{maxWebhookUrl}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Выпуск SYSTEM-инвайтов
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Системные ключи для публичной раздачи (до 200 за раз).
          </p>
          <div className="mt-4 flex items-end gap-3">
            <label className="text-xs font-medium text-slate-500">
              Количество
              <input
                type="number"
                min={1}
                max={200}
                value={issueCount}
                onChange={(e) => setIssueCount(Number(e.target.value) || 1)}
                className="mt-1 block w-24 rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={issuing}
              onClick={() => void handleIssue()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {issuing ? "Выпуск…" : "Выпустить"}
            </button>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="min-w-[200px] flex-1 text-xs font-medium text-slate-500">
          Поиск
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Код, email…"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Статус
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Все</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="USED">USED</option>
            <option value="REVOKED">REVOKED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Scope
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Все</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="USER">USER</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Владелец</th>
                <th className="px-4 py-3">Использовал</th>
                <th className="px-4 py-3">Создан</th>
                <th className="px-4 py-3">Использован</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && invites.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Инвайты не найдены
                  </td>
                </tr>
              )}
              {!loading &&
                invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs">{inv.code}</td>
                    <td className="px-4 py-3">{inv.scope}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.effective_status} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {inv.owner_user?.email ?? (
                        <span className="text-slate-400">Системный</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {inv.used_by_user?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDateTime(inv.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDateTime(inv.used_at)}
                    </td>
                    <td className="px-4 py-3">
                      {inv.effective_status === "ACTIVE" && (
                        <button
                          type="button"
                          disabled={revokingId === inv.id}
                          onClick={() => void handleRevoke(inv)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Отозвать
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            Всего: {total} · стр. {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Связи «пригласил → зарегистрировался»
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Код</th>
                <th className="px-4 py-3">Пригласил</th>
                <th className="px-4 py-3">Зарегистрировался</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {relations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Связей пока нет
                  </td>
                </tr>
              )}
              {relations.slice(0, 50).map((rel) => (
                <tr key={rel.id}>
                  <td className="px-4 py-3 font-mono text-xs">{rel.invite_code}</td>
                  <td className="px-4 py-3 text-xs">
                    {rel.inviter?.email ?? (
                      <span className="text-slate-400">Системный</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{rel.invited?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {formatDateTime(rel.used_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
