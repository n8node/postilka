import { Suspense } from "react";
import { AuthWaveBackground } from "@/components/auth/AuthWaveBackground";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuthWaveBackground />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Postilka
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Вход</h1>
          <p className="mt-2 text-sm text-muted">
            Планируйте и публикуйте посты в соцсети
          </p>
        </div>
        <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
          <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
