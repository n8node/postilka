import type { LucideIcon } from "lucide-react";
import {
  Bug,
  CreditCard,
  HelpCircle,
  MessageSquare,
  Plus,
  Radio,
  Wrench,
} from "lucide-react";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/lib/api";

export type TicketFilterTab = "all" | "open" | "pending" | "resolved";

export const TICKET_FILTER_TABS: { id: TicketFilterTab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "open", label: "Открытые" },
  { id: "pending", label: "Ожидают" },
  { id: "resolved", label: "Решённые" },
];

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Открыт",
  awaiting_admin: "Ожидает",
  awaiting_user: "Есть ответ",
  in_progress: "В работе",
  resolved: "Решён",
  closed: "Закрыт",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export function statusBadgeClass(status: TicketStatus) {
  switch (status) {
    case "awaiting_admin":
      return "bg-amber-100 text-amber-800";
    case "awaiting_user":
      return "bg-emerald-100 text-emerald-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "resolved":
      return "bg-emerald-50 text-emerald-700";
    case "closed":
      return "bg-slate-100 text-slate-600";
    default:
      return "border border-blue-200 bg-white text-blue-700";
  }
}

export function priorityBadgeClass(priority: TicketPriority | undefined) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "low":
      return "bg-slate-100 text-slate-600";
    default:
      return "";
  }
}

export function ticketTitle(ticket: SupportTicket) {
  const subject = ticket.subject?.trim();
  if (subject) return subject;
  return ticket.theme?.name || "Обращение";
}

export function lastMessagePreview(ticket: SupportTicket) {
  const messages = ticket.messages ?? [];
  const last = messages[messages.length - 1];
  if (!last) return "Нет сообщений";
  const text = last.body.trim();
  if (text && text !== "") return text;
  const att = last.attachments?.[0];
  if (att) return `Вложение: ${att.filename}`;
  return "Нет сообщений";
}

export function matchesTicketFilter(ticket: SupportTicket, tab: TicketFilterTab) {
  if (tab === "all") return true;
  if (tab === "open") return ticket.status === "open" || ticket.status === "in_progress";
  if (tab === "pending") return ticket.status === "awaiting_admin" || ticket.status === "awaiting_user";
  return ticket.status === "resolved" || ticket.status === "closed";
}

export function searchTicket(ticket: SupportTicket, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    ticketTitle(ticket),
    ticket.theme?.name ?? "",
    ticket.user?.email ?? "",
    ticket.user?.name ?? "",
    String(ticket.ticket_number ?? ""),
    ...(ticket.messages ?? []).map((m) => m.body),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function formatTicketDate(iso: string, withSeconds = false) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
  });
}

const THEME_ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  "credit-card": CreditCard,
  radio: Radio,
  help: HelpCircle,
  plus: Plus,
  bug: Bug,
  message: MessageSquare,
};

export function themeIcon(icon?: string, slug?: string): LucideIcon {
  if (icon && THEME_ICONS[icon]) return THEME_ICONS[icon];
  if (slug && THEME_ICONS[slug]) return THEME_ICONS[slug];
  switch (slug) {
    case "billing":
      return CreditCard;
    case "channels":
      return Radio;
    case "bugs":
      return Wrench;
    case "ideas":
      return Plus;
    default:
      return HelpCircle;
  }
}

export function themeTileClass(slug?: string, selected?: boolean) {
  const tone =
    slug === "billing"
      ? "purple"
      : slug === "ideas"
        ? "green"
        : slug === "bugs"
          ? "blue"
          : slug === "channels"
            ? "sky"
            : "slate";
  if (selected) {
    const map: Record<string, string> = {
      purple: "border-purple-400 bg-purple-50",
      green: "border-emerald-400 bg-emerald-50",
      blue: "border-blue-400 bg-blue-50",
      sky: "border-sky-400 bg-sky-50",
      slate: "border-slate-400 bg-slate-50",
    };
    return map[tone];
  }
  return "border-border bg-surface hover:bg-zinc-50";
}

export function themeIconClass(slug?: string) {
  switch (slug) {
    case "billing":
      return "text-purple-600";
    case "ideas":
      return "text-emerald-600";
    case "bugs":
      return "text-blue-600";
    case "channels":
      return "text-sky-600";
    default:
      return "text-slate-500";
  }
}

export function initialsFrom(name?: string, email?: string) {
  const src = (name || email || "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  return letters.toUpperCase() || src.slice(0, 2).toUpperCase();
}

export function isImageAttachment(mime: string) {
  return mime.startsWith("image/");
}

export function isClosedTicket(status: TicketStatus) {
  return status === "resolved" || status === "closed";
}
