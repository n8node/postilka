import type { Post } from "@/lib/posts-api";
import { postCalendarDate } from "@/lib/calendar-utils";
import { postPreviewText } from "@/lib/posts-display";

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsUtc(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line: string) {
  const max = 73;
  if (line.length <= max) return line;
  const parts: string[] = [line.slice(0, max)];
  let rest = line.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

function statusDescription(status: Post["status"]) {
  switch (status) {
    case "scheduled":
      return "Запланировано";
    case "published":
      return "Опубликовано";
    case "pending_approval":
      return "На согласовании";
    case "draft":
      return "Черновик";
    case "failed":
      return "Ошибка";
    case "canceled":
      return "Отменено";
    default:
      return status;
  }
}

export function buildCalendarIcs(posts: Post[], timeZone: string) {
  const now = formatIcsUtc(new Date());
  const events: string[] = [];

  for (const post of posts) {
    const at = postCalendarDate(post);
    if (!at) continue;
    const start = new Date(at);
    const end = new Date(start.getTime() + 30 * 60_000);
    const summary = escapeIcs(postPreviewText(post).slice(0, 120));
    const description = escapeIcs(
      `${statusDescription(post.status)}${post.last_error ? `\n${post.last_error}` : ""}`,
    );
    const uid = `post-${post.id}@postilka.ru`;

    events.push(
      foldLine("BEGIN:VEVENT"),
      foldLine(`UID:${uid}`),
      foldLine(`DTSTAMP:${now}`),
      foldLine(`DTSTART:${formatIcsUtc(start)}`),
      foldLine(`DTEND:${formatIcsUtc(end)}`),
      foldLine(`SUMMARY:${summary}`),
      foldLine(`DESCRIPTION:${description}`),
      foldLine(`STATUS:${post.status === "canceled" ? "CANCELLED" : "CONFIRMED"}`),
      foldLine(`URL:https://postilka.ru/app/posts/${post.id}`),
      foldLine(`X-POSTILKA-TZ:${timeZone}`),
      foldLine("END:VEVENT"),
    );
  }

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Postilka//Calendar//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Postilka — публикации",
    `X-WR-TIMEZONE:${timeZone}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return body;
}

export function downloadCalendarIcs(posts: Post[], timeZone: string, filename = "postilka-calendar.ics") {
  const ics = buildCalendarIcs(posts, timeZone);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function copyCalendarIcsUrl(posts: Post[], timeZone: string) {
  const ics = buildCalendarIcs(posts, timeZone);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  return URL.createObjectURL(blob);
}
