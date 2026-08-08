import { Suspense } from "react";
import { AdminSettingsPage } from "@/components/admin/AdminSettingsPage";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Загрузка…</p>}>
      <AdminSettingsPage />
    </Suspense>
  );
}
