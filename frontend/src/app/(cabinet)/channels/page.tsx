"use client";

import { ExternalLink, Pencil, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConnectChannelMenu } from "@/components/channels/ConnectChannelMenu";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import { EditChannelDialog } from "@/components/channels/EditChannelDialog";
import {
  ApiError,
  deleteChannel,
  fetchChannels,
  sendChannelTestMessage,
  startYouTubeChannelReconnect,
  verifyChannel,
  type ChannelListItem,
  type ChannelProvider,
} from "@/lib/api";
import { channelAvatarCacheKey, channelDisplayName } from "@/lib/channelPresentation";
import {
  normalizeTimezone,
  publishAtPayload,
  timezoneLabel,
} from "@/lib/russia-timezones";
import { useAuth } from "@/context/AuthContext";
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

const providerLabel: Partial<Record<ChannelProvider, string>> = {
  telegram: "Telegram",
  vk: "VK",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
  youtube: "YouTube",
  photochka: "Photochka",
  wordpress: "WordPress",
};

function formatProviderLabel(provider: ChannelProvider, chatType?: string): string {
  if (provider === "telegram" && chatType === "business") return "Telegram Business";
  if (provider === "ok") return "Не поддерживается";
  return providerLabel[provider] ?? provider;
}

const chatTypeLabel = (type: string) => {
  switch (type) {
    case "channel":
      return "Канал";
    case "group":
    case "supergroup":
      return "Группа";
    case "chat":
      return "Чат";
    case "business":
      return "Telegram Business";
    case "site":
      return "Сайт";
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

function ProviderBadge({
  provider,
  chatType,
}: {
  provider: ChannelProvider;
  chatType?: string;
}) {
  return (
    <span className="inline-flex rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
      {formatProviderLabel(provider, chatType)}
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

function formatYouTubeReconnectDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChannelsPage() {
  const { user } = useAuth();
  const userTimezone = normalizeTimezone(user.timezone);
  const [items, setItems] = useState<ChannelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [dzenTestType, setDzenTestType] = useState<"brief" | "article">("brief");
  const [rutubeTestType, setRutubeTestType] = useState<"feed" | "video">("feed");
  const [rutubeVideoURL, setRutubeVideoURL] = useState("");
  const [rutubeVideoTitle, setRutubeVideoTitle] = useState("");
  const [rutubeThumbURL, setRutubeThumbURL] = useState("");
  const [rutubePublishAt, setRutubePublishAt] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const selected = items.find((c) => c.id === selectedId) ?? null;
  const youtubeReconnectBy =
    selected?.provider === "youtube" && selected.oauth_reconnect_by
      ? new Date(selected.oauth_reconnect_by)
      : null;
  const youtubeReconnectAvailable = youtubeReconnectBy
    ? nowTick >= youtubeReconnectBy.getTime()
    : false;

  useEffect(() => {
    if (!youtubeReconnectBy || youtubeReconnectAvailable) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [selectedId, youtubeReconnectBy, youtubeReconnectAvailable]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchChannels();
      setItems(data.items);
      return data.items;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить каналы");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId && !items.some((c) => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const handleChannelConnected = useCallback(
    async (connected?: ChannelListItem[]) => {
      const latest = await load();
      if (connected?.length) {
        const merged = new Map((latest ?? []).map((c) => [c.id, c]));
        for (const ch of connected) merged.set(ch.id, ch);
        setItems(Array.from(merged.values()));
        setSelectedId(connected[connected.length - 1]!.id);
        return;
      }
      setSelectedId(null);
    },
    [load],
  );

  function replaceItem(updated: ChannelListItem) {
    setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleYouTubeReconnect() {
    if (!selected || !youtubeReconnectAvailable) return;
    setActionLoading(true);
    setError(null);
    setTestSuccess(null);
    try {
      const result = await startYouTubeChannelReconnect(selected.id);
      window.location.href = result.redirect_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось начать переподключение");
      setActionLoading(false);
    }
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
      let payload: Parameters<typeof sendChannelTestMessage>[1];
      if (selected.provider === "dzen") {
        payload = { content_type: dzenTestType };
      } else if (selected.provider === "rutube") {
        payload = { content_type: rutubeTestType };
        if (rutubeTestType === "video") {
          if (!rutubeVideoURL.trim()) {
            setError("Укажите ссылку на видео — Rutube скачает файл по URL");
            return;
          }
          payload = {
            ...payload,
            video_url: rutubeVideoURL.trim(),
            title: rutubeVideoTitle.trim() || undefined,
            photo_url: rutubeThumbURL.trim() || undefined,
            publish_at: rutubePublishAt.trim()
              ? publishAtPayload(rutubePublishAt.trim(), userTimezone)
              : undefined,
          };
        }
      }
      const result = await sendChannelTestMessage(selected.id, payload);
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

  const displayName = selected ? channelDisplayName(selected) : undefined;

  return (
    <div>
      <PageHeader
        title="Каналы"
        description="Подключённые каналы и сообщества workspace во всех соцсетях."
        actions={<ConnectChannelMenu onConnected={(connected) => void handleChannelConnected(connected)} />}
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
              <div className="flex items-center gap-3">
                <ChannelAvatar
                  name={selected.name}
                  metadata={selected.metadata}
                  channelId={selected.id}
                  provider={selected.provider}
                  chatType={selected.chat_type}
                  cacheKey={channelAvatarCacheKey(selected)}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{displayName}</p>
                  <p className="text-xs text-muted">
                    {formatProviderLabel(selected.provider, selected.chat_type)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <ProviderBadge provider={selected.provider} chatType={selected.chat_type} />
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

              {selected.provider === "youtube" && selected.oauth_reconnect_by && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <p>
                    {youtubeReconnectAvailable
                      ? "Google OAuth (Testing): пора переподключить канал."
                      : `Google OAuth (Testing): переподключение потребуется ${formatYouTubeReconnectDate(selected.oauth_reconnect_by)}. Кнопка станет активна в этот момент — пришлём письмо на email.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleYouTubeReconnect()}
                    disabled={!youtubeReconnectAvailable || actionLoading}
                    className={cn(
                      "mt-3 inline-flex w-full items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      youtubeReconnectAvailable
                        ? "border-accent bg-accent text-white hover:bg-accent/90"
                        : "border-amber-300 bg-white/70 text-amber-900",
                    )}
                  >
                    Переподключить
                  </button>
                </div>
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

              {selected.publish_capabilities?.formats && selected.publish_capabilities.formats.length > 0 && (
                <DetailRow label="Форматы публикации">
                  <span className="text-muted">
                    {selected.publish_capabilities.formats.join(", ")}
                  </span>
                </DetailRow>
              )}

              {selected.provider === "dzen" && (
                <DetailRow label="Тип тестовой публикации">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDzenTestType("brief")}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs",
                        dzenTestType === "brief"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-zinc-50",
                      )}
                    >
                      Бриф (короткий пост)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDzenTestType("article")}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs",
                        dzenTestType === "article"
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-zinc-50",
                      )}
                    >
                      Статья
                    </button>
                  </div>
                </DetailRow>
              )}

              {selected.provider === "rutube" && (
                <>
                  <DetailRow label="Тип тестовой публикации">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setRutubeTestType("feed")}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs",
                          rutubeTestType === "feed"
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:bg-zinc-50",
                        )}
                      >
                        Пост в ленту
                      </button>
                      <button
                        type="button"
                        onClick={() => setRutubeTestType("video")}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs",
                          rutubeTestType === "video"
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:bg-zinc-50",
                        )}
                      >
                        Видео / клип
                      </button>
                    </div>
                  </DetailRow>
                  {rutubeTestType === "video" && (
                    <div className="space-y-3 rounded-lg border border-border bg-zinc-50/80 p-3">
                      <label className="block space-y-1">
                        <span className="text-xs text-muted">Ссылка на видео (HTTPS)</span>
                        <input
                          type="url"
                          value={rutubeVideoURL}
                          onChange={(e) => setRutubeVideoURL(e.target.value)}
                          placeholder="https://…/video.mp4"
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-muted">Название</span>
                        <input
                          type="text"
                          value={rutubeVideoTitle}
                          onChange={(e) => setRutubeVideoTitle(e.target.value)}
                          placeholder="Необязательно"
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-muted">Обложка (URL картинки)</span>
                        <input
                          type="url"
                          value={rutubeThumbURL}
                          onChange={(e) => setRutubeThumbURL(e.target.value)}
                          placeholder="Необязательно"
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-muted">Отложенная публикация</span>
                        <input
                          type="datetime-local"
                          value={rutubePublishAt}
                          onChange={(e) => setRutubePublishAt(e.target.value)}
                          className="w-full rounded-md border border-border bg-white px-2.5 py-1.5 text-sm"
                        />
                        <p className="text-xs text-muted">
                          Время указывается в вашей таймзоне:{" "}
                          {timezoneLabel(userTimezone)}. Изменить — в Настройках.
                        </p>
                      </label>
                      <p className="text-xs text-muted">
                        Rutube скачивает видео по ссылке. Обработка и конвертация могут занять несколько
                        минут.
                      </p>
                    </div>
                  )}
                </>
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
                {selected.chat_type !== "business" && (
                  <>
                    {selected.provider === "wordpress" ? (
                      <p className="text-xs text-muted">
                        Проверка создаст черновик на сайте, без публикации в ленту.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleTestMessage()}
                      disabled={actionLoading}
                      className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Отправка…"
                        : selected.provider === "rutube" && rutubeTestType === "video"
                          ? "Отправить тестовое видео"
                          : selected.provider === "wordpress"
                            ? "Создать тестовый черновик"
                            : "Отправить тестовое сообщение"}
                    </button>
                  </>
                )}
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
            description="Подключите Telegram, VK, MAX, Rutube или Дзен — чтобы публиковать посты."
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
                  const title = channelDisplayName(ch);
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
                        <div className="flex items-center gap-3">
                          <ChannelAvatar
                            name={ch.name}
                            metadata={ch.metadata}
                            channelId={ch.id}
                            provider={ch.provider}
                            chatType={ch.chat_type}
                            cacheKey={channelAvatarCacheKey(ch)}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">{title}</p>
                            {ch.metadata?.public_url && (
                              <p className="mt-0.5 truncate text-xs text-muted">
                                {ch.metadata.public_url.replace(/^https?:\/\//, "")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ProviderBadge provider={ch.provider} chatType={ch.chat_type} />
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
