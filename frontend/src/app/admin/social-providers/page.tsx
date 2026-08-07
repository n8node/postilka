import { Suspense } from "react";
import { AdminSocialProvidersPage } from "@/components/admin/AdminSocialProvidersPage";

export default function AdminSocialProvidersRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Загрузка…</p>}>
      <AdminSocialProvidersPage />
    </Suspense>
  );
}
