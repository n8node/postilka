"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConnectChannelMenu } from "@/components/channels/ConnectChannelMenu";
import {
  ApiError,
  deleteChannel,
  fetchChannels,
  sendChannelTestMessage,
  type ChannelListItem,
  type ChannelProvider,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const statusLabel: Record<ChannelListItem["status"], string> = {
  active: "Активен",
  needs_reconnect: "Нужно переподключить",
  disabled: "Отключён",
};

const providerLabel: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  vk: "VK",
  ok: "OK",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
};

export default function ChannelsPage() {
  const [items, setItems] = useState<ChannelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

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
        rightTitle={selected ? selected.name : undefined}
        onCloseRight={selected ? () => setSelectedId(null) : undefined}
        right={
          selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted">Сеть</p>
                <p className="font-medium">{providerLabel[selected.provider]}</p>
              </div>
              <div>
                <p className="text-xs text-muted">ID канала</p>
                <p className="font-mono text-sm">{selected.chat_id}</p>
              </div>
              {selected.bot_username && (
                <div>
                  <p className="text-xs text-muted">Бот</p>
                  <p className="font-medium">@{selected.bot_username}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted">Статус</p>
                <p className="font-medium">{statusLabel[selected.status]}</p>
              </div>
              {selected.last_error && (
                <div>
                  <p className="text-xs text-muted">Ошибка</p>
                  <p className="text-sm text-red-600">{selected.last_error}</p>
                </div>
              )}
              {testSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {testSuccess}
                </div>
              )}
              <button
                type="button"
                onClick={handleTestMessage}
                disabled={actionLoading}
                className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? "Отправка…" : "Отправить тестовое сообщение"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="w-full rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Отключить канал
              </button>
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
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ch) => (
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
                    <td className="px-4 py-3 font-medium">{ch.name}</td>
                    <td className="px-4 py-3 text-muted">{providerLabel[ch.provider]}</td>
                    <td className="px-4 py-3">{statusLabel[ch.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CabinetPage>
    </div>
  );
}
