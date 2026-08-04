"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, workspace } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="text-lg font-semibold">
              Postilka
            </Link>
            {workspace && (
              <p className="text-xs text-muted">{workspace.name}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            {user.is_platform_admin && (
              <Link href="/admin/users" className="text-accent hover:underline">
                Админка
              </Link>
            )}
            <span className="text-muted">{user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-accent hover:underline"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
