import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function ForgotPasswordSentPage({ searchParams }: PageProps) {
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
          Если аккаунт с таким email существует, мы отправили письмо
          {email ? (
            <>
              {" "}
              на <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            " на указанный адрес"
          )}
          .
        </p>
      </div>

      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Откройте письмо и нажмите кнопку{" "}
            <span className="font-medium text-foreground">
              «Восстановить пароль»
            </span>{" "}
            или перейдите по текстовой ссылке в письме.
          </p>
          <p>Ссылка действительна 1 час.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            Вернуться ко входу
          </Link>
          <Link
            href="/auth/forgot-password"
            className="text-center text-sm text-accent hover:underline"
          >
            Отправить ссылку снова
          </Link>
        </div>
      </div>
    </main>
  );
}
