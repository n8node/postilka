export type TimezoneOption = {
  id: string;
  label: string;
};

/** IANA timezones covering Russian regions (must match backend internal/timezone). */
export const RUSSIA_TIMEZONES: TimezoneOption[] = [
  { id: "Europe/Kaliningrad", label: "Калининград (UTC+2)" },
  { id: "Europe/Moscow", label: "Москва, Санкт-Петербург (UTC+3)" },
  { id: "Europe/Kirov", label: "Киров (UTC+3)" },
  { id: "Europe/Volgograd", label: "Волгоград (UTC+3)" },
  { id: "Europe/Simferopol", label: "Симферополь (UTC+3)" },
  { id: "Europe/Astrakhan", label: "Астрахань (UTC+4)" },
  { id: "Europe/Saratov", label: "Саратов (UTC+4)" },
  { id: "Europe/Ulyanovsk", label: "Ульяновск (UTC+4)" },
  { id: "Europe/Samara", label: "Самара, Ижевск (UTC+4)" },
  { id: "Asia/Yekaterinburg", label: "Екатеринбург, Пермь (UTC+5)" },
  { id: "Asia/Omsk", label: "Омск (UTC+6)" },
  { id: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
  { id: "Asia/Barnaul", label: "Барнаул (UTC+7)" },
  { id: "Asia/Tomsk", label: "Томск (UTC+7)" },
  { id: "Asia/Novokuznetsk", label: "Новокузнецк (UTC+7)" },
  { id: "Asia/Krasnoyarsk", label: "Красноярск (UTC+7)" },
  { id: "Asia/Irkutsk", label: "Иркутск (UTC+8)" },
  { id: "Asia/Chita", label: "Чита (UTC+9)" },
  { id: "Asia/Yakutsk", label: "Якутск (UTC+9)" },
  { id: "Asia/Khandyga", label: "Хандыга (UTC+9)" },
  { id: "Asia/Vladivostok", label: "Владивосток, Хабаровск (UTC+10)" },
  { id: "Asia/Ust-Nera", label: "Усть-Нера (UTC+10)" },
  { id: "Asia/Magadan", label: "Магадан (UTC+11)" },
  { id: "Asia/Sakhalin", label: "Сахалин (UTC+11)" },
  { id: "Asia/Srednekolymsk", label: "Среднеколымск (UTC+11)" },
  { id: "Asia/Kamchatka", label: "Камчатка (UTC+12)" },
  { id: "Asia/Anadyr", label: "Анадырь (UTC+12)" },
];

export const DEFAULT_TIMEZONE = "Europe/Moscow";

export function normalizeTimezone(tz: string | undefined | null): string {
  const value = (tz ?? "").trim();
  return RUSSIA_TIMEZONES.some((item) => item.id === value)
    ? value
    : DEFAULT_TIMEZONE;
}

export function timezoneLabel(tz: string): string {
  return (
    RUSSIA_TIMEZONES.find((item) => item.id === tz)?.label ?? tz
  );
}

/** Converts datetime-local value to RFC3339 UTC using the given IANA timezone. */
export function localDateTimeToRFC3339(
  localDateTime: string,
  timeZone: string,
): string {
  const normalized = localDateTime.trim();
  if (!normalized) {
    throw new Error("empty datetime");
  }

  const [datePart, timePart = "00:00"] = normalized.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    throw new Error("invalid datetime");
  }

  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute);

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: normalizeTimezone(timeZone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utcMs));

    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");

    const asUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour"),
      read("minute"),
    );
    utcMs += targetLocalMs - asUtc;
  }

  return new Date(utcMs).toISOString();
}

export function publishAtPayload(
  localDateTime: string,
  timeZone: string,
): string {
  return localDateTimeToRFC3339(localDateTime, timeZone);
}
