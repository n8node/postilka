import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="w-full">
      <div className="mb-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Восстановление пароля
        </h2>
      </div>
      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
