"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  PenSquare,
  CalendarDays,
  ImageIcon,
  GitBranch,
  Wallet,
  Users,
  BarChart3,
  Settings,
  Bell,
  Headphones,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { logout, isPlaceholderLoginEmail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { EmailVerificationBanner } from "@/components/layout/EmailVerificationBanner";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { SupportWidget } from "@/components/support/SupportWidget";
import { HelpLauncher } from "@/components/help/HelpDrawer";
import { WalletBalanceBadge } from "@/components/billing/WalletBalanceBadge";
import { GenerationNavBlock } from "@/components/layout/GenerationNavBlock";
import { GenerationCompleteToast } from "@/components/generation/GenerationCompleteToast";
import { GenerationJobSync } from "@/components/generation/GenerationJobSync";
import { VideoGenerationJobSync } from "@/components/generation/VideoGenerationJobSync";
import { SketchJobSync } from "@/components/sketch/SketchJobSync";
import { cn } from "@/lib/utils";
import { userAvatarSrc } from "@/lib/user-avatar";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/channels", label: "Каналы", icon: Radio },
  { href: "/posts", label: "Посты", icon: PenSquare },
  // Hidden until agents return: { href: "/missions", label: "Ai агенты", icon: Bot },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/files", label: "Файлы", icon: ImageIcon },
  { href: "/workflows", label: "Процессы", icon: GitBranch },
  { href: "/plans", label: "Тарифные планы", icon: Wallet },
  { href: "/team", label: "Команда", icon: Users },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/support", label: "Поддержка", icon: Headphones },
];

const bottomNav: NavItem[] = [
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/notifications", label: "Уведомления", icon: Bell },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isPostComposerPath(pathname: string) {
  return pathname === "/posts/new" || /^\/posts\/[^/]+$/.test(pathname);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, workspace, active_workspace } = useAuth();
  const workspaceId = active_workspace?.id ?? workspace?.id ?? "none";
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setCollapsed(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/auth/login");
    router.refresh();
  }

  const displayEmail = isPlaceholderLoginEmail(user.email)
    ? user.pending_email?.trim() || "Email не указан"
    : user.email;
  const displayName = user.name?.trim() || (isPlaceholderLoginEmail(user.email) ? "Пользователь" : user.email);
  const initials = (user.name || (isPlaceholderLoginEmail(user.email) ? "П" : user.email))
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const avatarSrc = userAvatarSrc(user);

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <GenerationJobSync />
      <VideoGenerationJobSync />
      <SketchJobSync />
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
          <Suspense fallback={null}>
            <GenerationNavBlock collapsed={collapsed} />
          </Suspense>

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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-xs font-semibold text-text">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                initials || "?"
              )}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted">{displayEmail}</p>
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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur-md sm:px-6">
          <Suspense fallback={null}>
            <HelpLauncher />
          </Suspense>
          <SupportWidget />
          <NotificationsBell />
        </header>
        <EmailVerificationBanner />
        <main
          className={cn(
            "min-w-0 flex-1",
            isActive(pathname, "/posts") ||
            isActive(pathname, "/ai") ||
            isActive(pathname, "/workflows") ||
            isActive(pathname, "/calendar") ||
            isActive(pathname, "/support")
              ? "overflow-x-visible"
              : "overflow-x-clip",
          )}
        >
          <div
            key={workspaceId}
            className={cn(
              "mx-auto",
              pathname === "/dashboard" ||
              pathname === "/calendar" ||
              pathname.startsWith("/workflows/")
                ? "max-w-none p-0 sm:p-0 lg:p-0"
                : isActive(pathname, "/workflows") ||
                  isActive(pathname, "/files") ||
                  isActive(pathname, "/settings") ||
                  isActive(pathname, "/ai") ||
                  isActive(pathname, "/team") ||
                  isActive(pathname, "/channels") ||
                  isActive(pathname, "/support") ||
                  isPostComposerPath(pathname)
                ? "max-w-none px-4 py-6 sm:px-6 lg:px-8"
                : "max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
