"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { adminFilePreviewURL, type AdminPostDetail } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  scheduled: "Запланирован",
  publishing: "Публикуется",
  published: "Опубликован",
  failed: "Ошибка",
  canceled: "Отменён",
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

type AdminPostDetailPanelProps = {
  post: AdminPostDetail | null;
  loading: boolean;
  onClose: () => void;
};

export function AdminPostDetailPanel({
  post,
  loading,
  onClose,
}: AdminPostDetailPanelProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-slate-200 bg-white lg:w-[420px]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Карточка поста</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
        {!loading && !post && (
          <p className="text-sm text-slate-500">Выберите пост в списке</p>
        )}
        {!loading && post && (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {post.preview_text || "—"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-slate-400">{post.id}</p>

            <div className="mt-4 space-y-0">
              <Row label="Статус" value={statusLabels[post.status] ?? post.status} />
              <Row
                label="Источник"
                value={post.origin === "agent" ? "Агент" : "Пользователь"}
              />
              <Row label="Workspace" value={post.workspace_name} />
              <Row
                label="Автор"
                value={
                  post.author_user_id ? (
                    <Link
                      href={`/admin/posts?created_by=${post.author_user_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {post.author_name || post.author_email}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              {post.mission_title ? (
                <Row label="Задача агента" value={post.mission_title} />
              ) : null}
              <Row label="Создан" value={formatDateTime(post.created_at)} />
              <Row label="Публикация" value={formatDateTime(post.published_at)} />
              <Row label="Запланирован" value={formatDateTime(post.due_at)} />
              {post.last_error ? (
                <Row
                  label="Ошибка"
                  value={<span className="text-rose-600">{post.last_error}</span>}
                />
              ) : null}
            </div>

            {post.has_metrics && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Метрики (сумма)
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Просмотры</p>
                    <p className="font-semibold">{formatNumber(post.views)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Охват</p>
                    <p className="font-semibold">{formatNumber(post.reach)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Клики</p>
                    <p className="font-semibold">{formatNumber(post.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Уник. клики</p>
                    <p className="font-semibold">{formatNumber(post.clicks_unique)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Лайки</p>
                    <p className="font-semibold">{formatNumber(post.likes)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Комментарии</p>
                    <p className="font-semibold">{formatNumber(post.comments)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Metrika визиты</p>
                    <p className="font-semibold">{formatNumber(post.metrika_visits)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Metrika цели</p>
                    <p className="font-semibold">{formatNumber(post.metrika_goals)}</p>
                  </div>
                </div>
              </div>
            )}

            {post.targets.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Каналы ({post.targets.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {post.targets.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-slate-900">
                        {t.channel_name}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          ({t.provider_label})
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {statusLabels[t.status] ?? t.status}
                        {t.published_at ? ` · ${formatDateTime(t.published_at)}` : ""}
                      </p>
                      {t.last_error ? (
                        <p className="mt-1 text-xs text-rose-600">{t.last_error}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {post.media.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Медиа ({post.media.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {post.media.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2"
                    >
                      {m.mime_type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={adminFilePreviewURL(m.file_id)}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500">
                          {m.mime_type.startsWith("video/") ? "VID" : "FILE"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/files?q=${encodeURIComponent(m.name)}`}
                          className="block truncate font-medium text-blue-600 hover:underline"
                        >
                          {m.name}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {formatBytes(m.size)} · {m.mime_type}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {post.metrics.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Метрики по каналам
                </p>
                <ul className="mt-2 space-y-2">
                  {post.metrics.map((m) => (
                    <li
                      key={m.target_id}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
                    >
                      <p className="font-medium text-slate-900">
                        {m.channel_name} ({m.provider_label})
                      </p>
                      <p>
                        {formatNumber(m.views)} просм. · {formatNumber(m.clicks)} кликов ·{" "}
                        {formatNumber(m.likes + m.comments + m.shares)} eng.
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
