import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Новый пароль
        </h2>
      </div>
      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
