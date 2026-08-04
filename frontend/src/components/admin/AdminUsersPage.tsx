"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ApiError,
  fetchAdminUsers,
  type AdminUser,
  type AdminUsersQuery,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const workspaceRoleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Админ",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

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

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "red" | "blue" | "slate";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    red: "bg-rose-50 text-rose-700 ring-rose-600/15",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
    slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "active" | "blocked">(
    "all",
  );
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: AdminUsersQuery = {};
    if (q.trim()) query.q = q.trim();
    if (accountFilter === "active") query.is_blocked = false;
    if (accountFilter === "blocked") query.is_blocked = true;
    if (roleFilter === "admin") query.is_platform_admin = true;
    if (roleFilter === "user") query.is_platform_admin = false;

    try {
      const data = await fetchAdminUsers(query);
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Не удалось загрузить пользователей";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [q, accountFilter, roleFilter]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Пользователи
          </h1>
          <p className="mt-1 text-sm text-slate-500">Всего: {total}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Обновить
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="min-w-[220px] flex-1 text-xs font-medium text-slate-500">
          Поиск email или ФИО
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск email или ФИО"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Аккаунт
          <select
            value={accountFilter}
            onChange={(e) =>
              setAccountFilter(e.target.value as typeof accountFilter)
            }
            className="mt-1 block w-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="all">Все</option>
            <option value="active">Активен</option>
            <option value="blocked">Заблокирован</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Роль
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="mt-1 block w-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="all">Все</option>
            <option value="admin">Superadmin</option>
            <option value="user">Пользователь</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Пользователь</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Статус аккаунта</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Роль WS</th>
                <th className="px-4 py-3">Язык</th>
                <th className="px-4 py-3">Таймзона</th>
                <th className="px-4 py-3">Зарегистрирован</th>
                <th className="px-4 py-3">Обновлён</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {u.name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-slate-500">
                      {u.id}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_blocked ? (
                        <Badge tone="red">Заблокирован</Badge>
                      ) : (
                        <Badge tone="green">Активен</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_platform_admin ? (
                        <Badge tone="blue">Superadmin</Badge>
                      ) : (
                        <span className="text-slate-700">Пользователь</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {u.workspace?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {u.workspace
                        ? workspaceRoleLabels[u.workspace.role] ??
                          u.workspace.role
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.locale}</td>
                    <td className="px-4 py-3 text-slate-700">{u.timezone}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(u.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(u)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <UserDrawer user={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function UserDrawer({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {user.name || "Без имени"}
            </h2>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
              {user.id}
            </p>
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
          <div className="flex flex-wrap gap-2">
            {user.is_blocked ? (
              <Badge tone="red">Аккаунт заблокирован</Badge>
            ) : (
              <Badge tone="green">Аккаунт активен</Badge>
            )}
            {user.is_platform_admin ? (
              <Badge tone="blue">Superadmin</Badge>
            ) : (
              <Badge tone="slate">Пользователь</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Зарегистрирован</p>
              <p className="mt-0.5 font-medium">{formatDateTime(user.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Обновлён</p>
              <p className="mt-0.5 font-medium">{formatDateTime(user.updated_at)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Язык</p>
              <p className="mt-0.5 font-medium">{user.locale}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Таймзона</p>
              <p className="mt-0.5 font-medium">{user.timezone}</p>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Workspace и роль
            </h3>
            {user.workspace ? (
              <div className="mt-3 space-y-2">
                <p className="font-medium text-slate-800">{user.workspace.name}</p>
                <p className="text-xs text-slate-500">{user.workspace.slug}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge tone="slate">
                    {workspaceRoleLabels[user.workspace.role] ??
                      user.workspace.role}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Нет workspace</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
