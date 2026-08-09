"use client";

import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, fetchBillingOverview } from "@/lib/api";
import { WalletTopupModal } from "@/components/billing/WalletTopupModal";
import { cn } from "@/lib/utils";

function formatRubShort(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function WalletBalanceBadge({ collapsed }: { collapsed: boolean }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchBillingOverview()
      .then((data) => setBalance(data.wallet_balance_cents))
      .catch((e) => {
        if (!(e instanceof ApiError)) {
          /* ignore */
        }
      });
  }, []);

  if (balance == null) return null;

  if (collapsed) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border bg-zinc-50 text-muted hover:bg-zinc-100 hover:text-text"
          title={`Кошелёк: ${formatRubShort(balance)}`}
          aria-label="Кошелёк"
        >
          <Wallet className="h-4 w-4" />
        </button>
        <WalletTopupModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onBalanceChange={setBalance}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "w-full rounded-md border border-border bg-zinc-50 px-2.5 py-2 text-left text-xs",
          "transition-colors hover:bg-zinc-100",
        )}
      >
        <span className="text-muted">Кошелёк</span>
        <span className="mt-0.5 block font-semibold text-text">
          {formatRubShort(balance)}
        </span>
      </button>
      <WalletTopupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onBalanceChange={setBalance}
      />
    </>
  );
}
