import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Проверьте почту
        </h1>
        <p className="mt-2 text-sm text-muted">
          Мы отправили письмо со ссылкой для подтверждения регистрации
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
              «Подтвердить регистрацию»
            </span>{" "}
            или перейдите по текстовой ссылке в письме.
          </p>
          <p>
            После подтверждения вы сможете пользоваться сервисом без
            ограничений.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            Перейти в приложение
          </Link>
          <Link
            href="/auth/login"
            className="text-center text-sm text-accent hover:underline"
          >
            Войти с другим аккаунтом
          </Link>
        </div>
      </div>
    </main>
  );
}
