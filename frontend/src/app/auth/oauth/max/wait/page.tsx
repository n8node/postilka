import { Suspense } from "react";
import { MaxOAuthWaitContent } from "@/components/auth/MaxOAuthWaitContent";

export default function MaxOAuthWaitPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center text-sm text-muted">Загрузка…</p>}>
      <MaxOAuthWaitContent />
    </Suspense>
  );
}
