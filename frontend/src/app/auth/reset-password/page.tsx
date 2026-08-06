import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Новый пароль
        </h1>
        <p className="mt-2 text-sm text-muted">
          Задайте новый пароль для входа в аккаунт
        </p>
      </div>
      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
