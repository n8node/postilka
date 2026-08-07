"use client";

import {
  BookOpen,
  ExternalLink,
  Mail,
  MessageCircle,
  X,
} from "lucide-react";
import type { ChannelProviderInfo } from "@/lib/api";

export type SupportContext = "general" | "telegram_connect";

type SupportSheetProps = {
  open: boolean;
  onClose: () => void;
  info: ChannelProviderInfo | null;
  context?: SupportContext;
};

const DEFAULT_INFO: ChannelProviderInfo = {
  telegram_enabled: true,
  connect_help_text: "",
  connect_help_url: "https://postilka.ru/docs/telegram",
  docs_url: "https://postilka.ru/docs",
  support_telegram_username: "postilka_support",
  support_telegram_url: "https://t.me/postilka_support",
  support_email: "support@postilka.ru",
  support_hours_text: "пн–вс 10:00–19:00 (МСК)",
  providers: [],
};

function SupportRow({
  icon: Icon,
  title,
  description,
  href,
  external = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-zinc-50"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium text-text">
          {title}
          {external && <ExternalLink className="h-3.5 w-3.5 text-muted" />}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
    </a>
  );
}

export function SupportSheet({
  open,
  onClose,
  info,
  context = "general",
}: SupportSheetProps) {
  if (!open) return null;

  const data = info ?? DEFAULT_INFO;
  const telegramUser = data.support_telegram_username
    ? `@${data.support_telegram_username.replace(/^@/, "")}`
    : "";
  const telegramURL =
    context === "telegram_connect" && data.support_telegram_username
      ? `https://t.me/${data.support_telegram_username.replace(/^@/, "")}?start=connect_help`
      : data.support_telegram_url;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Поддержка</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {data.support_hours_text && (
            <p className="text-sm text-muted">
              Мы на связи {data.support_hours_text}. Напишите, если что-то не получается с
              подключением или публикацией.
            </p>
          )}

          {context === "telegram_connect" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Не получается подключить Telegram? Проверьте, что бот — администратор группы или
              канала и не включена опция «Оставаться анонимным».
            </div>
          )}

          <div className="space-y-2">
            {data.connect_help_url && context === "telegram_connect" && (
              <SupportRow
                icon={BookOpen}
                title="Инструкция"
                description="Пошаговое руководство в центре помощи"
                href={data.connect_help_url}
              />
            )}

            {data.docs_url && (
              <SupportRow
                icon={BookOpen}
                title="Центр помощи"
                description="Документация и ответы на частые вопросы"
                href={data.docs_url}
              />
            )}

            {telegramURL && (
              <SupportRow
                icon={MessageCircle}
                title="Telegram"
                description={
                  telegramUser
                    ? `Напишите ${telegramUser} — поможем с подключением`
                    : "Напишите нам в Telegram"
                }
                href={telegramURL}
              />
            )}

            {data.support_email && (
              <SupportRow
                icon={Mail}
                title="Электронная почта"
                description={data.support_email}
                href={`mailto:${data.support_email}`}
                external={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
