"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, fetchBillingOverview } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatTokenCount(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function WalletBalanceBadge({ collapsed }: { collapsed: boolean }) {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    fetchBillingOverview()
      .then((data) => setTotal(data.token_balance?.total_remaining ?? 0))
      .catch((e) => {
        if (!(e instanceof ApiError)) {
          /* ignore */
        }
      });
  }, []);

  if (total == null) return null;

  if (collapsed) {
    return (
      <Link
        href="/plans"
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border bg-zinc-50 text-muted hover:bg-zinc-100 hover:text-text"
        title={`Токены: ${formatTokenCount(total)}`}
        aria-label="Токены"
      >
        <Zap className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <Link
      href="/plans"
      className={cn(
        "block w-full rounded-md border border-border bg-zinc-50 px-2.5 py-2 text-left text-xs transition-colors hover:bg-zinc-100",
      )}
    >
      <span className="text-muted">Токены</span>
      <span className="mt-0.5 block font-semibold text-text">{formatTokenCount(total)}</span>
    </Link>
  );
}
