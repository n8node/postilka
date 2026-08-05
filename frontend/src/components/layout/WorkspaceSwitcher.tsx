"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import {
  ApiError,
  createWorkspace,
  setActiveWorkspace,
  type Workspace,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  owner: "Владелец",
  admin: "Админ",
  editor: "Редактор",
  viewer: "Наблюдатель",
};

type WorkspaceSwitcherProps = {
  collapsed?: boolean;
};

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const { workspace, workspaces, refreshAuth } = useAuth();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowCreateForm(false);
        setError(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function handleSwitch(ws: Workspace) {
    if (ws.id === workspace?.id || busyId) return;
    setBusyId(ws.id);
    setError(null);
    try {
      await setActiveWorkspace(ws.id);
      await refreshAuth();
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось переключить workspace");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    setError(null);
    try {
      await createWorkspace(name);
      await refreshAuth();
      setNewName("");
      setShowCreateForm(false);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать workspace");
    } finally {
      setCreating(false);
    }
  }

  const activeName = workspace?.name ?? "Workspace";
  const activeRole = workspace?.role ? roleLabels[workspace.role] ?? workspace.role : null;

  return (
    <div ref={rootRef} className={cn("relative", collapsed ? "px-1" : "px-2")}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border text-left transition-colors",
          "border-border bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100",
          open && "border-accent/40 bg-zinc-100 ring-1 ring-accent/20",
          collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        )}
        title={collapsed ? activeName : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-border",
            collapsed && "h-7 w-7",
          )}
        >
          <Building2 className="h-4 w-4 text-accent" />
        </div>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                Workspace
              </span>
              <span className="block truncate text-sm font-semibold text-text">{activeName}</span>
              {activeRole && (
                <span className="block truncate text-xs text-muted">{activeRole}</span>
              )}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted transition-transform",
                open && "rotate-180",
              )}
            />
          </>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 rounded-lg border border-border bg-surface shadow-xl",
            collapsed
              ? "left-full top-0 ml-2 w-72"
              : "left-2 right-2 top-full mt-2 min-w-[14rem]",
          )}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Ваши workspace
            </p>
          </div>

          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            {workspaces.map((ws) => {
              const isActive = ws.id === workspace?.id;
              const isBusy = busyId === ws.id;
              return (
                <li key={ws.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={!!busyId}
                    onClick={() => void handleSwitch(ws)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-50",
                      isActive && "bg-accent/5",
                      busyId && !isBusy && "opacity-50",
                    )}
                  >
                    <span className="mt-0.5 w-4 shrink-0">
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted" />
                      ) : isActive ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{ws.name}</span>
                      {ws.role && (
                        <span className="block truncate text-xs text-muted">
                          {roleLabels[ws.role] ?? ws.role}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border p-2">
            {showCreateForm ? (
              <form onSubmit={(e) => void handleCreate(e)} className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Название workspace"
                  maxLength={255}
                  autoFocus
                  disabled={creating}
                  className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Создать
                  </button>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewName("");
                      setError(null);
                    }}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-zinc-50"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setError(null);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-accent hover:bg-accent/5"
              >
                <Plus className="h-4 w-4" />
                Создать workspace
              </button>
            )}

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
