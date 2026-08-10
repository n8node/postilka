"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  PenSquare,
  CalendarDays,
  ImageIcon,
  Sparkles,
  Wallet,
  Users,
  BarChart3,
  Settings,
  Bell,
  Ticket,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { EmailVerificationBanner } from "@/components/layout/EmailVerificationBanner";
import { WalletBalanceBadge } from "@/components/billing/WalletBalanceBadge";
import { GenerationCompleteToast } from "@/components/generation/GenerationCompleteToast";
import { GenerationJobSync } from "@/components/generation/GenerationJobSync";
import { VideoGenerationJobSync } from "@/components/generation/VideoGenerationJobSync";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/channels", label: "Каналы", icon: Radio },
  { href: "/posts", label: "Посты", icon: PenSquare },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/files", label: "Файлы", icon: ImageIcon },
  { href: "/ai", label: "Ai контент", icon: Sparkles },
  { href: "/plans", label: "Тариф и кошелёк", icon: Wallet },
  { href: "/team", label: "Команда", icon: Users },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
];

const bottomNav: NavItem[] = [
  { href: "/invites", label: "Инвайты", icon: Ticket },
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/notifications", label: "Уведомления", icon: Bell },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, workspace, active_workspace } = useAuth();
  const workspaceId = active_workspace?.id ?? workspace?.id ?? "none";
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/auth/login");
    router.refresh();
  }

  const displayName = user.name?.trim() || user.email;
  const initials = (user.name || user.email)
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <GenerationJobSync />
      <VideoGenerationJobSync />
      <GenerationCompleteToast />
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200",
          collapsed ? "w-[4.25rem]" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="truncate text-base font-semibold tracking-tight">
              Postilka
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <div
          className={cn(
            "space-y-2 border-b border-border",
            collapsed ? "px-2 py-2" : "px-3 py-3",
          )}
        >
          <WorkspaceSwitcher collapsed={collapsed} />
          <WalletBalanceBadge collapsed={collapsed} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3 pt-2">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-zinc-100 font-medium text-text"
                    : "text-muted hover:bg-zinc-50 hover:text-text",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          <div className="my-2 border-t border-border" />

          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-zinc-100 font-medium text-text"
                    : "text-muted hover:bg-zinc-50 hover:text-text",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          {user.is_platform_admin && !collapsed && (
            <Link
              href="/admin/users"
              className="mb-2 block rounded-md px-2.5 py-1.5 text-xs text-accent hover:underline"
            >
              Админка платформы
            </Link>
          )}
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2",
              collapsed && "justify-center",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-text">
              {initials || "?"}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
                  title="Выйти"
                  aria-label="Выйти"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 flex w-full items-center justify-center rounded-md p-2 text-muted hover:bg-zinc-100 hover:text-text"
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <EmailVerificationBanner />
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div
            key={workspaceId}
            className={cn(
              "mx-auto px-4 py-6 sm:px-6 lg:px-8",
              isActive(pathname, "/files") || isActive(pathname, "/settings")
                ? "max-w-none"
                : "max-w-7xl",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
