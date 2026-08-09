import { Suspense } from "react";
import { UserSettingsPage } from "@/components/settings/UserSettingsPage";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
      <UserSettingsPage />
    </Suspense>
  );
}
