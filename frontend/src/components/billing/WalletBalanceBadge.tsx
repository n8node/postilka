"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, fetchBillingOverview } from "@/lib/api";

function formatRubShort(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function WalletBalanceBadge({ collapsed }: { collapsed: boolean }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchBillingOverview()
      .then((data) => setBalance(data.wallet_balance_cents))
      .catch((e) => {
        if (!(e instanceof ApiError)) {
          /* ignore */
        }
      });
  }, []);

  if (balance == null || collapsed) return null;

  return (
    <Link
      href="/plans"
      className="mx-2 mb-2 block rounded-md border border-border bg-zinc-50 px-2.5 py-2 text-xs hover:bg-zinc-100"
    >
      <span className="text-muted">Кошелёк</span>
      <span className="mt-0.5 block font-semibold text-text">{formatRubShort(balance)}</span>
    </Link>
  );
}
