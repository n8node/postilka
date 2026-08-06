"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError, acceptWorkspaceInvite, previewWorkspaceInvite } from "@/lib/api";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [preview, setPreview] = useState<{
    workspace_name: string;
    email: string;
    role: string;
  } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Загрузка приглашения…" : "Ссылка недействительна",
  );

  useEffect(() => {
    if (!token) return;
    previewWorkspaceInvite(token)
      .then((data) => {
        setPreview(data);
        setStatus("ready");
        setMessage("");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Приглашение недействительно или истекло");
      });
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setStatus("loading");
    setMessage("Принимаем приглашение…");
    try {
      await acceptWorkspaceInvite(token);
      setStatus("success");
      setMessage("Вы присоединились к workspace. Переходим…");
      router.replace("/team");
      router.refresh();
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError && err.code === "invite_email_mismatch") {
        setMessage(err.message);
      } else {
        setMessage(
          err instanceof ApiError ? err.message : "Не удалось принять приглашение",
        );
      }
    }
  }

  return (
    <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
      {status === "loading" && !preview && (
        <p className="text-sm text-muted">{message}</p>
      )}

      {preview && status !== "success" && status !== "error" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Вас пригласили в workspace{" "}
            <span className="font-medium text-foreground">
              {preview.workspace_name}
            </span>{" "}
            с ролью{" "}
            <span className="font-medium text-foreground">{preview.role}</span>.
          </p>
          <p className="text-sm text-muted">
            Email приглашения:{" "}
            <span className="font-medium text-foreground">{preview.email}</span>
          </p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {status === "loading" ? "Принимаем…" : "Принять приглашение"}
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {message}
          </div>
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
            className="block text-center text-sm text-accent hover:underline"
          >
            Войти
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Приглашение в команду
        </h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
        <AcceptInviteContent />
      </Suspense>
    </main>
  );
}
