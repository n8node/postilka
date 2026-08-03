import Link from "next/link";
import { getMe } from "@/lib/auth-server";

export default async function DashboardPage() {
  const me = await getMe();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Добро пожаловать{me?.user.name ? `, ${me.user.name}` : ""}
        </h1>
        <p className="mt-2 text-muted">
          Workspace готов. Следующий шаг — подключить каналы и создать первый пост.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="text-sm font-medium text-muted">Каналы</h2>
          <p className="mt-2 text-2xl font-semibold">0</p>
          <p className="mt-1 text-sm text-muted">Волна 3</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="text-sm font-medium text-muted">Запланировано</h2>
          <p className="mt-2 text-2xl font-semibold">0</p>
          <p className="mt-1 text-sm text-muted">Волна 4–5</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-surface p-5">
          <h2 className="text-sm font-medium text-muted">Workspace</h2>
          <p className="mt-2 text-lg font-semibold">{me?.workspace?.name ?? "—"}</p>
          <p className="mt-1 text-sm text-muted">{me?.workspace?.slug}</p>
        </section>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-surface p-6">
        <h2 className="font-medium">Онбординг</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>✅ Аккаунт и workspace</li>
          <li>⏳ Подключить Telegram / VK</li>
          <li>⏳ Создать первый пост</li>
        </ol>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          На главную WordPress →
        </Link>
      </div>
    </div>
  );
}
