import { PageHeader } from "@/components/layout/PageHeader";
import { StubBadge } from "@/components/layout/StubBadge";

export default function PlansPage() {
  return (
    <div>
      <PageHeader
        title="Тариф и кошелёк"
        description="Подписка (entitlements) и отдельный баланс ₽ для overage AI."
        actions={<StubBadge label="Волна 6" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Текущий тариф</h2>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium">
              Free
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>Каналы — лимит тарифа</li>
            <li>Посты / период — лимит тарифа</li>
            <li>Included AI-токены — квота периода</li>
            <li>Storage — лимит тарифа</li>
          </ul>
          <button
            type="button"
            disabled
            className="mt-5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white opacity-60"
          >
            Сменить тариф
          </button>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">Кошелёк</h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight">0 ₽</p>
          <p className="mt-1 text-sm text-muted">
            Пополнение для докупки AI. Не смешивается с тарифом.
          </p>
          <button
            type="button"
            disabled
            className="mt-5 rounded-md border border-border px-3 py-2 text-sm opacity-60"
          >
            Пополнить
          </button>
        </section>
      </div>
    </div>
  );
}
