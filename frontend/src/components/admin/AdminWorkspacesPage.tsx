"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ApiError,
  deleteAdminWorkspace,
  deleteAllAdminWorkspaces,
  fetchAdminWorkspace,
  fetchAdminWorkspaces,
  type AdminWorkspaceDetail,
  type AdminWorkspaceListItem,
  type AdminWorkspaceStats,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Админ",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

const inviteStatusLabels: Record<string, string> = {
  pending: "Ожидает",
  accepted: "Принят",
  revoked: "Отозван",
  expired: "Истёк",
};

function formatDateTime(iso: string) {
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceListItem[]>([]);
  const [stats, setStats] = useState<AdminWorkspaceStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminWorkspaceListItem | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminWorkspaces({ q: q.trim() || undefined, limit: 100 });
      setWorkspaces(data.workspaces);
      setStats(data.stats);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить workspace");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  async function handleDeleteAll() {
    if (
      !window.confirm(
        "Удалить ВСЕ workspace на платформе? Действие необратимо: каналы, посты и команды будут потеряны.",
      )
    ) {
      return;
    }
    const typed = window.prompt('Введите DELETE_ALL_WORKSPACES для подтверждения');
    if (typed !== "DELETE_ALL_WORKSPACES") return;

    setDeletingAll(true);
    setError(null);
    try {
      const res = await deleteAllAdminWorkspaces();
      setSelected(null);
      await load();
      window.alert(`Удалено workspace: ${res.deleted}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось удалить workspace");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Все рабочие пространства платформы, участники и приглашения
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Обновить
          </button>
          <button
            type="button"
            disabled={deletingAll || total === 0}
            onClick={() => void handleDeleteAll()}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            {deletingAll ? "Удаление…" : "Удалить все"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Workspace" value={stats.total_workspaces} />
          <StatCard label="Участников" value={stats.total_members} />
          <StatCard label="Владельцев" value={stats.total_owners} />
          <StatCard label="Приглашений (ожидают)" value={stats.pending_invites} />
          <StatCard label="Приглашений (приняты)" value={stats.accepted_invites} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: название, slug, email владельца…"
            className="min-w-[16rem] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <span className="text-sm text-slate-500">Всего: {total}</span>
        </div>

        {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Владелец</th>
                <th className="px-4 py-3 font-medium">Тариф</th>
                <th className="px-4 py-3 font-medium">Участники</th>
                <th className="px-4 py-3 font-medium">Приглашения</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Загрузка…
                  </td>
                </tr>
              ) : workspaces.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Workspace не найдены
                  </td>
                </tr>
              ) : (
                workspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{ws.name}</p>
                      <p className="text-xs text-slate-500">{ws.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{ws.owner_name || "—"}</p>
                      <p className="text-xs text-slate-500">{ws.owner_email}</p>
                    </td>
                    <td className="px-4 py-3">{ws.plan?.name ?? "—"}</td>
                    <td className="px-4 py-3">{ws.members_count}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">{ws.invites_pending} / {ws.invites_accepted}</span>
                      <p className="text-[11px] text-slate-400">ожид. / принято</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(ws.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(ws)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <WorkspaceDrawer
          workspaceId={selected.id}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function WorkspaceDrawer({
  workspaceId,
  onClose,
  onDeleted,
}: {
  workspaceId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<AdminWorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetchAdminWorkspace(workspaceId)
      .then(setDetail)
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Не удалось загрузить workspace");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleDelete() {
    if (!detail) return;
    if (
      !window.confirm(
        `Удалить workspace «${detail.name}»? Все участники и приглашения будут удалены.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAdminWorkspace(detail.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось удалить workspace");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {detail?.name ?? "Workspace"}
            </h2>
            {detail && (
              <>
                <p className="truncate text-sm text-slate-500">{detail.slug}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{detail.id}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {detail && !loading && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Владелец</p>
                  <p className="mt-0.5 font-medium">{detail.owner_name}</p>
                  <p className="text-xs text-slate-500">{detail.owner_email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Тариф</p>
                  <p className="mt-0.5 font-medium">{detail.plan?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Создан</p>
                  <p className="mt-0.5 font-medium">{formatDateTime(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Участников</p>
                  <p className="mt-0.5 font-medium">{detail.members_count}</p>
                </div>
              </div>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Участники</h3>
                {detail.members.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Нет участников</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {detail.members.map((m) => (
                      <li
                        key={m.user_id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {m.name || m.email}
                            </p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Вступил: {formatDateTime(m.joined_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {roleLabels[m.role] ?? m.role}
                            </span>
                            {m.joined_via_invite && (
                              <span className="text-[10px] text-emerald-700">по приглашению</span>
                            )}
                            {m.status === "suspended" && (
                              <span className="text-[10px] text-amber-700">отстранён</span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Приглашения в workspace</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Email-приглашения в команду workspace (не путать с инвайтами регистрации).
                </p>
                {detail.invites.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Приглашений нет</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {detail.invites.map((inv) => (
                      <li
                        key={inv.id}
                        className="rounded-lg border border-slate-100 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{inv.email}</p>
                            <p className="text-xs text-slate-500">
                              Роль: {roleLabels[inv.role] ?? inv.role}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              От: {inv.invited_by_name || inv.invited_by_email}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              inv.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : inv.status === "pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {inviteStatusLabels[inv.status] ?? inv.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="w-full rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                {deleting ? "Удаление…" : "Удалить workspace"}
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
