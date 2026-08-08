"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  adminEmail: string;
  adminName: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  soon?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const nav: NavSection[] = [
  {
    label: "Обзор",
    items: [{ href: "/admin", label: "Сводка", soon: true }],
  },
  {
    label: "Платформа",
    items: [
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/workspaces", label: "Workspace" },
      { href: "/admin/files", label: "Файлы" },
      { href: "/admin/plans", label: "Тарифы" },
      { href: "/admin/settings", label: "Настройки" },
      { href: "/admin/auth-settings", label: "Вход и регистрация" },
      { href: "/admin/email-templates", label: "Шаблоны писем" },
      { href: "/admin/storage-settings", label: "S3 — хранилище" },
      { href: "/admin/social-providers", label: "Соцсети — каналы" },
      { href: "/admin/public-pages", label: "Публичные страницы" },
    ],
  },
];

function breadcrumbLabel(pathname: string) {
  if (pathname.startsWith("/admin/files")) return "Файлы";
  if (pathname.startsWith("/admin/workspaces")) return "Workspace";
  if (pathname.startsWith("/admin/auth-settings")) return "Вход и регистрация";
  if (pathname.startsWith("/admin/email-templates")) return "Шаблоны писем";
  if (pathname.startsWith("/admin/email-settings")) return "Настройки";
  if (pathname.startsWith("/admin/payment-settings")) return "Настройки";
  if (pathname.startsWith("/admin/invites")) return "Настройки";
  if (pathname.startsWith("/admin/max-platform-bot")) return "Соцсети — каналы";
  if (pathname.startsWith("/admin/telegram/notifications")) return "Настройки";
  if (pathname.startsWith("/admin/storage-settings")) return "S3 — хранилище";
  if (pathname.startsWith("/admin/social-providers")) return "Соцсети — каналы";
  if (pathname.startsWith("/admin/telegram/provider")) return "Соцсети — каналы";
  if (pathname.startsWith("/admin/public-pages")) return "Публичные страницы";
  if (pathname.startsWith("/admin/telegram")) return "Telegram";
  if (pathname.startsWith("/admin/plans")) return "Тарифы";
  if (pathname.startsWith("/admin/settings")) return "Настройки";
  if (pathname.startsWith("/admin/users")) return "Пользователи";
  return "Admin";
}

export function AdminShell({
  adminEmail,
  adminName,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[#eef1f6] text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col bg-[#0b1220] text-slate-200">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/admin/users" className="text-lg font-semibold tracking-wide text-white">
            POSTILKA
          </Link>
          <span className="mt-2 inline-flex rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
            Superadmin
          </span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {nav.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active =
                    !item.soon &&
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));
                  if (item.soon) {
                    return (
                      <li key={item.label}>
                        <span className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm text-slate-500">
                          {item.label}
                          <span className="text-[10px] uppercase">скоро</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "block rounded-md px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-medium text-white">
            {adminName || adminEmail}
          </p>
          <p className="truncate text-xs text-slate-400">{adminEmail}</p>
          <p className="mt-0.5 text-xs text-slate-500">Superadmin</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/dashboard" className="text-blue-300 hover:underline">
              В приложение
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white"
            >
              Выйти
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-6 py-3 backdrop-blur">
          <p className="text-sm text-slate-500">
            Admin <span className="text-slate-300">/</span>{" "}
            <span className="text-slate-800">{breadcrumbLabel(pathname)}</span>
          </p>
          <div className="w-56 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-400">
            Search (скоро)
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
