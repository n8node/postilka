import type { Post } from "@/lib/posts-api";

export type CalendarView = "month" | "week" | "day" | "year" | "list" | "kanban" | "timeline";

/** Primary toolbar views (Google Calendar–style). */
export const CALENDAR_VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "День" },
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
  { id: "list", label: "Расписание" },
];

export const CALENDAR_EXTRA_VIEWS: { id: CalendarView; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "timeline", label: "Timeline" },
];

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const WORK_HOUR_START = 9;
export const WORK_HOUR_END = 18;

/** Calendar placement date for a post. */
export function postCalendarDate(post: Post): Date | null {
  if (post.due_at && ["scheduled", "pending_approval", "publishing", "failed"].includes(post.status)) {
    return new Date(post.due_at);
  }
  if (post.published_at && post.status === "published") {
    return new Date(post.published_at);
  }
  if (post.due_at && post.status === "draft") {
    return new Date(post.due_at);
  }
  return null;
}

export function isPostUnscheduled(post: Post) {
  return !post.due_at && ["draft", "failed", "canceled"].includes(post.status);
}

export function canDragPost(post: Post) {
  if (post.status === "published" || post.status === "publishing") return false;
  return ["draft", "scheduled", "failed", "pending_approval", "canceled"].includes(post.status);
}

export function startOfDay(date: Date, timeZone: string) {
  const parts = datePartsInTz(date, timeZone);
  return zonedDateTime(parts.year, parts.month, parts.day, 0, 0, timeZone);
}

export function endOfDay(date: Date, timeZone: string) {
  const parts = datePartsInTz(date, timeZone);
  return zonedDateTime(parts.year, parts.month, parts.day, 23, 59, timeZone);
}

export function addDays(date: Date, days: number, timeZone: string) {
  const parts = datePartsInTz(date, timeZone);
  const utc = zonedDateTime(parts.year, parts.month, parts.day, 12, 0, timeZone);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc;
}

export function startOfWeek(date: Date, timeZone: string) {
  const parts = datePartsInTz(date, timeZone);
  const day = parts.day;
  const month = parts.month;
  const year = parts.year;
  const weekday = weekdayInTz(date, timeZone);
  const diff = weekday === 0 ? 6 : weekday - 1;
  const anchor = zonedDateTime(year, month, day, 12, 0, timeZone);
  anchor.setUTCDate(anchor.getUTCDate() - diff);
  return anchor;
}

export function endOfWeek(date: Date, timeZone: string) {
  const start = startOfWeek(date, timeZone);
  return addDays(start, 6, timeZone);
}

export function startOfMonth(date: Date, timeZone: string) {
  const parts = datePartsInTz(date, timeZone);
  return zonedDateTime(parts.year, parts.month, 1, 0, 0, timeZone);
}

export function endOfMonth(date: Date, timeZone: string) {
  const parts = datePartsInTz(date, timeZone);
  const next = zonedDateTime(parts.year, parts.month + 1, 1, 0, 0, timeZone);
  next.setUTCMilliseconds(next.getUTCMilliseconds() - 1);
  return next;
}

export function monthGridDays(anchor: Date, timeZone: string) {
  const monthStart = startOfMonth(anchor, timeZone);
  const monthEnd = endOfMonth(anchor, timeZone);
  const gridStart = startOfWeek(monthStart, timeZone);
  const gridEnd = endOfWeek(monthEnd, timeZone);
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1, timeZone);
  }
  return days;
}

export function weekDays(anchor: Date, timeZone: string) {
  const start = startOfWeek(anchor, timeZone);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i, timeZone));
}

export function sameCalendarDay(a: Date, b: Date, timeZone: string) {
  const pa = datePartsInTz(a, timeZone);
  const pb = datePartsInTz(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

export function isToday(date: Date, timeZone: string) {
  return sameCalendarDay(date, new Date(), timeZone);
}

export function isSameMonth(date: Date, anchor: Date, timeZone: string) {
  const pa = datePartsInTz(date, timeZone);
  const pb = datePartsInTz(anchor, timeZone);
  return pa.year === pb.year && pa.month === pb.month;
}

export function isSameDay(a: Date, b: Date, timeZone: string) {
  return sameCalendarDay(a, b, timeZone);
}

export function isWeekend(date: Date, timeZone: string) {
  const wd = weekdayInTz(date, timeZone);
  return wd === 0 || wd === 6;
}

export function miniMonthGridDays(anchor: Date, timeZone: string) {
  return monthGridDays(anchor, timeZone).slice(0, 42);
}

export function hourInTz(date: Date, timeZone: string) {
  return datePartsInTz(date, timeZone).hour;
}

export function minuteInTz(date: Date, timeZone: string) {
  return datePartsInTz(date, timeZone).minute;
}

export function dateKey(date: Date, timeZone: string) {
  const p = datePartsInTz(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function rangeForView(view: CalendarView, anchor: Date, timeZone: string) {
  if (view === "month") {
    const grid = monthGridDays(anchor, timeZone);
    return {
      from: startOfDay(grid[0]!, timeZone),
      to: endOfDay(addDays(grid[grid.length - 1]!, 1, timeZone), timeZone),
    };
  }
  if (view === "week") {
    const start = startOfWeek(anchor, timeZone);
    const end = endOfWeek(anchor, timeZone);
    return { from: startOfDay(start, timeZone), to: endOfDay(addDays(end, 1, timeZone), timeZone) };
  }
  if (view === "day") {
    return {
      from: startOfDay(anchor, timeZone),
      to: endOfDay(addDays(anchor, 1, timeZone), timeZone),
    };
  }
  if (view === "year") {
    const parts = datePartsInTz(anchor, timeZone);
    const yearStart = zonedDateTime(parts.year, 1, 1, 0, 0, timeZone);
    const yearEnd = zonedDateTime(parts.year, 12, 31, 23, 59, timeZone);
    const gridStart = startOfWeek(yearStart, timeZone);
    const gridEnd = endOfWeek(yearEnd, timeZone);
    return { from: startOfDay(gridStart, timeZone), to: endOfDay(addDays(gridEnd, 1, timeZone), timeZone) };
  }
  if (view === "kanban") {
    const start = startOfWeek(anchor, timeZone);
    const end = addDays(start, 27, timeZone);
    return { from: startOfDay(start, timeZone), to: endOfDay(addDays(end, 1, timeZone), timeZone) };
  }
  if (view === "timeline") {
    const start = startOfWeek(anchor, timeZone);
    const end = addDays(start, 13, timeZone);
    return { from: startOfDay(start, timeZone), to: endOfDay(addDays(end, 1, timeZone), timeZone) };
  }
  const start = startOfWeek(anchor, timeZone);
  const end = addDays(start, 27, timeZone);
  return { from: startOfDay(start, timeZone), to: endOfDay(addDays(end, 1, timeZone), timeZone) };
}

export function shiftAnchor(view: CalendarView, anchor: Date, delta: number, timeZone: string) {
  if (view === "year") {
    const parts = datePartsInTz(anchor, timeZone);
    return zonedDateTime(parts.year + delta, 1, 1, 12, 0, timeZone);
  }
  if (view === "month" || view === "list" || view === "kanban") {
    const parts = datePartsInTz(anchor, timeZone);
    return zonedDateTime(parts.year, parts.month + delta, 1, 12, 0, timeZone);
  }
  if (view === "week" || view === "timeline") return addDays(anchor, delta * 7, timeZone);
  return addDays(anchor, delta, timeZone);
}

export function formatPeriodTitle(view: CalendarView, anchor: Date, timeZone: string) {
  const fmtDay = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
  const fmtWeekRange = (from: Date, to: Date) => {
    const f = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone });
    const t = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    });
    return `${f.format(from)} – ${t.format(to)}`;
  };
  if (view === "year") {
    const parts = datePartsInTz(anchor, timeZone);
    return String(parts.year);
  }
  if (view === "month" || view === "list" || view === "kanban") {
    return new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone }).format(anchor);
  }
  if (view === "week" || view === "timeline") {
    const start = startOfWeek(anchor, timeZone);
    const end = view === "timeline" ? addDays(start, 13, timeZone) : endOfWeek(anchor, timeZone);
    return fmtWeekRange(start, end);
  }
  return fmtDay.format(anchor);
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function toRFC3339(date: Date) {
  return date.toISOString();
}

export function combineDateAndTime(day: Date, sourceIso: string | undefined, timeZone: string, hour?: number) {
  const dayParts = datePartsInTz(day, timeZone);
  if (hour != null) {
    return zonedDateTime(dayParts.year, dayParts.month, dayParts.day, hour, 0, timeZone);
  }
  if (sourceIso) {
    const srcParts = datePartsInTz(new Date(sourceIso), timeZone);
    return zonedDateTime(dayParts.year, dayParts.month, dayParts.day, srcParts.hour, srcParts.minute, timeZone);
  }
  const nowParts = datePartsInTz(new Date(), timeZone);
  let h = nowParts.hour;
  let m = nowParts.minute;
  if (h < WORK_HOUR_START) {
    h = WORK_HOUR_START;
    m = 0;
  }
  return zonedDateTime(dayParts.year, dayParts.month, dayParts.day, h, m, timeZone);
}

export function isPastDateTime(date: Date) {
  return date.getTime() <= Date.now();
}

export function dayDensity(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 0.15;
  if (count === 2) return 0.3;
  if (count <= 4) return 0.5;
  return Math.min(0.85, 0.5 + count * 0.05);
}

function datePartsInTz(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"),
    minute: get("minute"),
  };
}

function weekdayInTz(date: Date, timeZone: string) {
  const label = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone }).format(date);
  const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  return map[label.slice(0, 3)] ?? 1;
}

/** Build UTC instant for local wall time in IANA timezone (approximation via offset probe). */
function zonedDateTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  let m = month;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  const guess = new Date(Date.UTC(y, m - 1, day, hour, minute, 0, 0));
  const offset = timezoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offset * 60_000);
}

function timezoneOffsetMinutes(date: Date, timeZone: string) {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tz = new Date(date.toLocaleString("en-US", { timeZone }));
  return (tz.getTime() - utc.getTime()) / 60_000;
}
