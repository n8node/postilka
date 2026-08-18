import { Suspense } from "react";
import { AdminSupportPage } from "@/components/admin/AdminSupportPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Загрузка…</div>}>
      <AdminSupportPage />
    </Suspense>
  );
}
