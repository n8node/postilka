import Link from "next/link";
import { CheckEmailResend } from "@/components/auth/CheckEmailResend";

type PageProps = {
  searchParams: Promise<{ email?: string; next?: string; workspace_invite?: string }>;
};

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  return (
    <main className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Проверьте почту
        </h2>
        <p className="mt-2 text-sm text-muted">
          Мы отправили письмо со ссылкой для подтверждения email
          {email ? (
            <>
              {" "}
              на <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            " на указанный email"
          )}
          .
        </p>
      </div>

      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Откройте письмо и нажмите кнопку{" "}
            <span className="font-medium text-foreground">
              «Подтвердить email»
            </span>{" "}
            или перейдите по текстовой ссылке в письме.
          </p>
          <p>
            В кабинет можно войти сразу. Пока email не подтверждён, нельзя
            публиковать посты, пополнять счёт и оплачивать тариф.
          </p>
        </div>

        <CheckEmailResend email={email} />

        <div className="mt-4">
          <Link
            href={
              email
                ? `/auth/login?email=${encodeURIComponent(email)}`
                : "/auth/login"
            }
            className="block text-center text-sm text-accent hover:underline"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    </main>
  );
}
