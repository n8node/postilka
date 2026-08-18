"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  deleteAllNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationListResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  post_published: "Публикации",
  post_failed: "Публикации",
  post_partial: "Публикации",
  post_quota_blocked: "Публикации",
  channel_reconnect: "Каналы",
  youtube_reconnect: "Каналы",
  plan_paid: "Тариф",
  wallet_topup: "Кошелёк",
  wallet_admin_grant: "Кошелёк",
  plan_expiry_7d: "Тариф",
  plan_expiry_3d: "Тариф",
  plan_past_due: "Тариф",
  plan_renewed: "Тариф",
  plan_downgraded: "Тариф",
  wallet_low: "Кошелёк",
  quota_posts_80: "Лимиты",
  quota_ai_text_80: "Лимиты",
  quota_ai_media_80: "Лимиты",
  quota_storage_90: "Лимиты",
  quota_channels_80: "Лимиты",
  ai_image_done: "ИИ",
  ai_video_done: "ИИ",
  ai_image_failed: "ИИ",
  ai_video_failed: "ИИ",
  trash_expiring: "Файлы",
  trash_purged: "Файлы",
  invite_accepted: "Команда",
  approval_submitted: "Согласование",
  approval_approved: "Согласование",
  approval_rejected: "Согласование",
  approval_comment: "Согласование",
  support_ticket: "Поддержка",
};

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "posts", label: "Публикации" },
  { value: "channels", label: "Каналы" },
  { value: "billing", label: "Тариф и кошелёк" },
  { value: "quota", label: "Лимиты" },
  { value: "ai", label: "ИИ" },
  { value: "files", label: "Файлы" },
  { value: "team", label: "Команда" },
] as const;

const FILTER_TYPES: Record<string, string[]> = {
  posts: ["post_published", "post_failed", "post_partial", "post_quota_blocked"],
  channels: ["channel_reconnect", "youtube_reconnect"],
  billing: [
    "plan_paid",
    "wallet_topup",
    "wallet_admin_grant",
    "plan_expiry_7d",
    "plan_expiry_3d",
    "plan_past_due",
    "plan_renewed",
    "plan_downgraded",
    "wallet_low",
  ],
  quota: [
    "quota_posts_80",
    "quota_ai_text_80",
    "quota_ai_media_80",
    "quota_storage_90",
    "quota_channels_80",
  ],
  ai: ["ai_image_done", "ai_video_done", "ai_image_failed", "ai_video_failed"],
  files: ["trash_expiring", "trash_purged"],
  team: [
    "invite_accepted",
    "approval_submitted",
    "approval_approved",
    "approval_rejected",
    "approval_comment",
  ],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [clearing, setClearing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchNotifications({ limit: 100 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClearAll() {
    if (!window.confirm("Удалить все уведомления?")) return;
    setClearing(true);
    try {
      await deleteAllNotifications();
      load();
      window.dispatchEvent(new CustomEvent("notifications:refresh"));
    } finally {
      setClearing(false);
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      load();
      window.dispatchEvent(new CustomEvent("notifications:refresh"));
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpen(item: AppNotification) {
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id);
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((n) =>
                  n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n,
                ),
                unread_count: Math.max(0, prev.unread_count - 1),
              }
            : prev,
        );
        window.dispatchEvent(new CustomEvent("notifications:refresh"));
      } catch {
        /* ignore */
      }
    }
  }

  const allItems = data?.items ?? [];
  const allowed = filter === "all" ? null : FILTER_TYPES[filter];
  const items = allowed ? allItems.filter((n) => allowed.includes(n.type)) : allItems;
  const unreadCount = data?.unread_count ?? 0;

  return (
    <div>
      <PageHeader
        title="Уведомления"
        description={unreadCount > 0 ? `${unreadCount} непрочитанных` : "Все прочитаны"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void handleMarkAll()}
                className="h-9 rounded-md border border-border px-3 text-sm hover:bg-zinc-50 disabled:opacity-60"
              >
                {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : "Прочитать все"}
              </button>
            )}
            <button
              type="button"
              disabled={clearing || allItems.length === 0}
              onClick={() => void handleClearAll()}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              {clearing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Очистить
                </>
              )}
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Нет уведомлений"
          description="Здесь появятся события по публикациям, каналам, тарифу и генерации."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href || "/notifications"}
                onClick={() => void handleOpen(n)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50",
                  !n.read_at && "bg-zinc-50/80",
                )}
              >
                <div className="mt-0.5">
                  {n.read_at ? (
                    <Bell className="h-4 w-4 text-muted" />
                  ) : (
                    <BellRing className="h-4 w-4 shrink-0 text-accent" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-muted">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                  </div>
                  {n.body ? <p className="mt-0.5 text-sm text-muted">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-muted">{formatDate(n.created_at)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
