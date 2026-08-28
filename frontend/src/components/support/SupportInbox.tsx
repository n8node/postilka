"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Code2,
  ImagePlus,
  Loader2,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import type { SupportTicket, SupportTicketMessage, TicketStatus } from "@/lib/api";
import { supportAttachmentUrl } from "@/lib/api";
import { cn, formatBytes } from "@/lib/utils";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TICKET_FILTER_TABS,
  formatTicketDate,
  initialsFrom,
  isClosedTicket,
  isImageAttachment,
  lastMessagePreview,
  matchesTicketFilter,
  priorityBadgeClass,
  searchTicket,
  statusBadgeClass,
  ticketTitle,
  type TicketFilterTab,
} from "./support-ui";

export function SupportInbox({
  mode,
  tickets,
  selected,
  sending,
  onSelect,
  onSend,
  onResolve,
  onCloseTicket,
  onStatusChange,
  onCreate,
}: {
  mode: "user" | "admin";
  tickets: SupportTicket[];
  selected: SupportTicket | null;
  sending: boolean;
  onSelect: (ticket: SupportTicket) => void;
  onSend: (body: string, files: File[]) => void;
  onResolve: () => void;
  onCloseTicket: () => void;
  onStatusChange?: (status: TicketStatus) => void;
  onCreate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TicketFilterTab>("all");

  const filtered = useMemo(
    () =>
      tickets.filter((t) => matchesTicketFilter(t, tab) && searchTicket(t, query)),
    [tickets, tab, query],
  );

  return (
    <div className="grid min-h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-border bg-surface lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Поддержка</h2>
            {onCreate ? (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-8 items-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
              >
                + Новый тикет
              </button>
            ) : null}
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск тикетов…"
              className="h-9 w-full rounded-lg border border-border bg-zinc-50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {TICKET_FILTER_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                  tab === item.id
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-slate-600 hover:bg-zinc-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted">Нет тикетов</li>
          ) : (
            filtered.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ticket)}
                  className={cn(
                    "w-full border-b border-border px-4 py-3 text-left transition-colors",
                    selected?.id === ticket.id ? "bg-blue-50" : "hover:bg-zinc-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-text">{ticketTitle(ticket)}</p>
                    {ticket.priority && ticket.priority !== "normal" ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          priorityBadgeClass(ticket.priority),
                        )}
                      >
                        {PRIORITY_LABEL[ticket.priority]}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {ticket.theme?.name ? (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        {ticket.theme.name}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        statusBadgeClass(ticket.status),
                      )}
                    >
                      {STATUS_LABEL[ticket.status]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{lastMessagePreview(ticket)}</p>
                  {mode === "admin" && ticket.user?.email ? (
                    <p className="mt-1 truncate text-[11px] text-slate-500">{ticket.user.email}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted">{formatTicketDate(ticket.updated_at)}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="flex min-h-[28rem] flex-col">
        {selected ? (
          <TicketThread
            mode={mode}
            ticket={selected}
            sending={sending}
            onSend={onSend}
            onResolve={onResolve}
            onCloseTicket={onCloseTicket}
            onStatusChange={onStatusChange}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-muted">
            <p className="text-sm">Выберите тикет или создайте новый</p>
          </div>
        )}
      </section>
    </div>
  );
}

function TicketThread({
  mode,
  ticket,
  sending,
  onSend,
  onResolve,
  onCloseTicket,
  onStatusChange,
}: {
  mode: "user" | "admin";
  ticket: SupportTicket;
  sending: boolean;
  onSend: (body: string, files: File[]) => void;
  onResolve: () => void;
  onCloseTicket: () => void;
  onStatusChange?: (status: TicketStatus) => void;
}) {
  const closed = isClosedTicket(ticket.status);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [ticket.id, ticket.messages?.length]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-text">
              {ticket.ticket_number ? `#${ticket.ticket_number}` : ""} {ticketTitle(ticket)}
            </h2>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusBadgeClass(ticket.status))}>
              {STATUS_LABEL[ticket.status]}
            </span>
            {ticket.theme?.name ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                {ticket.theme.name}
              </span>
            ) : null}
            {ticket.priority && ticket.priority !== "normal" ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  priorityBadgeClass(ticket.priority),
                )}
              >
                {PRIORITY_LABEL[ticket.priority]}
              </span>
            ) : null}
          </div>
          {mode === "admin" && ticket.user ? (
            <p className="mt-1 text-sm text-muted">
              {ticket.user.email}
              {ticket.user.name ? ` · ${ticket.user.name}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!closed ? (
            <>
              <button
                type="button"
                onClick={onResolve}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium hover:bg-zinc-50"
              >
                <Check className="h-3.5 w-3.5" />
                Решить
              </button>
              <button
                type="button"
                onClick={onCloseTicket}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium hover:bg-zinc-50"
              >
                <X className="h-3.5 w-3.5" />
                Закрыть
              </button>
            </>
          ) : null}
          {mode === "admin" && onStatusChange ? (
            <select
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
              className="h-8 rounded-lg border border-border bg-white px-2 text-xs"
            >
              {(Object.entries(STATUS_LABEL) as [TicketStatus, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      <p className="px-5 pt-2 text-right text-xs text-muted">
        Открыт {formatTicketDate(ticket.created_at, true)}
      </p>

      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex items-center gap-3 py-2 text-[11px] uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-border" />
          Тикет открыт
          <span className="h-px flex-1 bg-border" />
        </div>
        {(ticket.messages ?? []).map((message) => (
          <ChatBubble key={message.id} mode={mode} ticket={ticket} message={message} />
        ))}
      </div>

      {closed ? (
        <p className="border-t border-border px-5 py-4 text-sm text-muted">
          Тикет закрыт. Создайте новый, если вопрос остался.
        </p>
      ) : (
        <MessageComposer sending={sending} onSend={onSend} />
      )}
    </>
  );
}

function ChatBubble({
  mode,
  ticket,
  message,
}: {
  mode: "user" | "admin";
  ticket: SupportTicket;
  message: SupportTicketMessage;
}) {
  const mine = mode === "admin" ? message.author_role === "admin" : message.author_role === "user";
  const name =
    message.author_role === "admin"
      ? message.author_name || "Поддержка"
      : message.author_email || ticket.user?.email || message.author_name || "Вы";
  const avatar = message.author_role === "admin" ? "SUP" : mine ? "ВЫ" : initialsFrom(message.author_name, name);

  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-slate-700">
          {avatar}
        </div>
      ) : null}
      <div className={cn("max-w-[80%] space-y-1", mine ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>{name}</span>
          <span>{formatTicketDate(message.created_at)}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
            mine ? "bg-zinc-900 text-white" : "bg-zinc-100 text-text",
          )}
        >
          {message.body.trim() ? message.body : null}
          {(message.attachments ?? []).length > 0 ? (
            <div className={cn("space-y-2", message.body.trim() ? "mt-2" : "")}>
              {message.attachments?.map((att) => {
                const href = supportAttachmentUrl(att.url);
                if (isImageAttachment(att.mime_type)) {
                  return (
                    <a key={att.id} href={href} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={href}
                        alt={att.filename}
                        className="max-h-48 max-w-full rounded-lg object-contain"
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={att.id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1 underline",
                      mine ? "text-blue-200" : "text-blue-700",
                    )}
                  >
                    {att.filename} ({formatBytes(att.size_bytes)})
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      {mine ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
          {avatar}
        </div>
      ) : null}
    </div>
  );
}

function MessageComposer({
  sending,
  onSend,
}: {
  sending: boolean;
  onSend: (body: string, files: File[]) => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 5));
  }

  function insertCode() {
    const el = areaRef.current;
    const snippet = "```\n\n```";
    if (!el) {
      setBody((v) => v + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    const next = selected
      ? `${body.slice(0, start)}\`\`\`\n${selected}\n\`\`\`${body.slice(end)}`
      : `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = selected ? start + selected.length + 4 : start + 4;
      el.setSelectionRange(pos, pos);
    });
  }

  function submit() {
    if (sending) return;
    if (!body.trim() && files.length === 0) return;
    onSend(body.trim(), files);
    setBody("");
    setFiles([]);
  }

  return (
    <div className="border-t border-border px-5 py-3">
      <div className="rounded-xl border border-border bg-white">
        <textarea
          ref={areaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Напишите сообщение…"
          rows={3}
          className="w-full resize-none rounded-t-xl bg-transparent px-3 py-2 text-sm focus:outline-none"
        />
        {files.length > 0 ? (
          <ul className="flex flex-wrap gap-1 px-3 pb-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px]"
              >
                {file.name}
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
              title="Прикрепить файл"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
              title="Прикрепить фото"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={insertCode}
              className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
              title="Вставить код"
            >
              <Code2 className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={sending || (!body.trim() && files.length === 0)}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Отправить
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">Обычно отвечаем в рабочие часы · Enter — отправить</p>
    </div>
  );
}
