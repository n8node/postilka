"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ApiError, fetchBillingOverview } from "@/lib/api";
import { useBillingBalancesStore } from "@/lib/billing-balances-store";
import { formatRubFromCents, formatTokenCount } from "@/lib/billing-format";
import { cn } from "@/lib/utils";

export function WalletBalanceBadge({ collapsed }: { collapsed: boolean }) {
  const balances = useBillingBalancesStore((s) => s.balances);
  const setFromOverview = useBillingBalancesStore((s) => s.setFromOverview);

  useEffect(() => {
    fetchBillingOverview()
      .then(setFromOverview)
      .catch((e) => {
        if (!(e instanceof ApiError)) {
          /* ignore */
        }
      });
  }, [setFromOverview]);

  if (!balances) return null;

  const textLabel = balances.textUnlimited
    ? "∞"
    : balances.textAllowance != null
      ? `${formatTokenCount(balances.textRemaining)} / ${formatTokenCount(balances.textAllowance)}`
      : formatTokenCount(balances.textRemaining);
  const mediaLabel = balances.mediaUnlimited
    ? "∞"
    : balances.mediaQuotaAllowance != null
      ? `${formatTokenCount(balances.mediaQuotaRemaining ?? 0)} / ${formatTokenCount(balances.mediaQuotaAllowance)}`
      : formatTokenCount(balances.mediaQuotaRemaining ?? 0);
  const walletLabel = formatRubFromCents(balances.walletCents);
  const title = `Кошелёк ${walletLabel} · текст ${textLabel} · медиа ${mediaLabel}`;

  if (collapsed) {
    return (
      <Link
        href="/plans"
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border bg-zinc-50 text-muted hover:bg-zinc-100 hover:text-text"
        title={title}
        aria-label="Кошелёк и кредиты"
      >
        <Wallet className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <Link
      href="/plans"
      className={cn(
        "block w-full rounded-md border border-border bg-zinc-50 px-2.5 py-2 text-left text-xs transition-colors hover:bg-zinc-100",
      )}
      title={title}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-muted">Кошелёк</span>
        <span className="font-semibold tabular-nums text-text">{walletLabel}</span>
      </span>
      <span className="mt-1 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted">Текст</span>
        <span className="tabular-nums font-medium text-text">{textLabel}</span>
      </span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted">Медиа</span>
        <span className="tabular-nums font-medium text-text">{mediaLabel}</span>
      </span>
    </Link>
  );
}
