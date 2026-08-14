"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Copy,
  ImageIcon,
  Loader2,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import { ApiError, fetchChannels, type ChannelListItem } from "@/lib/api";
import { channelDisplayName } from "@/lib/channelPresentation";
import {
  cancelPost,
  createPost,
  deletePost,
  fetchPosts,
  publishPost,
  type Post,
} from "@/lib/posts-api";
import {
  canCancelPost,
  canDeletePost,
  canEditPost,
  canRetryPost,
  postDisplayDate,
  postFormatLabel,
  postPreviewText,
  postToSaveInput,
  POST_STATUS_CLASS,
  POST_STATUS_LABEL,
} from "@/lib/posts-display";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type StatusFilter = Post["status"] | "";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "", label: "Все" },
  { id: "draft", label: "Черновики" },
  { id: "pending_approval", label: "На согласовании" },
  { id: "scheduled", label: "Запланированные" },
  { id: "published", label: "Опубликованные" },
  { id: "failed", label: "Ошибки" },
  { id: "canceled", label: "Отменённые" },
];

function StatusBadge({ status }: { status: Post["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        POST_STATUS_CLASS[status],
      )}
    >
      {POST_STATUS_LABEL[status]}
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionButton({
  label,
  disabled,
  title,
  onClick,
  children,
  variant = "default",
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-border bg-white text-zinc-700 hover:bg-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

export function PostsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Post[]>([]);
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [channelFilter, setChannelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const channelMap = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postData = await fetchPosts({
        limit: PAGE_SIZE,
        offset,
        status: statusFilter,
        channel_id: channelFilter || undefined,
        q: search || undefined,
      });
      setItems(postData.items);
      setTotal(postData.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить публикации");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, channelFilter, search]);

  useEffect(() => {
    void fetchChannels()
      .then((data) => setChannels(data.items))
      .catch(() => setChannels([]));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, channelFilter, search]);

  async function handleDelete(post: Post) {
    if (!canDeletePost(post.status)) return;
    if (!window.confirm("Удалить запись без возможности восстановления?")) return;
    setActionId(post.id);
    setError(null);
    try {
      await deletePost(post.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить публикацию");
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(post: Post) {
    if (!canCancelPost(post.status)) return;
    if (!window.confirm("Отменить публикацию? Запланированная отправка не произойдёт.")) return;
    setActionId(post.id);
    setError(null);
    try {
      await cancelPost(post.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отменить публикацию");
    } finally {
      setActionId(null);
    }
  }

  async function handleDuplicate(post: Post) {
    setActionId(post.id);
    setError(null);
    try {
      const created = await createPost(postToSaveInput(post));
      router.push(`/posts/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось дублировать публикацию");
      setActionId(null);
    }
  }

  async function handleRetry(post: Post) {
    if (!canRetryPost(post.status)) return;
    setActionId(post.id);
    setError(null);
    try {
      await publishPost(post.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось повторить публикацию");
    } finally {
      setActionId(null);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Публикации"
        description="Все черновики, запланированные и опубликованные записи workspace."
        actions={
          <Link
            href="/posts/new"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Новый пост
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id || "all"}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === tab.id
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white text-zinc-700 hover:bg-zinc-50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setSearch(searchInput.trim());
              }}
              placeholder="Поиск по тексту или заголовку…"
              className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearch(searchInput.trim())}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Найти
          </button>
          <select
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Все каналы</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channelDisplayName(channel)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаем публикации…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Публикаций пока нет"
          description={
            search || statusFilter || channelFilter
              ? "По выбранным фильтрам ничего не найдено. Измените условия или создайте новую публикацию."
              : "Создайте первый пост или сохраните черновик в композере."
          }
          action={
            <Link
              href="/posts/new"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              Новый пост
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-50 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Публикация</th>
                  <th className="px-4 py-3 font-medium">Каналы</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((post) => {
                  const busy = actionId === post.id;
                  const date = postDisplayDate(post);
                  const failedTargets = post.targets.filter((target) => target.status === "failed");
                  return (
                    <tr key={post.id} className="align-top hover:bg-zinc-50/70">
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <div className="flex items-start gap-2">
                          {post.media.length > 0 && (
                            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">{postPreviewText(post)}</p>
                            <p className="mt-0.5 text-xs text-muted">
                              {postFormatLabel(post.content.format)}
                              {post.media.length > 0 ? ` · ${post.media.length} медиа` : ""}
                            </p>
                            {post.last_error && (
                              <p className="mt-1 line-clamp-2 text-xs text-red-600">{post.last_error}</p>
                            )}
                            {failedTargets.length > 0 && post.status !== "failed" && (
                              <p className="mt-1 text-xs text-amber-700">
                                Ошибка в {failedTargets.length} из {post.targets.length} каналов
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {post.targets.slice(0, 4).map((target) => {
                            const channel = channelMap.get(target.channel_id);
                            if (!channel) {
                              return (
                                <span
                                  key={target.id}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600"
                                  title="Канал"
                                >
                                  ?
                                </span>
                              );
                            }
                            return (
                              <span key={target.id} title={channelDisplayName(channel)}>
                                <ChannelAvatar
                                  name={channel.name}
                                  metadata={channel.metadata}
                                  channelId={channel.id}
                                  provider={channel.provider}
                                  chatType={channel.chat_type}
                                  size="sm"
                                />
                              </span>
                            );
                          })}
                          {post.targets.length > 4 && (
                            <span className="text-xs text-muted">+{post.targets.length - 4}</span>
                          )}
                          {post.targets.length === 0 && (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                        <span className="block text-[11px] uppercase tracking-wide">{date.label}</span>
                        <span className="text-text">{formatDateTime(date.value)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <ActionButton
                            label={canEditPost(post.status) ? "Открыть" : "Просмотр"}
                            disabled={busy}
                            onClick={() => router.push(`/posts/${post.id}`)}
                          >
                            <PenSquare className="h-3.5 w-3.5" />
                          </ActionButton>
                          <ActionButton
                            label="Дублировать"
                            disabled={busy}
                            onClick={() => void handleDuplicate(post)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </ActionButton>
                          {canRetryPost(post.status) && (
                            <ActionButton
                              label="Повторить публикацию"
                              disabled={busy}
                              onClick={() => void handleRetry(post)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </ActionButton>
                          )}
                          {canCancelPost(post.status) && post.status !== "draft" && (
                            <ActionButton
                              label="Отменить"
                              disabled={busy}
                              onClick={() => void handleCancel(post)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </ActionButton>
                          )}
                          <ActionButton
                            label="Удалить"
                            disabled={busy || !canDeletePost(post.status)}
                            title={
                              canDeletePost(post.status)
                                ? "Удалить запись"
                                : "Удалить можно только черновик, отменённую или неудачную публикацию. Опубликованные записи остаются в истории."
                            }
                            variant="danger"
                            onClick={() => void handleDelete(post)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <span className="text-muted">
              {total} {total === 1 ? "запись" : total >= 2 && total <= 4 ? "записи" : "записей"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset <= 0}
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Назад
              </button>
              <span className="text-xs text-muted">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Далее
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
