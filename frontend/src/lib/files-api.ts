import { apiFetch } from "@/lib/api";

export type WorkspaceFile = {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  name: string;
  mime_type: string;
  size: number;
  media_metadata?: { duration_seconds?: number } | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceFolder = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  files_count?: number;
  deleted_at?: string | null;
  created_at: string;
};

export type FolderBreadcrumb = {
  id: string | null;
  name: string;
};

export type StorageStats = {
  used_bytes: number;
  quota_bytes: number | null;
  trash_bytes: number;
  trash_retention_days: number;
  file_count: number;
};

export type UploadLimits = {
  allowed_extensions: string[];
  max_size_image_bytes: number;
  max_size_video_bytes: number;
  max_size_audio_bytes: number;
  max_size_archive_bytes: number;
  max_size_other_bytes: number;
  plan_max_file_size_bytes?: number | null;
  plan_storage_bytes?: number | null;
  updated_at: string;
};

export function fetchUploadLimits() {
  return apiFetch<UploadLimits>("/storage/limits");
}

export type FilesSection =
  | "my-files"
  | "recent"
  | "photos"
  | "videos"
  | "trash";

export function getStorageStats() {
  return apiFetch<StorageStats>("/storage");
}

export function listFiles(section: FilesSection, folderId?: string | null) {
  const params = new URLSearchParams({ section });
  if (folderId) params.set("folder_id", folderId);
  return apiFetch<{ files: WorkspaceFile[] }>(`/files?${params}`);
}

export function listFolders(parentId?: string | null) {
  const params = new URLSearchParams();
  if (parentId) params.set("parent_id", parentId);
  const q = params.toString();
  return apiFetch<{ folders: WorkspaceFolder[] }>(`/folders${q ? `?${q}` : ""}`);
}

export function fetchFolderBreadcrumbs(folderId: string) {
  return apiFetch<{ breadcrumbs: FolderBreadcrumb[] }>(`/folders/${folderId}/breadcrumbs`);
}

export function listAllFolders() {
  return apiFetch<{ folders: WorkspaceFolder[] }>("/folders?scope=all");
}

export function initUpload(input: {
  name: string;
  size: number;
  mime_type: string;
  folder_id?: string | null;
}) {
  return apiFetch<{
    upload_url: string;
    upload_headers: Record<string, string>;
    upload_session_token: string;
  }>("/files/upload/init", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadFile(file: File, folderId?: string | null) {
  const init = await initUpload({
    name: file.name,
    size: file.size,
    mime_type: file.type || "application/octet-stream",
    folder_id: folderId ?? null,
  });
  const headers = new Headers(init.upload_headers);
  const res = await fetch(init.upload_url, {
    method: "PUT",
    body: file,
    headers,
  });
  if (!res.ok) {
    throw new Error("Не удалось загрузить файл в хранилище");
  }
  return apiFetch<WorkspaceFile>("/files/upload/complete", {
    method: "POST",
    body: JSON.stringify({ upload_session_token: init.upload_session_token }),
  });
}

export function createFolder(name: string, parentId?: string | null) {
  return apiFetch<WorkspaceFolder>("/folders", {
    method: "POST",
    body: JSON.stringify({ name, parent_id: parentId ?? null }),
  });
}

export function renameFile(id: string, name: string) {
  return apiFetch<WorkspaceFile>(`/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function moveFile(id: string, folderId: string | null) {
  return apiFetch<WorkspaceFile>(`/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ folder_id: folderId }),
  });
}

export function copyFile(id: string, folderId: string | null) {
  return apiFetch<WorkspaceFile>(`/files/${id}/copy`, {
    method: "POST",
    body: JSON.stringify({ folder_id: folderId }),
  });
}

export function deleteFile(id: string) {
  return apiFetch<{ ok: boolean; trashed: boolean }>(`/files/${id}`, {
    method: "DELETE",
  });
}

export function downloadFile(id: string, disposition: "inline" | "attachment" = "attachment") {
  const params = new URLSearchParams();
  if (disposition === "inline") params.set("disposition", "inline");
  const q = params.toString();
  return apiFetch<{ url: string; expires_in?: number }>(
    `/files/${id}/download${q ? `?${q}` : ""}`,
  );
}

export function bulkFiles(ids: string[], action: "delete" | "move" | "copy", folderId?: string | null) {
  return apiFetch<{ ok: number; errors: { id: string; message: string }[] }>("/files/bulk", {
    method: "POST",
    body: JSON.stringify({ ids, action, folder_id: folderId ?? null }),
  });
}

export function renameFolder(id: string, name: string) {
  return apiFetch<WorkspaceFolder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function moveFolder(id: string, parentId: string | null) {
  return apiFetch<WorkspaceFolder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ parent_id: parentId }),
  });
}

export function deleteFolder(id: string) {
  return apiFetch<{ ok: boolean; trashed: boolean }>(`/folders/${id}`, {
    method: "DELETE",
  });
}

export function bulkFolders(ids: string[], action: "delete" | "move" | "copy", parentId?: string | null) {
  return apiFetch<{ ok: number; errors: { id: string; message: string }[] }>("/folders/bulk", {
    method: "POST",
    body: JSON.stringify({ ids, action, parent_id: parentId ?? null }),
  });
}

export function listTrash() {
  return apiFetch<{ files: WorkspaceFile[]; folders: WorkspaceFolder[] }>("/trash");
}

export function restoreTrash(fileIds: string[], folderIds: string[]) {
  return apiFetch<{ ok: boolean }>("/trash/restore", {
    method: "POST",
    body: JSON.stringify({ file_ids: fileIds, folder_ids: folderIds }),
  });
}

export function emptyTrash() {
  return apiFetch<{ ok: boolean; deleted_files: number; freed_bytes: number }>("/trash/empty", {
    method: "POST",
  });
}

export function permanentDeleteTrash(id: string, type: "file" | "folder") {
  return apiFetch<{ ok: boolean }>(`/trash/${id}?type=${type}`, { method: "DELETE" });
}

export function transferFile(
  id: string,
  targetWorkspaceId: string,
  targetFolderId: string | null,
  mode: "copy" | "move",
) {
  return apiFetch<WorkspaceFile>(`/files/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify({
      target_workspace_id: targetWorkspaceId,
      target_folder_id: targetFolderId,
      mode,
    }),
  });
}
