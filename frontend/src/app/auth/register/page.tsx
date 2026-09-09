import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Регистрация</h2>
      </div>
      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
