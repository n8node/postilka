"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ApiError,
  acceptWorkspaceInvite,
  fetchMe,
  previewWorkspaceInvite,
} from "@/lib/api";
import { setPendingWorkspaceInvite } from "@/lib/workspace-invite-cookie";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [preview, setPreview] = useState<{
    workspace_name: string;
    email: string;
    role: string;
    user_exists: boolean;
  } | null>(null);
  const [status, setStatus] = useState<
    "loading" | "redirecting" | "ready" | "success" | "error"
  >(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Проверяем приглашение…" : "Ссылка недействительна",
  );
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const [invitePreview, me] = await Promise.all([
          previewWorkspaceInvite(token),
          fetchMe().catch(() => null),
        ]);
        if (cancelled) return;

        if (me?.user) {
          const userEmail = me.user.email.trim().toLowerCase();
          const inviteEmail = invitePreview.email.trim().toLowerCase();
          if (userEmail !== inviteEmail) {
            setStatus("error");
            setMessage(
              `Войдите под email ${invitePreview.email}, указанным в приглашении.`,
            );
            return;
          }
          setPreview(invitePreview);
          setStatus("ready");
          setMessage("");
          return;
        }

        setStatus("redirecting");
        setMessage("Перенаправляем…");
        setPendingWorkspaceInvite(token);

        const acceptPath = `/auth/accept-invite?token=${encodeURIComponent(token)}`;
        const params = new URLSearchParams({
          email: invitePreview.email,
          next: acceptPath,
        });

        if (invitePreview.user_exists) {
          router.replace(`/auth/login?${params.toString()}`);
        } else {
          params.set("workspace_invite_token", token);
          router.replace(`/auth/register?${params.toString()}`);
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Приглашение недействительно или истекло");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setMessage("Принимаем приглашение…");
    try {
      await acceptWorkspaceInvite(token);
      setStatus("success");
      setMessage("Вы присоединились к воркфлоу. Переходим…");
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
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
      {(status === "loading" || status === "redirecting") && (
        <p className="text-sm text-muted">{message}</p>
      )}

      {preview && status === "ready" && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Вас пригласили в воркфлоу{" "}
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
            disabled={accepting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {accepting ? "Принимаем…" : "Принять приглашение"}
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
          {token && (
            <Link
              href={`/auth/login?email=${encodeURIComponent(preview?.email ?? "")}&next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
              className="block text-center text-sm text-accent hover:underline"
            >
              Войти
            </Link>
          )}
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
          Приглашение в воркфлоу
        </h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
        <AcceptInviteContent />
      </Suspense>
    </main>
  );
}
