"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  fetchAdminPost,
  fetchAdminPosts,
  fetchAdminWorkspaces,
  type AdminPost,
  type AdminPostDetail,
  type AdminPostStats,
  type AdminPostsQuery,
  type AdminWorkspaceListItem,
} from "@/lib/api";
import { AdminPostDetailPanel } from "@/components/admin/AdminPostDetailPanel";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  scheduled: "Запланирован",
  publishing: "Публикуется",
  published: "Опубликован",
  failed: "Ошибка",
  canceled: "Отменён",
};

const statusTones: Record<string, "slate" | "blue" | "amber" | "green" | "red" | "violet"> = {
  draft: "slate",
  pending_approval: "violet",
  scheduled: "blue",
  publishing: "amber",
  published: "green",
  failed: "red",
  canceled: "slate",
};

const originLabels: Record<string, string> = {
  user: "Пользователь",
  agent: "Агент",
};

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

function formatNumber(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "red" | "blue" | "slate" | "amber" | "violet";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    red: "bg-rose-50 text-rose-700 ring-rose-600/15",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
    slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
    violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function AdminPostsPage() {
  const searchParams = useSearchParams();
  const initialAuthor = searchParams.get("created_by") ?? "";

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [stats, setStats] = useState<AdminPostStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [originFilter, setOriginFilter] = useState("");
  const [createdBy, setCreatedBy] = useState(initialAuthor);
  const [providerFilter, setProviderFilter] = useState("");
  const [metricsFilter, setMetricsFilter] = useState<"" | "yes" | "no">("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [publishedFrom, setPublishedFrom] = useState("");
  const [publishedTo, setPublishedTo] = useState("");

  const [workspaces, setWorkspaces] = useState<AdminWorkspaceListItem[]>([]);
  const [authorLabel, setAuthorLabel] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<AdminPostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void fetchAdminWorkspaces({ limit: 200 })
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    setCreatedBy(initialAuthor);
  }, [initialAuthor]);

  const query = useMemo((): AdminPostsQuery => {
    const out: AdminPostsQuery = { limit: 100 };
    if (q.trim()) out.q = q.trim();
    if (workspaceId) out.workspace_id = workspaceId;
    if (statusFilter) out.status = statusFilter;
    if (originFilter) out.origin = originFilter;
    if (createdBy) out.created_by = createdBy;
    if (providerFilter) out.provider = providerFilter;
    if (createdFrom) out.created_from = createdFrom;
    if (createdTo) out.created_to = createdTo;
    if (publishedFrom) out.published_from = publishedFrom;
    if (publishedTo) out.published_to = publishedTo;
    if (metricsFilter === "yes") out.has_metrics = true;
    if (metricsFilter === "no") out.has_metrics = false;
    return out;
  }, [
    q,
    workspaceId,
    statusFilter,
    originFilter,
    createdBy,
    providerFilter,
    createdFrom,
    createdTo,
    publishedFrom,
    publishedTo,
    metricsFilter,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPosts(query);
      setPosts(data.posts);
      setStats(data.stats);
      setTotal(data.total);
      if (query.created_by) {
        const p = data.posts.find((item) => item.author_user_id === query.created_by);
        setAuthorLabel(
          p
            ? p.author_name || p.author_email || query.created_by
            : query.created_by,
        );
      } else {
        setAuthorLabel(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить посты");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!selectedPostId) {
      setPostDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchAdminPost(selectedPostId)
      .then((res) => {
        if (!cancelled) setPostDetail(res.post);
      })
      .catch(() => {
        if (!cancelled) setPostDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPostId]);

  function clearAuthorFilter() {
    setCreatedBy("");
    setAuthorLabel(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("created_by");
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Посты</h1>
            <p className="mt-1 text-sm text-slate-500">
              Все публикации платформы · найдено: {total}
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

        {createdBy && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <span>
              Фильтр по автору: <strong>{authorLabel ?? createdBy}</strong>
            </span>
            <button
              type="button"
              onClick={clearAuthorFilter}
              className="rounded-md border border-blue-300 px-2 py-0.5 text-xs hover:bg-blue-100"
            >
              Сбросить
            </button>
          </div>
        )}

        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard label="Всего" value={String(stats.total_posts)} />
            <StatCard label="Опубликовано" value={String(stats.published_count)} />
            <StatCard label="Запланировано" value={String(stats.scheduled_count)} />
            <StatCard label="Черновики" value={String(stats.draft_count)} />
            <StatCard label="С метриками" value={String(stats.with_metrics_count)} />
          </div>
        )}

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-medium text-slate-500 md:col-span-2 xl:col-span-2">
            Поиск
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Текст, email автора, workspace…"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Пространство
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Все</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Статус
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Все</option>
              {Object.entries(statusLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Источник
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Все</option>
              <option value="user">Пользователь</option>
              <option value="agent">Агент</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Канал (провайдер)
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Все</option>
              <option value="telegram">Telegram</option>
              <option value="vk">VK</option>
              <option value="max">MAX</option>
              <option value="ok">OK</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Метрики
            <select
              value={metricsFilter}
              onChange={(e) => setMetricsFilter(e.target.value as typeof metricsFilter)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Все</option>
              <option value="yes">Есть данные</option>
              <option value="no">Без данных</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-500">
            Создан от
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Создан до
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Публикация от
            <input
              type="date"
              value={publishedFrom}
              onChange={(e) => setPublishedFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Публикация до
            <input
              type="date"
              value={publishedTo}
              onChange={(e) => setPublishedTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-xs font-medium text-slate-500 md:col-span-2">
            ID автора
            <input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value.trim())}
              placeholder="UUID пользователя"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-blue-400"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Пост</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Автор</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Каналы</th>
                  <th className="px-4 py-3">Медиа</th>
                  <th className="px-4 py-3">Просмотры</th>
                  <th className="px-4 py-3">Клики</th>
                  <th className="px-4 py-3">Engagement</th>
                  <th className="px-4 py-3">Создан</th>
                  <th className="px-4 py-3">Публикация</th>
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
                {!loading && !error && posts.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                      Посты не найдены
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  posts.map((p) => {
                    const engagement = p.likes + p.comments + p.shares;
                    const tone = statusTones[p.status] ?? "slate";
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "cursor-pointer hover:bg-slate-50/80",
                          selectedPostId === p.id && "bg-blue-50/80",
                        )}
                        onClick={() => setSelectedPostId(p.id)}
                      >
                        <td className="max-w-[240px] px-4 py-3">
                          <p className="line-clamp-2 font-medium text-slate-900">
                            {p.preview_text || "—"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-400">{p.id}</span>
                            <Badge tone={p.origin === "agent" ? "violet" : "slate"}>
                              {originLabels[p.origin] ?? p.origin}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={tone}>{statusLabels[p.status] ?? p.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {p.author_user_id ? (
                            <>
                              <Link
                                href={`/admin/posts?created_by=${p.author_user_id}`}
                                className="font-medium text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {p.author_name || p.author_email || "—"}
                              </Link>
                              <p className="text-xs text-slate-400">{p.author_email}</p>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.workspace_name}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {p.targets_count > 0 ? (
                            <>
                              <span>{p.targets_count}</span>
                              {p.channels_label ? (
                                <p className="text-xs text-slate-400">{p.channels_label}</p>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{p.media_count || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {p.has_metrics ? formatNumber(p.views) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {p.has_metrics ? formatNumber(p.clicks) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {p.has_metrics ? formatNumber(engagement) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDateTime(p.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDateTime(p.published_at)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminPostDetailPanel
        post={postDetail}
        loading={detailLoading}
        onClose={() => {
          setSelectedPostId(null);
          setPostDetail(null);
        }}
      />
    </div>
  );
}
