"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  billingSetAutoRenew,
  billingSubscribeCheckout,
  billingSwitchFree,
  billingWalletTopup,
  fetchBillingOverview,
  fetchBillingPaymentHistory,
  fetchBillingPlans,
  fetchSubscribePreview,
  type BillingOverview,
  type BillingPeriod,
  type PaymentHistoryItem,
  type Plan,
  type SubscribePreview,
} from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatQuota(v: number | null | undefined) {
  if (v == null) return "∞";
  return String(v);
}

function formatStorageGb(bytes: number | null | undefined) {
  if (bytes == null) return "∞";
  return String(Math.round(bytes / (1024 * 1024 * 1024)));
}

function formatYesNo(value: boolean) {
  return value ? "Да" : "Нет";
}

export function PlansWalletPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [topupRub, setTopupRub] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, SubscribePreview>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, pl, hist] = await Promise.all([
        fetchBillingOverview(),
        fetchBillingPlans(),
        fetchBillingPaymentHistory(),
      ]);
      setOverview(ov);
      setPlans(pl.plans.filter((p) => p.is_active && !p.is_free));
      setHistory(hist.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") setNotice("Оплата принята. Обновление может занять несколько секунд.");
    if (payment === "failed") setNotice("Оплата не завершена.");
  }, [searchParams]);

  useEffect(() => {
    if (!overview?.workspace_id || plans.length === 0) return;
    void (async () => {
      const next: Record<string, SubscribePreview> = {};
      await Promise.all(
        plans.map(async (plan) => {
          try {
            next[plan.id] = await fetchSubscribePreview({
              plan_id: plan.id,
              billing_period: period,
              workspace_id: overview.workspace_id,
            });
          } catch {
            /* ignore preview errors */
          }
        }),
      );
      setPreviews(next);
    })();
  }, [overview?.workspace_id, plans, period]);

  async function handleToggleAutoRenew() {
    if (!overview?.subscription) return;
    setBusy("auto-renew");
    setError(null);
    try {
      await billingSetAutoRenew({
        workspace_id: overview.workspace_id,
        auto_renew: !overview.subscription.auto_renew,
      });
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось обновить автопродление");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubscribe(planId: string) {
    setBusy(planId);
    setError(null);
    try {
      const result = await billingSubscribeCheckout({
        plan_id: planId,
        billing_period: period,
        workspace_id: overview?.workspace_id,
      });
      window.location.href = result.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось начать оплату");
      setBusy(null);
    }
  }

  async function handleTopup() {
    const rub = Number(topupRub.replace(",", "."));
    if (!Number.isFinite(rub) || rub <= 0) {
      setError("Укажите сумму пополнения в рублях");
      return;
    }
    const amountCents = Math.round(rub * 100);
    setBusy("topup");
    setError(null);
    try {
      const result = await billingWalletTopup({ amount_cents: amountCents });
      window.location.href = result.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось начать пополнение");
      setBusy(null);
    }
  }

  async function handleSwitchFree() {
    if (!overview?.workspace_id) return;
    setBusy("free");
    setError(null);
    try {
      await billingSwitchFree({ workspace_id: overview.workspace_id });
      await reload();
      setNotice("Переключено на бесплатный тариф");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось переключить тариф");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Загрузка…</p>;
  }

  const currentPlan = overview?.plan;

  return (
    <div>
      <PageHeader
        title="Тариф и кошелёк"
        description="Подписка workspace (entitlements) и отдельный баланс ₽ для overage AI."
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Текущий тариф</h2>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium">
              {currentPlan?.name ?? "—"}
            </span>
          </div>
          {currentPlan && (
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>Каналы — {formatQuota(currentPlan.max_channels)}</li>
              <li>
                Посты / период — {overview?.usage.posts_used ?? 0} /{" "}
                {formatQuota(currentPlan.max_posts_per_period)}
              </li>
              <li>
                AI-токены в тарифе — {overview?.usage.ai_text_tokens_used ?? 0} /{" "}
                {formatQuota(currentPlan.ai_text_tokens_quota)}
              </li>
              <li>
                Медиа-кредиты — {overview?.usage.ai_media_credits_used ?? 0} /{" "}
                {formatQuota(currentPlan.ai_media_credits_quota)}
              </li>
              <li>Хранилище — {formatStorageGb(currentPlan.storage_bytes)} ГБ</li>
              <li>Воркфлоу — {formatQuota(currentPlan.max_workflows)}</li>
              <li>
                Приглашения в воркфлоу — {formatQuota(currentPlan.max_workflow_invites)}
              </li>
              <li>Пуш по готовности — {formatYesNo(currentPlan.push_on_ready)}</li>
            </ul>
          )}
          {overview?.subscription && !currentPlan?.is_free && (
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <p className="text-muted">
                Период до{" "}
                <span className="font-medium text-text">
                  {new Date(overview.subscription.period_end).toLocaleDateString("ru-RU")}
                </span>
                {overview.subscription.status === "past_due" && (
                  <span className="ml-2 text-amber-700">· просрочена</span>
                )}
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={overview.subscription.auto_renew}
                  disabled={busy !== null}
                  onChange={handleToggleAutoRenew}
                  className="rounded border-border"
                />
                <span>Автопродление с кошелька</span>
              </label>
              <p className="text-xs text-muted">
                При истечении периода спишем стоимость тарифа с вашего кошелька. Grace 72 ч,
                затем переход на free.
              </p>
            </div>
          )}
          {!overview?.payments_enabled && (
            <p className="mt-4 text-sm text-amber-700">
              Оплата временно недоступна — настройте Robokassa в админке.
            </p>
          )}
          {currentPlan && !currentPlan.is_free && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleSwitchFree}
              className="mt-5 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              Перейти на бесплатный
            </button>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">Кошелёк</h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {formatRub(overview?.wallet_balance_cents ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Пополнение для докупки AI. Не смешивается с тарифом.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              min={1}
              placeholder={`от ${formatRub(overview?.wallet_topup_min_cents ?? 10000)}`}
              value={topupRub}
              onChange={(e) => setTopupRub(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!overview?.payments_enabled || busy !== null}
              onClick={handleTopup}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              Пополнить
            </button>
          </div>
        </section>
      </div>

      {plans.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Доступные тарифы</h2>
            <div className="flex rounded-md border border-border p-0.5 text-sm">
              {(["monthly", "yearly"] as BillingPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "rounded px-3 py-1",
                    period === p ? "bg-zinc-100 font-medium" : "text-muted",
                  )}
                >
                  {p === "monthly" ? "Месяц" : "Год"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const price =
                period === "monthly" ? plan.price_monthly_cents : plan.price_yearly_cents;
              const isCurrent = currentPlan?.id === plan.id;
              const preview = previews[plan.id];
              const due = preview?.amount_due_cents;
              return (
                <article
                  key={plan.id}
                  className={cn(
                    "rounded-xl border bg-surface p-5 shadow-sm",
                    plan.is_popular ? "border-accent" : "border-border",
                  )}
                >
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted">{plan.description}</p>
                  <p className="mt-4 text-2xl font-semibold">
                    {due != null && preview?.prorate_credit_cents
                      ? formatRub(due)
                      : price != null
                        ? formatRub(price)
                        : "—"}
                    <span className="text-sm font-normal text-muted">
                      /{period === "monthly" ? "мес" : "год"}
                    </span>
                  </p>
                  {preview && preview.prorate_credit_cents > 0 && (
                    <p className="mt-1 text-xs text-green-800">
                      Перерасчёт −{formatRub(preview.prorate_credit_cents)} (к оплате{" "}
                      {formatRub(preview.amount_due_cents)})
                    </p>
                  )}
                  <ul className="mt-4 space-y-1 text-sm text-muted">
                    <li>Каналы — {formatQuota(plan.max_channels)}</li>
                    <li>Посты / период — {formatQuota(plan.max_posts_per_period)}</li>
                    <li>AI-токены в тарифе — {formatQuota(plan.ai_text_tokens_quota)}</li>
                    <li>Медиа-кредиты — {formatQuota(plan.ai_media_credits_quota)}</li>
                    <li>Хранилище — {formatStorageGb(plan.storage_bytes)} ГБ</li>
                    <li>Воркфлоу — {formatQuota(plan.max_workflows)}</li>
                    <li>
                      Приглашения в воркфлоу — {formatQuota(plan.max_workflow_invites)}
                    </li>
                    <li>Пуш по готовности — {formatYesNo(plan.push_on_ready)}</li>
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent || !overview?.payments_enabled || busy !== null || !price}
                    onClick={() => handleSubscribe(plan.id)}
                    className="mt-5 w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isCurrent ? "Текущий тариф" : "Оплатить"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">История платежей</h2>
          <ul className="mt-4 divide-y divide-border">
            {history.slice(0, 10).map((item) => (
              <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-muted">
                    {new Date(item.created_at).toLocaleString("ru-RU")} · {item.status}
                  </p>
                </div>
                <span className="font-medium">{formatRub(item.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
