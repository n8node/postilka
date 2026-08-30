"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, ChevronRight } from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  type AppNotification,
  type NotificationListResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "только что";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч назад`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} дн назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    fetchNotifications({ limit: 1 })
      .then((d) => setUnreadCount(d.unread_count ?? 0))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = window.setInterval(refreshCount, 10_000);
    const onRefresh = () => refreshCount();
    window.addEventListener("notifications:refresh", onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications:refresh", onRefresh);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchNotifications({ limit: 8 })
      .then((d) => {
        setData(d);
        setUnreadCount(d.unread_count ?? 0);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleItemClick(item: AppNotification) {
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
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
        /* keep open list usable */
      }
    }
    setOpen(false);
  }

  const items = data?.items ?? [];

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-muted transition-colors hover:bg-zinc-100 hover:text-text"
        aria-label="Уведомления"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[60] mt-2 flex max-h-[min(24rem,70vh)] w-80 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Уведомления</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-0.5 text-xs text-accent hover:underline"
            >
              Все
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-muted">Загрузка…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">Нет уведомлений</p>
            ) : (
              <div className="py-1">
                {items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href || "/notifications"}
                    onClick={() => void handleItemClick(n)}
                    className={cn(
                      "block px-3 py-2 transition-colors hover:bg-zinc-50",
                      !n.read_at && "bg-zinc-50",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && (
                        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {n.body ? (
                          <p className="line-clamp-2 text-xs text-muted">{n.body}</p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] text-muted">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
