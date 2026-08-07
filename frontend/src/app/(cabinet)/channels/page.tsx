"use client";

import { ExternalLink, Pencil, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConnectChannelMenu } from "@/components/channels/ConnectChannelMenu";
import { EditChannelDialog } from "@/components/channels/EditChannelDialog";
import {
  ApiError,
  deleteChannel,
  fetchChannels,
  sendChannelTestMessage,
  verifyChannel,
  type ChannelListItem,
  type ChannelProvider,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const statusLabel: Record<ChannelListItem["status"], string> = {
  active: "Активен",
  needs_reconnect: "Нужно переподключить",
  disabled: "Отключён",
};

const statusClass: Record<ChannelListItem["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_reconnect: "bg-amber-50 text-amber-800 border-amber-200",
  disabled: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const providerLabel: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  vk: "VK",
  ok: "OK",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
};

const chatTypeLabel = (type: string) => {
  switch (type) {
    case "channel":
      return "Канал";
    case "group":
    case "supergroup":
      return "Группа";
    case "chat":
      return "Чат";
    default:
      return type || "—";
  }
};

function StatusBadge({ status }: { status: ChannelListItem["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
        statusClass[status],
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: ChannelProvider }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
      {providerLabel[provider]}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export default function ChannelsPage() {
  const [items, setItems] = useState<ChannelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const selected = items.find((c) => c.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChannels();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить каналы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function replaceItem(updated: ChannelListItem) {
    setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleVerify() {
    if (!selected) return;
    setActionLoading(true);
    setTestSuccess(null);
    setError(null);
    try {
      const updated = await verifyChannel(selected.id);
      replaceItem(updated);
      setTestSuccess("Данные канала обновлены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось проверить канал");
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTestMessage() {
    if (!selected) return;
    setActionLoading(true);
    setTestSuccess(null);
    setError(null);
    try {
      const result = await sendChannelTestMessage(selected.id);
      setTestSuccess(result.message);
      await load();
      setSelectedId(selected.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить тестовое сообщение");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Отключить канал «${selected.name}»?`)) return;
    setActionLoading(true);
    try {
      await deleteChannel(selected.id);
      setItems((prev) => prev.filter((c) => c.id !== selected.id));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить канал");
    } finally {
      setActionLoading(false);
    }
  }

  const displayName =
    selected?.metadata?.provider_title && selected.name.startsWith("http")
      ? selected.metadata.provider_title
      : selected?.name;

  return (
    <div>
      <PageHeader
        title="Каналы"
        description="Подключённые каналы и сообщества workspace во всех соцсетях."
        actions={<ConnectChannelMenu onConnected={() => void load()} />}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CabinetPage
        rightTitle={displayName ?? undefined}
        onCloseRight={selected ? () => setSelectedId(null) : undefined}
        right={
          selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <ProviderBadge provider={selected.provider} />
                <StatusBadge status={selected.status} />
                {selected.post_mode_label && (
                  <span className="inline-flex rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                    {selected.post_mode_label}
                  </span>
                )}
                {selected.chat_type && (
                  <span className="inline-flex rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                    {chatTypeLabel(selected.chat_type)}
                  </span>
                )}
              </div>

              {selected.metadata?.public_url && (
                <DetailRow label="Публичная ссылка">
                  <a
                    href={selected.metadata.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                  >
                    {selected.metadata.public_url.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </DetailRow>
              )}

              <DetailRow label="ID канала">
                <span className="font-mono">{selected.chat_id}</span>
              </DetailRow>

              {selected.bot_username && (
                <DetailRow label="Бот">
                  <span className="font-medium">@{selected.bot_username}</span>
                </DetailRow>
              )}

              {selected.bot_token_hint && (
                <DetailRow label="Токен / доступ">
                  <span>{selected.bot_token_hint}</span>
                </DetailRow>
              )}

              {selected.metadata?.can_post != null && (
                <DetailRow label="Публикация">
                  <span>{selected.metadata.can_post ? "Разрешена" : "Запрещена"}</span>
                </DetailRow>
              )}

              {selected.metadata?.is_admin != null && (
                <DetailRow label="Права бота">
                  <span>{selected.metadata.is_admin ? "Администратор" : "Участник"}</span>
                </DetailRow>
              )}

              {selected.metadata?.bot_permissions && selected.metadata.bot_permissions.length > 0 && (
                <DetailRow label="Разрешения">
                  <span className="text-muted">{selected.metadata.bot_permissions.join(", ")}</span>
                </DetailRow>
              )}

              {selected.metadata_refreshed_at && (
                <DetailRow label="Обновлено">
                  <span className="text-muted">
                    {new Date(selected.metadata_refreshed_at).toLocaleString("ru-RU")}
                  </span>
                </DetailRow>
              )}

              {selected.last_error && (
                <DetailRow label="Ошибка">
                  <span className="text-red-600">{selected.last_error}</span>
                </DetailRow>
              )}

              {testSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {testSuccess}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" />
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => void handleVerify()}
                  disabled={actionLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", actionLoading && "animate-spin")} />
                  {actionLoading ? "Проверка…" : "Обновить данные"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleTestMessage()}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading ? "Отправка…" : "Отправить тестовое сообщение"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={actionLoading}
                  className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Отключить канал
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {loading ? (
          <p className="text-sm text-muted">Загрузка каналов…</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="Нет каналов"
            description="Подключите Telegram, VK, OK, MAX, Rutube или Дзен — чтобы публиковать посты."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-zinc-50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Канал</th>
                  <th className="px-4 py-3 font-medium">Сеть</th>
                  <th className="px-4 py-3 font-medium">Режим</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ch) => {
                  const title =
                    ch.metadata?.provider_title && ch.name.startsWith("http")
                      ? ch.metadata.provider_title
                      : ch.name;
                  return (
                    <tr
                      key={ch.id}
                      onClick={() => {
                        setSelectedId(ch.id);
                        setTestSuccess(null);
                      }}
                      className={cn(
                        "cursor-pointer border-b border-border last:border-0 hover:bg-zinc-50",
                        selectedId === ch.id && "bg-zinc-50",
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{title}</p>
                        {ch.metadata?.public_url && (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {ch.metadata.public_url.replace(/^https?:\/\//, "")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ProviderBadge provider={ch.provider} />
                      </td>
                      <td className="px-4 py-3 text-muted">{ch.post_mode_label || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ch.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CabinetPage>

      {selected && (
        <EditChannelDialog
          channel={selected}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            replaceItem(updated);
            setTestSuccess("Изменения сохранены");
          }}
        />
      )}
    </div>
  );
}
