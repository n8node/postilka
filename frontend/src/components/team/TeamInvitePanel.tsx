"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createWorkspaceInvite,
  fetchWorkspaceInvites,
  type WorkspaceInvite,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const roles = [
  { value: "admin", label: "Администратор" },
  { value: "editor", label: "Редактор" },
  { value: "viewer", label: "Наблюдатель" },
];

type Props = {
  workspaceId?: string;
};

export function TeamInvitePanel({ workspaceId: workspaceIdProp }: Props = {}) {
  const { workspace, workspaces } = useAuth();
  const workspaceId = workspaceIdProp ?? workspace?.id;
  const managedWorkspace =
    workspaces.find((w) => w.id === workspaceId) ?? workspace;
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canInvite =
    managedWorkspace?.role === "owner" || managedWorkspace?.role === "admin";

  const loadInvites = useCallback(async () => {
    if (!workspaceId || !canInvite) return;
    try {
      const data = await fetchWorkspaceInvites(workspaceId);
      setInvites(data.invites);
    } catch {
      setInvites([]);
    }
  }, [workspaceId, canInvite]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await createWorkspaceInvite(email, role, workspaceId);
      setEmail("");
      setSuccess("Приглашение отправлено на email");
      await loadInvites();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отправить приглашение",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canInvite) {
    return (
      <p className="mt-2 text-sm text-muted">
        Приглашать участников могут владелец и администратор workspace.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {success}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="email"
            required
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
          >
            {roles.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Отправка…" : "Пригласить"}
          </button>
        </div>
      </form>

      {invites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Ожидают принятия</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span>{inv.email}</span>
                <span className="text-muted">{inv.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
