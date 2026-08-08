import { Suspense } from "react";
import { AdminFilesPage } from "@/components/admin/AdminFilesPage";

export default function AdminFilesRoutePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-slate-500">Загрузка…</p>
      }
    >
      <AdminFilesPage />
    </Suspense>
  );
}
