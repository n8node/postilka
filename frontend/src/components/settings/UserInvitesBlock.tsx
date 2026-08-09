"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { ApiError, fetchUserInvites, type UserInvite } from "@/lib/api";

export function UserInvitesBlock({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserInvites()
      .then((data) => {
        setEnabled(data.invite_registration_enabled);
        setInvites(data.invites ?? []);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Не удалось загрузить инвайты");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    if (embedded) {
      return <p className="text-sm text-muted">Загрузка…</p>;
    }
    return (
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Мои инвайты</h2>
        <p className="mt-2 text-sm text-muted">Загрузка…</p>
      </section>
    );
  }

  if (!enabled) {
    return null;
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  }

  const body = (
    <>
      {!embedded && (
        <>
          <h2 className="text-sm font-semibold">Мои инвайты</h2>
          <p className="mt-1 text-sm text-muted">
            Делитесь ключами для регистрации новых пользователей. После регистрации
            каждый пользователь получает 3 инвайта.
          </p>
        </>
      )}

      {error && (
        <p className={embedded ? "text-sm text-red-600" : "mt-3 text-sm text-red-600"}>
          {error}
        </p>
      )}

      {!error && invites.length === 0 && (
        <p className={embedded ? "text-sm text-muted" : "mt-3 text-sm text-muted"}>
          У вас пока нет инвайтов.
        </p>
      )}

      {!error && invites.length > 0 && (
        <ul className={embedded ? "space-y-2" : "mt-4 space-y-2"}>
          {invites.map((invite) => (
            <li
              key={invite.id}
              className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 ${invite.is_active ? "" : "opacity-60"}`}
            >
              <span className="font-mono text-sm">{invite.code}</span>
              {invite.is_active ? (
                <button
                  type="button"
                  onClick={() => void copyCode(invite.code)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-bg"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Скопировать
                </button>
              ) : (
                <span className="text-xs text-muted">{invite.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      {body}
    </section>
  );
}
