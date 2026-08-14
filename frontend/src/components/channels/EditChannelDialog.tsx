"use client";

import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApiError,
  updateChannel,
  type ChannelListItem,
  type ChannelUpdateRequest,
} from "@/lib/api";
import { channelDisplayName } from "@/lib/channelPresentation";
import { cn } from "@/lib/utils";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";

type EditChannelDialogProps = {
  channel: ChannelListItem;
  open: boolean;
  onClose: () => void;
  onSaved: (item: ChannelListItem) => void;
};

export function EditChannelDialog({ channel, open, onClose, onSaved }: EditChannelDialogProps) {
  const [name, setName] = useState(channel.name);
  const [postMode, setPostMode] = useState<"own" | "platform">(
    channel.max_post_mode ?? "own",
  );
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(channel.name);
    setPostMode(channel.max_post_mode ?? "own");
    setBotToken("");
    setShowToken(false);
    setError(null);
  }, [open, channel]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: ChannelUpdateRequest = {
        name: name.trim(),
      };
      if (channel.provider === "telegram" && botToken.trim()) {
        payload.bot_token = botToken.trim();
      }
      if (channel.provider === "max") {
        payload.max_post_mode = postMode;
        if (postMode === "own" && botToken.trim()) {
          payload.bot_token = botToken.trim();
        }
      }
      const updated = await updateChannel(channel.id, payload);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

  const showBotTokenField =
    channel.provider === "telegram" ||
    (channel.provider === "max" && postMode === "own");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <ChannelAvatar
              name={channel.name}
              metadata={channel.metadata}
              channelId={channel.id}
              provider={channel.provider}
              chatType={channel.chat_type}
              size="md"
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">Редактировать канал</h2>
              <p className="truncate text-xs text-muted">{channelDisplayName(channel)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-zinc-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          {channel.provider === "max" && (
            <div>
              <p className="mb-2 text-xs text-muted">Режим публикации</p>
              <div className="grid grid-cols-2 gap-2">
                {(["own", "platform"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPostMode(mode)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      postMode === mode
                        ? "border-accent bg-accent/5 font-medium text-accent"
                        : "border-border text-muted hover:bg-zinc-50",
                    )}
                  >
                    {mode === "own" ? "Свой бот" : "Бот Postilka"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showBotTokenField && (
            <div>
              <label className="mb-1 block text-xs text-muted">
                {channel.bot_token_hint
                  ? `Новый токен бота (сейчас: ${channel.bot_token_hint})`
                  : "Токен бота"}
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Оставьте пустым, чтобы не менять"
                  className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-zinc-100"
                  aria-label={showToken ? "Скрыть токен" : "Показать токен"}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
