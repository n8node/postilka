import { Suspense } from "react";
import { PlansWalletPage } from "@/components/billing/PlansWalletPage";

export default function PlansPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
      <PlansWalletPage />
    </Suspense>
  );
}
