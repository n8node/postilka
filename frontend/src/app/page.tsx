import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Автопостинг и календарь публикаций
        </h1>
        <p className="mt-3 text-muted">
          Планируйте публикации в VK, Telegram и других сетях из одного места.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/auth/register"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Начать бесплатно
        </Link>
        <Link
          href="/auth/login"
          className="rounded-lg border border-slate-200 bg-surface px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
        >
          Войти
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-200 bg-surface px-5 py-2.5 text-sm font-medium hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>

      <p className="text-sm text-muted">
        Маркетинговый сайт — на{" "}
        <a
          href={
            process.env.NEXT_PUBLIC_SITE_URL ??
            "https://postilka.ru"
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-2 hover:underline"
        >
          postilka.ru
        </a>
        .
      </p>
    </main>
  );
}
