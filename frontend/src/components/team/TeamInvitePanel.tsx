"use client";

import { FormEvent, useState } from "react";
import { ApiError, createWorkspaceInvite } from "@/lib/api";

const roles = [
  { value: "admin", label: "Администратор" },
  { value: "editor", label: "Редактор" },
  { value: "viewer", label: "Наблюдатель" },
];

type Props = {
  workspaceId?: string;
  disabled?: boolean;
  onCreated?: () => void;
};

export function TeamInvitePanel({
  workspaceId,
  disabled = false,
  onCreated,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || disabled) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await createWorkspaceInvite(email, role, workspaceId);
      setEmail("");
      setSuccess("Письмо с приглашением отправлено");
      onCreated?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отправить приглашение",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
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
      <label className="block space-y-1">
        <span className="text-xs text-muted">Email коллеги</span>
        <input
          type="email"
          required
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled || loading}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Роль</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={disabled || loading}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
        >
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={disabled || loading || !email.trim()}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Отправка…" : "Отправить приглашение"}
      </button>
    </form>
  );
}
