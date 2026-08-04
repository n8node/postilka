import Link from "next/link";
import { getMe } from "@/lib/auth-server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StubBadge } from "@/components/layout/StubBadge";

export default async function DashboardPage() {
  const me = await getMe();

  return (
    <div>
      <PageHeader
        title={`Добро пожаловать${me?.user.name ? `, ${me.user.name}` : ""}`}
        crumbs={[{ label: "Главная" }]}
        description="Workspace готов. Подключите каналы и создайте первый пост."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Каналы", value: "0", hint: "Волна 3", href: "/channels" },
          { label: "Запланировано", value: "0", hint: "Волна 4–5", href: "/calendar" },
          { label: "Опубликовано", value: "0", hint: "Волна 4", href: "/posts" },
          { label: "Баланс", value: "0 ₽", hint: "Волна 6", href: "/plans" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-zinc-300"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-muted">{card.label}</h2>
              <StubBadge />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Онбординг</h2>
          <StubBadge label="Макет" />
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li className="text-text">
            Аккаунт и workspace
            {me?.workspace?.name ? ` — ${me.workspace.name}` : ""}
          </li>
          <li>Подключить Telegram / VK</li>
          <li>Создать первый пост</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/channels" className="font-medium text-accent hover:underline">
            К каналам →
          </Link>
          <Link href="/posts" className="text-muted hover:text-text hover:underline">
            К постам →
          </Link>
        </div>
      </section>
    </div>
  );
}
