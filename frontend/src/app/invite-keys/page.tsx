"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicInvites, type PublicInvite } from "@/lib/api";

export default function PublicInviteKeysPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<PublicInvite[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicInvites()
      .then((data) => setInvites(data.invites))
      .catch(() => setError("Не удалось загрузить инвайт-ключи"))
      .finally(() => setLoading(false));
  }, []);

  async function copyCode(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
    } catch {
      setError("Не удалось скопировать ключ");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Инвайт-ключи
        </h1>
        <p className="mt-2 text-sm text-muted">
          Активные ключи можно использовать для регистрации на платформе.
        </p>
      </div>

      <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Загрузка…</p>
        ) : invites.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Пока нет выпущенных инвайт-ключей
          </p>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  invite.is_active
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50/80 opacity-70"
                }`}
              >
                <span className="font-mono text-sm">{invite.code}</span>
                {invite.is_active ? (
                  <button
                    type="button"
                    onClick={() => copyCode(invite.id, invite.code)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    {copiedId === invite.id ? "Скопировано" : "Скопировать"}
                  </button>
                ) : (
                  <span className="text-xs text-muted">
                    {invite.status === "USED"
                      ? "Использован"
                      : invite.status === "REVOKED"
                        ? "Отозван"
                        : invite.status === "EXPIRED"
                          ? "Истёк"
                          : "Неактивен"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/auth/register" className="text-accent hover:underline">
          Перейти к регистрации
        </Link>
      </p>
    </main>
  );
}
