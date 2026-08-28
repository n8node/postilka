"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Users } from "lucide-react";
import {
  ApiError,
  deleteWorkspace,
  updateWorkspace,
  type Workspace,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

export function WorkspaceSettingsBlock({ embedded = false }: { embedded?: boolean }) {
  const { workspace, active_workspace, workspaces, refreshAuth } = useAuth();
  const currentWorkspace = active_workspace ?? workspace;
  const router = useRouter();

  const [selectedId, setSelectedId] = useState(currentWorkspace?.id ?? "");
  const [name, setName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected =
    workspaces.find((w) => w.id === selectedId) ?? currentWorkspace ?? null;

  useEffect(() => {
    if (!selectedId && currentWorkspace?.id) {
      setSelectedId(currentWorkspace.id);
    }
  }, [selectedId, currentWorkspace?.id]);

  useEffect(() => {
    setName(selected?.name ?? "");
    setError("");
    setSuccess("");
  }, [selected?.id, selected?.name]);

  const canRename =
    selected?.role === "owner" || selected?.role === "admin";
  const canDelete =
    selected?.role === "owner" && workspaces.length > 1;

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!selected || !canRename) return;

    const trimmed = name.trim();
    if (!trimmed || trimmed === selected.name) return;

    setRenameLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateWorkspace(selected.id, trimmed);
      await refreshAuth();
      setSuccess("Название workspace обновлено");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось переименовать workspace",
      );
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleDelete() {
    if (!selected || !canDelete) return;

    if (
      !window.confirm(
        `Удалить workspace «${selected.name}»? Все участники, каналы и файлы будут удалены без возможности восстановления.`,
      )
    ) {
      return;
    }

    setDeleteLoading(true);
    setError("");
    setSuccess("");
    try {
      await deleteWorkspace(selected.id);
      await refreshAuth();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось удалить workspace",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  if (workspaces.length === 0) {
    return null;
  }

  const inner = (
    <div className={embedded ? "space-y-4" : "mt-4 space-y-4"}>
        {workspaces.length > 1 && (
          <div>
            <label htmlFor="workspace-select" className="text-sm text-muted">
              Выберите workspace
            </label>
            <select
              id="workspace-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              {workspaces.map((ws: Workspace) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                  {ws.role ? ` (${roleLabels[ws.role] ?? ws.role})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {selected && (
          <>
            <div className="text-sm text-muted">
              Роль:{" "}
              <span className="font-medium text-text">
                {selected.role
                  ? (roleLabels[selected.role] ?? selected.role)
                  : "—"}
              </span>
              {selected.slug ? (
                <span className="ml-2">· {selected.slug}</span>
              ) : null}
            </div>

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

            {canRename ? (
              <form onSubmit={(e) => void handleRename(e)} className="space-y-3">
                <div>
                  <label htmlFor="workspace-name" className="text-sm text-muted">
                    Название
                  </label>
                  <input
                    id="workspace-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={255}
                    required
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    renameLoading ||
                    !name.trim() ||
                    name.trim() === selected.name
                  }
                  className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {renameLoading ? "Сохранение…" : "Сохранить название"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted">
                Переименовывать workspace могут владелец и администратор.
              </p>
            )}

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Команда</h3>
              <p className="mt-2 text-sm text-muted">
                Приглашения, роли и доступ участников перенесены в отдельный
                раздел.
              </p>
              <Link
                href="/team"
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                <Users className="h-4 w-4" />
                Открыть раздел «Команда»
              </Link>
            </div>

            {selected.role === "owner" && (
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-red-800">
                  Опасная зона
                </h3>
                {workspaces.length <= 1 ? (
                  <p className="mt-2 text-sm text-muted">
                    Нельзя удалить единственный workspace. Сначала создайте
                    другой.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted">
                      Удаление необратимо: каналы, посты, файлы и участники
                      workspace будут потеряны.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleteLoading || !canDelete}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleteLoading ? "Удаление…" : "Удалить workspace"}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Workspace</h2>
      <p className="mt-1 text-sm text-muted">
        Переименование и удаление. Состав команды — в разделе «Команда».
      </p>
      {inner}
    </section>
  );
}
