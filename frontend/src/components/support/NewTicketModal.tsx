"use client";

import { useEffect, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import type { SupportTicketTheme, TicketPriority } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import { PRIORITY_LABEL, themeIcon, themeIconClass, themeTileClass } from "./support-ui";

const PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"];

export function NewTicketModal({
  open,
  themes,
  creating,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  themes: SupportTicketTheme[];
  creating: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: {
    theme_id: string;
    subject: string;
    priority: TicketPriority;
    body: string;
    files: File[];
  }) => void;
}) {
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setThemeId(themes[0]?.id ?? "");
    setSubject("");
    setPriority("normal");
    setBody("");
    setFiles([]);
  }, [open, themes]);

  if (!open) return null;

  const selectedTheme = themes.find((t) => t.id === themeId) ?? themes[0];

  function handleSubmit() {
    onSubmit({
      theme_id: selectedTheme?.id ?? themeId,
      subject: subject.trim(),
      priority,
      body: body.trim(),
      files,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Новый тикет</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Категория</p>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((theme) => {
                const Icon = themeIcon(theme.icon, theme.slug);
                const selected = (selectedTheme?.id ?? themeId) === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setThemeId(theme.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      themeTileClass(theme.slug, selected),
                    )}
                  >
                    <Icon className={cn("h-4 w-4", themeIconClass(theme.slug))} />
                    <p className="mt-2 text-sm font-medium text-text">{theme.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {theme.description || "Вопрос в поддержку"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Тема</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Коротко опишите проблему…"
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Приоритет</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Описание</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Что произошло, что ожидали и как повторить…"
              rows={5}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-text">
              <Paperclip className="h-4 w-4" />
              Прикрепить файлы
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const next = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...next].slice(0, 5));
                  e.target.value = "";
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between rounded-lg bg-zinc-50 px-2 py-1 text-xs"
                  >
                    <span className="truncate">
                      {file.name} · {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 text-muted hover:text-text"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm hover:bg-zinc-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={creating}
              className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Создать тикет
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
