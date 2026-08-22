"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, Package, Zap } from "lucide-react";
import {
  ApiError,
  billingPackageCheckout,
  billingSetAutoRenew,
  billingSubscribeCheckout,
  billingSwitchFree,
  fetchBillingOverview,
  fetchBillingPaymentHistory,
  fetchBillingPlans,
  fetchSubscribePreview,
  fetchTokenPackages,
  type BillingOverview,
  type BillingPeriod,
  type PaymentHistoryItem,
  type Plan,
  type SubscribePreview,
  type TokenPackage,
} from "@/lib/api";
import { AIUsageHistoryList } from "@/components/billing/AIUsageHistoryList";
import { fetchGenerationUsageHistory, type AIUsageHistoryItem } from "@/lib/generation-api";
import { cn } from "@/lib/utils";

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatTokenCount(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatQuota(v: number | null | undefined) {
  if (v == null) return "∞";
  return String(v);
}

function formatPaymentDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPeriodEnd(value?: string) {
  if (!value) return "в конце периода";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function planFeatures(plan: Plan): string[] {
  const items: string[] = [];
  if (plan.is_free) {
    items.push("Базовые возможности кабинета");
  }
  items.push(`Каналы — ${formatQuota(plan.max_channels)}`);
  items.push(`Посты / период — ${formatQuota(plan.max_posts_per_period)}`);
  items.push(`Текстовые кредиты — ${formatQuota(plan.ai_text_tokens_quota)}`);
  items.push(`Медиа-кредиты — ${formatQuota(plan.ai_media_credits_quota)}`);
  items.push(`Процессы — ${formatQuota(plan.max_workflows)}`);
  if (plan.push_on_ready) {
    items.push("Пуш по готовности процесса");
  }
  if (plan.storage_bytes != null) {
    items.push(`Хранилище — ${Math.round(plan.storage_bytes / (1024 ** 3))} ГБ`);
  } else {
    items.push("Хранилище — без лимита");
  }
  return items;
}

function planPriceLabel(plan: Plan, period: BillingPeriod, preview?: SubscribePreview) {
  if (plan.is_free) return "0 ₽";
  if (preview?.amount_due_cents != null && preview.amount_due_cents >= 0) {
    return formatRub(preview.amount_due_cents);
  }
  const cents = period === "yearly" ? plan.price_yearly_cents : plan.price_monthly_cents;
  return formatRub(cents ?? 0);
}

/** Popular plan is pinned to the second slot; others keep sort_order. */
function sortPlansForDisplay(plans: Plan[]): Plan[] {
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);
  const popularIndex = sorted.findIndex((p) => p.is_popular);
  if (popularIndex === -1 || sorted.length <= 1) return sorted;

  const popular = sorted[popularIndex];
  const rest = sorted.filter((_, index) => index !== popularIndex);
  const insertAt = Math.min(1, rest.length);
  rest.splice(insertAt, 0, popular);
  return rest;
}

export function PlansWalletPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsageHistoryItem[]>([]);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutTarget, setCheckoutTarget] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, SubscribePreview>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const displayPlans = useMemo(() => sortPlansForDisplay(plans), [plans]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, pl, pkgs, hist, usage] = await Promise.all([
        fetchBillingOverview(),
        fetchBillingPlans(),
        fetchTokenPackages(),
        fetchBillingPaymentHistory(),
        fetchGenerationUsageHistory(50),
      ]);
      setOverview(ov);
      setPlans(pl.plans.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order));
      setPackages(pkgs.packages ?? []);
      setHistory(hist.items ?? []);
      setAiUsage(usage.items ?? []);
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
    if (!overview?.workspace_id || plans.length === 0) return;
    void (async () => {
      const next: Record<string, SubscribePreview> = {};
      await Promise.all(
        plans.filter((p) => !p.is_free).map(async (plan) => {
          try {
            next[plan.id] = await fetchSubscribePreview({
              plan_id: plan.id,
              billing_period: period,
              workspace_id: overview.workspace_id,
            });
          } catch {
            /* ignore */
          }
        }),
      );
      setPreviews(next);
    })();
  }, [overview?.workspace_id, plans, period]);

  const currentPlanId = overview?.plan?.id;
  const paymentsEnabled = overview?.payments_enabled ?? false;
  const balance = overview?.token_balance;

  const paymentNotice = useMemo(() => {
    if (searchParams.get("payment") === "success") {
      return "Оплата принята. Тариф или кредиты обновятся после подтверждения Robokassa.";
    }
    if (searchParams.get("payment") === "failed") {
      return "Оплата не завершена. Попробуйте снова.";
    }
    return null;
  }, [searchParams]);

  async function startCheckout(target: string, action: () => Promise<{ checkout_url: string }>) {
    setCheckoutTarget(target);
    setCheckoutError(null);
    try {
      const result = await action();
      window.location.href = result.checkout_url;
    } catch (e) {
      setCheckoutError(e instanceof ApiError ? e.message : "Не удалось начать оплату");
      setCheckoutTarget(null);
    }
  }

  async function handleToggleAutoRenew() {
    if (!overview?.subscription) return;
    setBusy("auto-renew");
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

  async function handleSwitchFree() {
    if (!overview?.workspace_id) return;
    setBusy("free");
    try {
      await billingSwitchFree({ workspace_id: overview.workspace_id });
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось переключить тариф");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Загрузка…</p>;
  }

  return (
    <div>
      <h2 className="mb-1.5 text-lg font-semibold text-text">Тарифные планы</h2>
      <p className="mb-5 text-sm text-muted">
        Ваш текущий план:{" "}
        <strong className="font-medium text-text">{overview?.plan?.name ?? "—"}</strong>
        {paymentsEnabled
          ? ". Оплата тарифов и пакетов медиа-кредитов — через Robokassa."
          : ". Оплата временно недоступна — администратор ещё не включил Robokassa."}
      </p>

      {paymentNotice && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {paymentNotice}
        </p>
      )}
      {checkoutError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {checkoutError}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {balance && (
        <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-teal-800">
                <Zap className="h-3.5 w-3.5 text-teal-600" />
                Баланс текстовых кредитов
              </p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {balance.unlimited ? "∞" : formatTokenCount(balance.total_remaining)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {balance.unlimited
                  ? "Текстовые кредиты без лимита"
                  : `${formatTokenCount(balance.plan_tokens_remaining)} текстовых кредитов из тарифа`}
                {!balance.unlimited && balance.purchased_tokens_remaining > 0 &&
                  ` · ${formatTokenCount(balance.purchased_tokens_remaining)} докуплено`}
              </p>
            </div>
            {!balance.unlimited && (
              <p className="max-w-sm text-xs text-muted">
                Текстовые кредиты тарифа обновятся {formatPeriodEnd(balance.plan_period_end)} и сгорят, если не
                использованы. Докупленные не сгорают.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted">Период оплаты:</span>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["monthly", "yearly"] as BillingPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1 text-sm",
                period === p ? "bg-zinc-100 font-medium text-text" : "text-muted hover:text-text",
              )}
            >
              {p === "monthly" ? "Месяц" : "Год"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {displayPlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isPopular = plan.is_popular;
          const preview = previews[plan.id];
          const paidPlan = !plan.is_free && (plan.price_monthly_cents ?? 0) > 0;
          const canBuy = paymentsEnabled && !isCurrent && paidPlan;
          const checkoutKey = `plan:${plan.id}`;
          const isCheckingOut = checkoutTarget === checkoutKey;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl p-4 shadow-sm",
                isCurrent
                  ? "border-2 border-teal-500 bg-surface"
                  : isPopular
                    ? "z-[1] border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-surface shadow-md shadow-amber-100/80 xl:-translate-y-1"
                    : "border border-border bg-surface",
              )}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-medium text-teal-800">
                  Текущий план
                </span>
              )}
              {!isCurrent && isPopular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                  Популярный
                </span>
              )}
              {isCurrent && isPopular && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                  Популярный
                </span>
              )}
              <div className="mb-1.5 text-sm font-semibold text-text">{plan.name}</div>
              <div className="mb-3.5">
                <span className="text-2xl font-semibold text-text">
                  {planPriceLabel(plan, period, preview)}
                </span>
                {paidPlan && <span className="text-xs text-muted">/{period === "yearly" ? "год" : "мес"}</span>}
              </div>
              {plan.description && (
                <p className="mb-3 text-xs text-muted">{plan.description}</p>
              )}
              <div className="mb-4 flex flex-1 flex-col gap-2">
                {planFeatures(plan).map((feature) => (
                  <div key={feature} className="flex items-start gap-1.5 text-xs text-muted">
                    <Check className="mt-px h-3.5 w-3.5 shrink-0 text-teal-600" />
                    {feature}
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={isCurrent || isCheckingOut || (!canBuy && !isCurrent && paidPlan)}
                onClick={() => {
                  if (!canBuy) return;
                  void startCheckout(checkoutKey, () =>
                    billingSubscribeCheckout({
                      plan_id: plan.id,
                      billing_period: period,
                      workspace_id: overview?.workspace_id,
                    }),
                  );
                }}
                className={cn(
                  "h-9 w-full rounded-lg text-sm font-medium",
                  isCurrent
                    ? "cursor-default border border-border bg-zinc-50 text-muted"
                    : canBuy
                      ? isPopular
                        ? "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                        : "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
                      : "cursor-default border border-border bg-zinc-50 text-muted",
                )}
              >
                {isCurrent
                  ? "Активен"
                  : isCheckingOut
                    ? "Переход…"
                    : canBuy
                      ? "Оплатить"
                      : plan.is_free
                        ? "Бесплатно"
                        : "Недоступно"}
              </button>
            </div>
          );
        })}
      </div>

      {overview?.subscription && !overview.plan?.is_free && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={overview.subscription.auto_renew}
              disabled={busy !== null}
              onChange={() => void handleToggleAutoRenew()}
              className="rounded border-border"
            />
            <span>Автопродление с кошелька</span>
          </label>
          <p className="mt-2 text-xs text-muted">
            Период до {formatPaymentDate(overview.subscription.period_end)}. При истечении спишем
            стоимость тарифа с кошелька ({formatRub(overview.wallet_balance_cents)}).
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleSwitchFree()}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
          >
            Перейти на бесплатный
          </button>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-1 text-base font-semibold text-text">Дополнительные пакеты медиа-кредитов</h3>
        <p className="mb-4 text-sm text-muted">
          Сначала расходуются медиа-кредиты тарифа, затем докупленные. Докупленные медиа-кредиты не сгорают.
        </p>
        {packages.length === 0 ? (
          <p className="text-sm text-muted">Пакеты пока недоступны.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => {
              const checkoutKey = `package:${pkg.id}`;
              const isCheckingOut = checkoutTarget === checkoutKey;
              const canBuy = paymentsEnabled && pkg.price_cents > 0;
              return (
                <div
                  key={pkg.id}
                  className="flex flex-col rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-teal-700">
                    <Package className="h-4 w-4" />
                    <span className="text-sm font-semibold text-text">{pkg.name}</span>
                  </div>
                  <p className="text-2xl font-semibold text-text">
                    {formatTokenCount(pkg.tokens)}
                    <span className="ml-1 text-xs font-normal text-muted">медиа-кредитов</span>
                  </p>
                  <p className="mt-2 text-sm font-medium text-text">{formatRub(pkg.price_cents)}</p>
                  <button
                    type="button"
                    disabled={!canBuy || isCheckingOut}
                    onClick={() => {
                      if (!canBuy) return;
                      void startCheckout(checkoutKey, () => billingPackageCheckout(pkg.id));
                    }}
                    className={cn(
                      "mt-4 h-9 w-full rounded-lg text-sm font-medium",
                      canBuy
                        ? "bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
                        : "cursor-default border border-border bg-zinc-50 text-muted",
                    )}
                  >
                    {isCheckingOut ? "Переход…" : canBuy ? "Купить" : "Недоступно"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <CreditCard className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-text">История платежей</h3>
        </div>
        {!paymentsEnabled ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            История появится после включения Robokassa в админке.
          </p>
        ) : history.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Платежей пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Описание</th>
                  <th className="px-4 py-2.5">Дата</th>
                  <th className="px-4 py-2.5">Статус</th>
                  <th className="px-4 py-2.5 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{item.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatPaymentDate(item.paid_at ?? item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.status === "paid"
                        ? "Оплачен"
                        : item.status === "pending"
                          ? "Ожидает"
                          : item.status}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-text">
                      {formatRub(item.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-base font-semibold text-text">История списаний AI</h3>
        <AIUsageHistoryList items={aiUsage} />
      </div>
    </div>
  );
}
