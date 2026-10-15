"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RegistrationPendingContent() {
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") === "approval" ? "approval" : "verify-email";
  const isApprovalStage = stage === "approval";

  return (
    <main className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          {isApprovalStage ? "Заявка принята" : "Проверьте почту"}
        </h2>
      </div>
      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 text-sm leading-relaxed text-muted shadow-sm">
        {isApprovalStage ? (
          <>
            <p className="text-slate-900">Email подтверждён. Ваша заявка на вступление находится на рассмотрении.</p>
            <p className="mt-3">Мы отправим письмо, когда доступ к Postilka будет открыт.</p>
          </>
        ) : (
          <>
            <p className="text-slate-900">Мы отправили письмо со ссылкой для подтверждения email.</p>
            <p className="mt-3">Перейдите по ссылке из письма. После подтверждения ваша заявка будет передана на рассмотрение администратору.</p>
          </>
        )}
        <Link href="/auth/login" className="mt-5 inline-flex rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-white hover:bg-slate-900">Вернуться ко входу</Link>
      </div>
    </main>
  );
}

export default function RegistrationPendingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
      <RegistrationPendingContent />
    </Suspense>
  );
}