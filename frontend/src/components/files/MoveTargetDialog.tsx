"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWorkspaces, setActiveWorkspace, type Workspace } from "@/lib/api";
import { listAllFolders, type WorkspaceFolder } from "@/lib/files-api";

export type MoveTarget = {
  workspaceId: string;
  workspaceName: string;
  folderId: string | null;
  folderLabel: string;
};

type Props = {
  open: boolean;
  mode: "move" | "copy";
  currentWorkspaceId: string;
  onClose: () => void;
  onConfirm: (target: MoveTarget) => void | Promise<void>;
};

type FolderRow = { folder: WorkspaceFolder; depth: number };

function buildFolderRows(folders: WorkspaceFolder[]): FolderRow[] {
  const byParent = new Map<string | null, WorkspaceFolder[]>();
  for (const f of folders) {
    const key = f.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }
  const rows: FolderRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const folder of byParent.get(parentId) ?? []) {
      rows.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export function MoveTargetDialog({
  open,
  mode,
  currentWorkspaceId,
  onClose,
  onConfirm,
}: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(currentWorkspaceId);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folderRows = useMemo(() => buildFolderRows(folders), [folders]);
  const selectedWorkspace = workspaces.find((w) => w.id === workspaceId);

  const loadFolders = useCallback(async (wsId: string) => {
    setLoading(true);
    setError(null);
    try {
      await setActiveWorkspace(wsId);
      const res = await listAllFolders();
      setFolders(res.folders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить папки");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setWorkspaceId(currentWorkspaceId);
    setSelectedFolderId(null);
    setError(null);
    void fetchWorkspaces()
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => setWorkspaces([]));
    void loadFolders(currentWorkspaceId);
  }, [open, currentWorkspaceId, loadFolders]);

  useEffect(() => {
    if (!open) return;
    void loadFolders(workspaceId);
  }, [workspaceId, open, loadFolders]);

  if (!open) return null;

  const crossWorkspace = workspaceId !== currentWorkspaceId;
  const title = mode === "move" ? "Переместить в…" : "Копировать в…";

  async function handleConfirm() {
    if (!selectedWorkspace) return;
    if (crossWorkspace && mode === "move") {
      setError("Между пространствами доступно только копирование");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const folderLabel =
        selectedFolderId == null
          ? "Корень"
          : folders.find((f) => f.id === selectedFolderId)?.name ?? "Папка";
      await onConfirm({
        workspaceId,
        workspaceName: selectedWorkspace.name,
        folderId: selectedFolderId,
        folderLabel,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted">Выберите пространство и папку назначения</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Пространство
            </p>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setWorkspaceId(ws.id);
                    setSelectedFolderId(null);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                    workspaceId === ws.id
                      ? "border-accent bg-accent/10 font-medium text-accent"
                      : "border-border hover:bg-zinc-50",
                  )}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </div>

          {crossWorkspace && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {mode === "move"
                ? "Перемещение в другое пространство недоступно — используйте копирование."
                : "Файлы будут скопированы в выбранное пространство."}
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Папка</p>
            {loading ? (
              <p className="text-sm text-muted">Загрузка папок…</p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(null)}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm hover:bg-zinc-50",
                    selectedFolderId === null && "bg-accent/5 font-medium",
                  )}
                >
                  <Folder className="h-4 w-4 text-amber-500" />
                  Корень «{selectedWorkspace?.name ?? "…"}»
                  {selectedFolderId === null && (
                    <ChevronRight className="ml-auto h-4 w-4 text-accent" />
                  )}
                </button>
                {folderRows.map(({ folder, depth }) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-border/50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-zinc-50",
                      selectedFolderId === folder.id && "bg-accent/5 font-medium",
                    )}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="truncate">{folder.name}</span>
                    {selectedFolderId === folder.id && (
                      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-accent" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={submitting || (crossWorkspace && mode === "move")}
            onClick={() => void handleConfirm()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {submitting ? "…" : mode === "move" ? "Переместить" : "Копировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
