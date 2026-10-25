"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ApiError,
  addAdminUserInvites,
  assignAdminUserPlan,
  deleteAdminUser,
  fetchAdminPlans,
  fetchAdminUserInviteRelations,
  fetchAdminUserInvites,
  fetchAdminUserLoginIdentities,
  fetchAdminUserWorkspaces,
  fetchAdminUsers,
  approveAdminUser,
  setAdminUserBlocked,
  type AdminUser,
  type AdminUsersQuery,
  type AdminUsersSort,
  type AdminUserWorkspaceItem,
  type LoginIdentity,
  type Plan,
  type UserInvite,
  type UserInviteRelations,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AdminGrantWalletModal,
  formatAdminWalletRub,
} from "@/components/admin/AdminGrantWalletModal";

const workspaceRoleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Админ",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

const loginProviders = [
  { id: "vk" as const, label: "ВКонтакте" },
  { id: "max" as const, label: "MAX" },
];

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
  const [approvalFilter, setApprovalFilter] = useState<"all" | "pending">("all");
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [pageOffset, setPageOffset] = useState(0);
  const [sort, setSort] = useState<AdminUsersSort>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selectedPending, setSelectedPending] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);

  function handleWalletGranted(userId: string, walletBalanceCents: number) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, wallet_balance_cents: walletBalanceCents } : u,
      ),
    );
    setSelected((prev) =>
      prev?.id === userId
        ? { ...prev, wallet_balance_cents: walletBalanceCents }
        : prev,
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query: AdminUsersQuery = {};
    if (q.trim()) query.q = q.trim();
    if (accountFilter === "active") query.is_blocked = false;
    if (accountFilter === "blocked") query.is_blocked = true;
    if (roleFilter === "admin") query.is_platform_admin = true;
    if (roleFilter === "user") query.is_platform_admin = false;
    if (approvalFilter === "pending") query.pending_approval = true;
    query.limit = pageSize;
    query.offset = pageOffset;
    query.sort = sort;
    query.order = order;

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
  }, [q, accountFilter, roleFilter, approvalFilter, pageSize, pageOffset, sort, order]);

  function changeSort(nextSort: AdminUsersSort) {
    setPageOffset(0);
    if (sort === nextSort) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(nextSort);
    setOrder("asc");
  }

  function sortIndicator(column: AdminUsersSort) {
    if (sort !== column) return null;
    return <span className="ml-1 text-blue-600">{order === "asc" ? "↑" : "↓"}</span>;
  }

  function SortHeader({ column, children }: { column: AdminUsersSort; children: React.ReactNode }) {
    return (
      <th className="px-4 py-3">
        <button
          type="button"
          onClick={() => changeSort(column)}
          className="whitespace-nowrap text-left hover:text-blue-600"
          title="Изменить порядок сортировки"
        >
          {children}{sortIndicator(column)}
        </button>
      </th>
    );
  }

  async function approveSelected() {
    if (selectedPending.length === 0) return;
    if (!window.confirm(`Открыть доступ пользователям: ${selectedPending.length}?`)) return;
    setApproving(true);
    try {
      await Promise.all(selectedPending.map((id) => approveAdminUser(id)));
      setSelectedPending([]);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось запустить пользователей");
    } finally { setApproving(false); }
  }

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
          Заявки
          <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value as typeof approvalFilter)} className="mt-1 block w-40 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">Все</option>
            <option value="pending">Ожидают запуска</option>
          </select>
        </label>
        {selectedPending.length > 0 && <button type="button" disabled={approving} onClick={() => void approveSelected()} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{approving ? "Запуск…" : `Запустить выбранных (${selectedPending.length})`}</button>}
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
        <label className="text-xs font-medium text-slate-500">
          На странице
          <select
            value={pageSize}
            onChange={(e) => {
              const value = e.target.value === "all" ? "all" : Number(e.target.value);
              setPageSize(value);
              setPageOffset(0);
            }}
            className="mt-1 block w-32 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            {[10, 25, 50, 100, 250, 500].map((value) => <option key={value} value={value}>{value}</option>)}
            <option value="all">Все</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <SortHeader column="name">Пользователь</SortHeader>
                <th className="px-4 py-3">ID</th>
                <SortHeader column="status">Статус аккаунта</SortHeader>
                <SortHeader column="role">Роль</SortHeader>
                <th className="px-4 py-3">Тариф</th>
                <SortHeader column="wallet_balance_cents">Кошелёк</SortHeader>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Роль WS</th>
                <th className="px-4 py-3">Язык</th>
                <th className="px-4 py-3">Таймзона</th>
                <SortHeader column="created_at">Зарегистрирован</SortHeader>
                <SortHeader column="updated_at">Обновлён</SortHeader>
                <th className="px-4 py-3">Файлы</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      {u.pending_approval && <input type="checkbox" checked={selectedPending.includes(u.id)} onChange={(e) => setSelectedPending((prev) => e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id))} className="mr-2 rounded border-slate-300" />}
                      <div className="font-medium text-slate-900">
                        {u.name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-slate-500">
                      {u.id}
                    </td>
                    <td className="px-4 py-3">
                      {u.pending_approval ? (
                        <Badge tone="blue">Ожидает одобрения</Badge>
                      ) : u.is_blocked ? (
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
                    <td className="px-4 py-3">
                      {u.plan ? (
                        <span className="font-medium text-slate-800">
                          {u.plan.name}
                          {u.plan.is_free ? (
                            <span className="ml-1 text-xs text-emerald-600">
                              free
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatAdminWalletRub(u.wallet_balance_cents ?? 0)}
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
                      <Link
                        href={`/admin/files?uploaded_by=${u.id}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Все файлы
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setGrantUser(u)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Начислить
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelected(u)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Открыть
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && pageSize !== "all" && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{pageOffset + 1}–{Math.min(pageOffset + pageSize, total)} из {total}</span>
          <div className="flex gap-2">
            <button type="button" disabled={pageOffset === 0} onClick={() => setPageOffset((value) => Math.max(0, value - pageSize))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50">Назад</button>
            <button type="button" disabled={pageOffset + pageSize >= total} onClick={() => setPageOffset((value) => value + pageSize)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50">Вперёд</button>
          </div>
        </div>
      )}

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onGrant={() => setGrantUser(selected)}
          onPlanChanged={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u)),
            );
            setSelected(updated);
          }}
          onUserChanged={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u)),
            );
            setSelected(updated);
          }}
          onUserDeleted={(userId) => {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            setSelected(null);
          }}
        />
      )}

      {grantUser && (
        <AdminGrantWalletModal
          user={grantUser}
          open
          onClose={() => setGrantUser(null)}
          onGranted={handleWalletGranted}
        />
      )}
    </div>
  );
}

function UserDrawer({
  user,
  onClose,
  onGrant,
  onPlanChanged,
  onUserChanged,
  onUserDeleted,
}: {
  user: AdminUser;
  onClose: () => void;
  onGrant: () => void;
  onPlanChanged: (user: AdminUser) => void;
  onUserChanged: (user: AdminUser) => void;
  onUserDeleted: (userId: string) => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState(user.plan?.id ?? "");
  const [workspaceId, setWorkspaceId] = useState(user.workspace?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [userInvites, setUserInvites] = useState<UserInvite[]>([]);
  const [inviteRelations, setInviteRelations] =
    useState<UserInviteRelations | null>(null);
  const [loginIdentities, setLoginIdentities] = useState<LoginIdentity[]>([]);
  const [inviteCount, setInviteCount] = useState(3);
  const [addingInvites, setAddingInvites] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [loginIdentitiesLoading, setLoginIdentitiesLoading] = useState(true);
  const [userWorkspaces, setUserWorkspaces] = useState<AdminUserWorkspaceItem[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  useEffect(() => {
    setPlanId(user.plan?.id ?? "");
    setWorkspaceId(user.workspace?.id ?? "");
  }, [user.id, user.plan?.id, user.workspace?.id]);

  useEffect(() => {
    void fetchAdminPlans()
      .then((data) => setPlans(data.plans.filter((p) => p.is_active || p.id === user.plan?.id)))
      .catch(() => setPlans([]));
  }, [user.plan?.id]);

  useEffect(() => {
    setInvitesLoading(true);
    setLoginIdentitiesLoading(true);
    setWorkspacesLoading(true);
    Promise.all([
      fetchAdminUserInvites(user.id),
      fetchAdminUserInviteRelations(user.id),
      fetchAdminUserLoginIdentities(user.id),
      fetchAdminUserWorkspaces(user.id),
    ])
      .then(([invitesData, relationsData, identitiesData, workspacesData]) => {
        setUserInvites(invitesData.invites ?? []);
        setInviteRelations(relationsData);
        setLoginIdentities(identitiesData.identities ?? []);
        setUserWorkspaces(workspacesData.workspaces ?? []);
      })
      .catch(() => {
        setUserInvites([]);
        setInviteRelations(null);
        setLoginIdentities([]);
        setUserWorkspaces([]);
      })
      .finally(() => {
        setInvitesLoading(false);
        setLoginIdentitiesLoading(false);
        setWorkspacesLoading(false);
      });
  }, [user.id]);

  function identityFor(provider: "vk" | "max") {
    return loginIdentities.find((item) => item.provider === provider);
  }

  async function handleAssignPlan() {
    if (!planId) return;
    setSaving(true);
    setPlanError(null);
    try {
      const res = await assignAdminUserPlan(user.id, planId, workspaceId);
      setUserWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === res.workspace.id
            ? {
                ...ws,
                plan: {
                  id: res.plan.id,
                  slug: res.plan.slug,
                  name: res.plan.name,
                  is_free: res.plan.is_free,
                },
              }
            : ws,
        ),
      );
      if (workspaceId === user.workspace?.id) {
        onPlanChanged({
          ...user,
          plan: {
            id: res.plan.id,
            slug: res.plan.slug,
            name: res.plan.name,
            is_free: res.plan.is_free,
          },
        });
      }
    } catch (e) {
      setPlanError(e instanceof ApiError ? e.message : "Не удалось назначить тариф");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddInvites() {
    if (inviteCount < 1) return;
    setAddingInvites(true);
    try {
      const data = await addAdminUserInvites(user.id, inviteCount);
      setUserInvites(data.invites ?? []);
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : "Не удалось добавить инвайты",
      );
    } finally {
      setAddingInvites(false);
    }
  }

  async function handleToggleBlock() {
    const nextBlocked = !user.is_blocked;
    const label = nextBlocked ? "заблокировать" : "разблокировать";
    if (!window.confirm(`${nextBlocked ? "Заблокировать" : "Разблокировать"} ${user.email}?`)) {
      return;
    }
    setBlocking(true);
    setActionError(null);
    try {
      const res = await setAdminUserBlocked(user.id, nextBlocked);
      onUserChanged({
        ...user,
        is_blocked: res.user.is_blocked,
      });
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : `Не удалось ${label} пользователя`,
      );
    } finally {
      setBlocking(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Удалить пользователя ${user.email}? Действие необратимо: аккаунт, workspace и связанные данные будут удалены.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await deleteAdminUser(user.id);
      onUserDeleted(user.id);
    } catch (e) {
      setActionError(
        e instanceof ApiError ? e.message : "Не удалось удалить пользователя",
      );
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
            <h3 className="text-sm font-semibold text-slate-900">Кошелёк</h3>
            <p className="mt-1 text-xs text-slate-500">
              Баланс для overage AI после исчерпания квоты тарифа. Можно
              начислить себе или любому пользователю.
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {formatAdminWalletRub(user.wallet_balance_cents ?? 0)}
            </p>
            <button
              type="button"
              onClick={onGrant}
              className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Начислить на кошелёк
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Workspace ({userWorkspaces.length})
            </h3>
            {workspacesLoading ? (
              <p className="mt-2 text-sm text-slate-500">Загрузка…</p>
            ) : userWorkspaces.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Нет workspace</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {userWorkspaces.map((ws) => (
                  <li
                    key={ws.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{ws.name}</p>
                        <p className="text-xs text-slate-500">{ws.slug}</p>
                        {!ws.is_owner && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            Владелец: {ws.owner_name || ws.owner_email}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Участников: {ws.members_count}
                          {ws.plan ? ` · ${ws.plan.name}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={ws.is_owner ? "blue" : "slate"}>
                          {workspaceRoleLabels[ws.role] ?? ws.role}
                        </Badge>
                        {ws.is_owner && (
                          <span className="text-[10px] text-slate-500">владелец</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Вход через соцсети
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Привязанные аккаунты для OAuth-входа (VK ID, MAX).
            </p>
            {loginIdentitiesLoading ? (
              <p className="mt-2 text-sm text-slate-500">Загрузка…</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {loginProviders.map((provider) => {
                  const linked = identityFor(provider.id);
                  return (
                    <li
                      key={provider.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {provider.label}
                          </p>
                          {linked ? (
                            <>
                              <p className="mt-0.5 text-sm text-slate-700">
                                {linked.display_name || "—"}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                ID: {linked.provider_user_id}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                Привязан: {formatDateTime(linked.created_at)}
                              </p>
                            </>
                          ) : (
                            <p className="mt-0.5 text-sm text-slate-500">
                              Не привязан
                            </p>
                          )}
                        </div>
                        {linked ? (
                          <Badge tone="green">Привязан</Badge>
                        ) : (
                          <Badge tone="slate">—</Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loginIdentitiesLoading && loginIdentities.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Пользователь входит только по email и паролю.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Инвайты</h3>
            {invitesLoading ? (
              <p className="mt-2 text-sm text-slate-500">Загрузка…</p>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Пригласил пользователя
                  </p>
                  {inviteRelations?.invited_by ? (
                    <div className="mt-1 text-sm">
                      {inviteRelations.invited_by.user ? (
                        <p className="font-medium text-slate-800">
                          {inviteRelations.invited_by.user.email}
                        </p>
                      ) : (
                        <p className="text-slate-600">Системный инвайт</p>
                      )}
                      <p className="font-mono text-xs text-slate-400">
                        {inviteRelations.invited_by.invite_code}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">—</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Пригласил ({inviteRelations?.invited_users.length ?? 0})
                  </p>
                  {inviteRelations?.invited_users.length ? (
                    <ul className="mt-2 max-h-32 space-y-2 overflow-y-auto text-sm">
                      {inviteRelations.invited_users.slice(0, 8).map((u) => (
                        <li key={u.id} className="rounded-md bg-slate-50 px-2 py-1.5">
                          <p className="font-medium text-slate-800">{u.email}</p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {u.invite_code}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">Никого</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Ключи пользователя ({userInvites.length})
                  </p>
                  {userInvites.length > 0 ? (
                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-mono text-xs text-slate-600">
                      {userInvites.slice(0, 6).map((inv) => (
                        <li key={inv.id}>
                          {inv.code}{" "}
                          <span className="text-slate-400">({inv.status})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">Нет ключей</p>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  <label className="flex-1 text-xs font-medium text-slate-500">
                    Добавить инвайтов
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={inviteCount}
                      onChange={(e) =>
                        setInviteCount(Number(e.target.value) || 1)
                      }
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={addingInvites}
                    onClick={() => void handleAddInvites()}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    {addingInvites ? "…" : "Добавить"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Тариф</h3>
            <p className="mt-1 text-xs text-slate-500">
              Тариф назначается на выбранный workspace. Активная подписка этого
              workspace будет отменена.
            </p>
            <label className="mt-3 block text-xs font-medium text-slate-500">
              Workspace
              <select
                value={workspaceId}
                onChange={(e) => {
                  const nextWorkspaceId = e.target.value;
                  setWorkspaceId(nextWorkspaceId);
                  const selectedWorkspace = userWorkspaces.find(
                    (ws) => ws.id === nextWorkspaceId,
                  );
                  setPlanId(selectedWorkspace?.plan?.id ?? "");
                }}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Выберите workspace</option>
                {userWorkspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} {ws.is_owner ? "(владелец)" : "(участник)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-medium text-slate-500">
              Текущий / новый тариф
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Выберите тариф</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.is_free ? " (free)" : ""}
                    {!p.is_active ? " [выкл]" : ""}
                  </option>
                ))}
              </select>
            </label>
            {planError && (
              <p className="mt-2 text-sm text-rose-600">{planError}</p>
            )}
            <button
              type="button"
              disabled={!workspaceId || !planId || saving}
              onClick={() => void handleAssignPlan()}
              className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Назначить тариф"}
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Управление аккаунтом
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Блокировка временно запрещает вход. Удаление необратимо.
            </p>
            {actionError && (
              <p className="mt-2 text-sm text-rose-600">{actionError}</p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={blocking || deleting}
                onClick={() => void handleToggleBlock()}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50",
                  user.is_blocked
                    ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    : "border-amber-200 text-amber-800 hover:bg-amber-50",
                )}
              >
                {blocking
                  ? "…"
                  : user.is_blocked
                    ? "Разблокировать"
                    : "Заблокировать"}
              </button>
              <button
                type="button"
                disabled={blocking || deleting || user.is_platform_admin}
                onClick={() => void handleDelete()}
                className="w-full rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                {deleting ? "Удаление…" : "Удалить пользователя"}
              </button>
              {user.is_platform_admin && (
                <p className="text-xs text-slate-500">
                  Platform admin нельзя удалить через админку.
                </p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
