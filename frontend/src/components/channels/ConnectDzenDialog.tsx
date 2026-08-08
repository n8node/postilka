"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ContextHelpLinks } from "@/components/support/ContextHelpLinks";
import { SupportSheet } from "@/components/support/SupportSheet";
import { fetchChannelProviderInfo, type ChannelProviderInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

const DZEN_BOT_USERNAME = "zen_sync_bot";
const DZEN_BOT_URL = "https://t.me/zen_sync_bot";
const DZEN_HELP_URL = "https://dzen.ru/help/ru/channel/cross-platform.html";

const STEPS = [
  {
    title: "Подключите Telegram-канал в Postilka",
    body: "Дзен принимает посты через официальный кросспостинг из Telegram. Сначала добавьте свой публичный Telegram-канал — именно в него Postilka будет публиковать.",
    accent: "accent" as const,
  },
  {
    title: "Получите код в Студии Дзена",
    body: "Откройте Студию Дзена → Настройки → Кросспостинг → Telegram → «Получить код доступа». Код действует 30 минут.",
    accent: "slate" as const,
  },
  {
    title: "Авторизуйте бота Дзена",
    body: "В Telegram откройте @zen_sync_bot, нажмите «Запустить» и отправьте скопированный код. Затем выполните команду /sync.",
    accent: "slate" as const,
  },
  {
    title: "Добавьте бота администратором канала",
    body: "Telegram-канал должен быть публичным. Добавьте @zen_sync_bot в администраторы — расширенные права не нужны.",
    accent: "slate" as const,
  },
  {
    title: "Отправьте боту ссылку на канал",
    body: "Скопируйте ссылку вида https://t.me/your_channel и отправьте её боту. После этого посты из Telegram автоматически появятся в Дзене через несколько минут.",
    accent: "slate" as const,
  },
];

type ConnectDzenDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnectTelegram: () => void;
};

export function ConnectDzenDialog({ open, onClose, onConnectTelegram }: ConnectDzenDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchChannelProviderInfo()
      .then(setProviderInfo)
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const dzenProvider = providerInfo?.providers.find((p) => p.provider === "dzen");
  const enabled = dzenProvider?.enabled ?? false;
  const telegramEnabled = providerInfo?.telegram_enabled ?? false;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-semibold">Публикация в Дзен</h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                Прямого API у Дзена нет — используем официальный кросспостинг через Telegram
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            {!enabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Публикация в Дзен временно отключена администратором платформы.
              </div>
            )}

            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p className="text-sm font-medium text-emerald-900">Как это работает</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-800">
                <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Postilka</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Telegram-канал</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                  <Bot className="h-3 w-3" />@{DZEN_BOT_USERNAME}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                <span className="rounded-full bg-white px-2.5 py-1 shadow-sm">Канал в Дзене</span>
              </div>
            </div>

            <ol className="space-y-4">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className={cn(
                    "rounded-xl border p-4",
                    index === 0 ? "border-accent/30 bg-accent/5" : "border-border bg-zinc-50/50",
                  )}
                >
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        index === 0 ? "bg-accent text-white" : "bg-white text-slate-600 ring-1 ring-border",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{step.title}</p>
                      <p className="mt-1 text-sm text-muted">{step.body}</p>
                      {index === 0 && (
                        <button
                          type="button"
                          disabled={!enabled || !telegramEnabled}
                          onClick={() => {
                            onClose();
                            onConnectTelegram();
                          }}
                          className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          Подключить Telegram-канал
                        </button>
                      )}
                      {index === 0 && !telegramEnabled && (
                        <p className="mt-2 text-xs text-amber-700">
                          Telegram временно отключён администратором — без него кросспостинг в Дзен
                          недоступен.
                        </p>
                      )}
                      {index === 2 && (
                        <a
                          href={DZEN_BOT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                        >
                          Открыть @{DZEN_BOT_USERNAME}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-medium">Важно знать</p>
              <ul className="mt-2 space-y-2 text-sm text-muted">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Telegram-канал должен быть публичным
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Один Telegram-канал — один канал в Дзене
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Задержка между Telegram и Дзеном — обычно несколько минут
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Заголовок в Дзене — первое предложение поста (до 140 символов)
                </li>
              </ul>
            </div>

            <ContextHelpLinks
              helpURL={dzenProvider?.connect_help_url || DZEN_HELP_URL}
              helpLabel="Официальная инструкция Дзена"
              onSupportClick={() => setSupportOpen(true)}
            />

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-zinc-50"
              >
                Закрыть
              </button>
              {enabled && telegramEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConnectTelegram();
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" />
                  Подключить Telegram
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        context="dzen_connect"
        info={
          providerInfo && dzenProvider
            ? {
                ...providerInfo,
                connect_help_text: dzenProvider.connect_help_text,
                connect_help_url: dzenProvider.connect_help_url,
                docs_url: dzenProvider.docs_url,
                support_telegram_username: dzenProvider.support_telegram_username,
                support_telegram_url: dzenProvider.support_telegram_url,
                support_email: dzenProvider.support_email,
                support_hours_text: dzenProvider.support_hours_text,
              }
            : providerInfo
        }
      />
    </>
  );
}
