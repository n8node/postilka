export const HELP_ROUTE_OPTIONS = [
  { key: "dashboard", label: "Обзор", prefixes: ["/dashboard"] },
  { key: "channels", label: "Каналы", prefixes: ["/channels"] },
  { key: "posts", label: "Посты", prefixes: ["/posts"] },
  { key: "calendar", label: "Календарь", prefixes: ["/calendar"] },
  { key: "files", label: "Файлы", prefixes: ["/files", "/media"] },
  { key: "workflows", label: "Процессы", prefixes: ["/workflows"] },
  { key: "ai", label: "Генерация", prefixes: ["/ai"] },
  { key: "plans", label: "Тарифные планы", prefixes: ["/plans"] },
  { key: "team", label: "Команда", prefixes: ["/team"] },
  { key: "analytics", label: "Аналитика", prefixes: ["/analytics"] },
  { key: "settings", label: "Настройки", prefixes: ["/settings"] },
  { key: "notifications", label: "Уведомления", prefixes: ["/notifications"] },
  { key: "support", label: "Поддержка", prefixes: ["/support"] },
  { key: "invites", label: "Приглашения", prefixes: ["/invites"] },
] as const;

export type HelpRouteKey = (typeof HELP_ROUTE_OPTIONS)[number]["key"];

export function helpRouteLabel(key: string) {
  return HELP_ROUTE_OPTIONS.find((item) => item.key === key)?.label || key;
}

export function helpRouteFromPath(pathname: string): HelpRouteKey {
  const path = pathname.replace(/\/$/, "") || "/";
  const ranked = [...HELP_ROUTE_OPTIONS].flatMap((item) =>
    item.prefixes.map((prefix) => ({ key: item.key, prefix })),
  );
  ranked.sort((a, b) => b.prefix.length - a.prefix.length);
  for (const item of ranked) {
    if (item.prefix === "/dashboard") {
      if (path === "/dashboard") return item.key;
      continue;
    }
    if (path === item.prefix || path.startsWith(`${item.prefix}/`)) {
      return item.key;
    }
  }
  return "dashboard";
}
