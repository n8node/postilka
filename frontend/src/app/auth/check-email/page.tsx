import Link from "next/link";
import { CheckEmailResend } from "@/components/auth/CheckEmailResend";

type PageProps = {
  searchParams: Promise<{ email?: string; next?: string; workspace_invite?: string }>;
};

export default async function CheckEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";
  const nextPath = params.next?.trim() ?? "";
  const isWorkspaceInvite = params.workspace_invite === "1";

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
            После подтверждения вы сможете войти в Postilka и пользоваться
            сервисом.
          </p>
          {isWorkspaceInvite && (
            <p>
              Затем мы вернём вас к принятию приглашения в воркфлоу.
            </p>
          )}
        </div>

        <CheckEmailResend email={email} />

        <div className="mt-4">
          <Link
            href={
              nextPath
                ? `/auth/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextPath)}`
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
