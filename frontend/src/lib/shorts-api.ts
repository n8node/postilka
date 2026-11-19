export type ShortsProject = {
  id: string;
  source_file_id?: string;
  content_type: string;
  language: string;
  status: string;
  source_duration_seconds: number;
  processing_minutes_reserved: number;
  source_expires_at?: string;
  audio_file_id?: string;
  audio_expires_at?: string;
  created_at: string;
  updated_at: string;
  settings?: { transcript?: unknown; current_step?: string; subtitle_style?: string; subtitle_position?: string; subtitle_font_size?: number; subtitle_text_color?: string; subtitle_background?: string; watermark?: string; safe_zone?: number };
};

export type ShortsProjectListItem = {
  project: ShortsProject;
  job?: ShortsJob;
  clips: number;
  source_file?: { id: string; name: string; mime_type: string; media_metadata?: { duration_seconds?: number; width?: number; height?: number } | null };
};

export type ShortsClip = {
  id: string;
  start_seconds: number;
  end_seconds: number;
  transcript_text: string;
  score: number;
  status: string;
  draft_file_id?: string;
};

export type ShortsJob = {
  id: string;
  project_id: string;
  job_type: string;
  status: string;
  current_step: string;
  progress: number;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/app/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Не удалось выполнить запрос");
  }
  return response.json() as Promise<T>;
}

export function createShortsProject(input: {
  source_file_id: string;
  content_type: string;
  language: string;
  source_duration_seconds: number;
  processing_range?: { start_seconds: number; end_seconds: number };
}) {
  return request<{ project: ShortsProject; job: ShortsJob }>("/shorts/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listShortsProjects(limit = 20, offset = 0) {
  return request<{ projects: ShortsProjectListItem[]; total: number }>(`/shorts/projects?limit=${limit}&offset=${offset}`);
}

export function deleteShortsProject(projectId: string) {
  return request<{ ok: boolean }>(`/shorts/projects/${projectId}`, { method: "DELETE" });
}

export function analyzeShortsProject(projectId: string) {
  return request<{ job: ShortsJob }>(`/shorts/projects/${projectId}/analyze`, { method: "POST" });
}

export function getShortsJob(id: string) {
  return request<{ job: ShortsJob }>(`/shorts/jobs/${id}`);
}

export function getShortsAudioDownloadUrl(projectId: string) {
  return request<{ url: string; expires_in: number }>(`/shorts/projects/${projectId}/audio`);
}

export function getShortsProject(id: string) {
  return request<{ project: ShortsProject; clips: ShortsClip[] }>(`/shorts/projects/${id}`);
}

export function getShortsDraftDownloadUrl(clipId: string) {
  return request<{ url: string; expires_in: number }>(`/shorts/clips/${clipId}/draft`);
}

export function updateShortsClip(clipId: string, input: { start_seconds: number; end_seconds: number; transcript_text: string; status: string }) {
  return request<{ clip: ShortsClip }>(`/shorts/clips/${clipId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateShortsSubtitleSettings(projectId: string, input: { style: string; position: string; font_size: number; text_color: string; background: string; watermark: string; safe_zone: number }) {
  return request<{ ok: boolean }>(`/shorts/projects/${projectId}/subtitle-settings`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateShortsClipOrder(projectId: string, clipIds: string[]) {
  return request<{ ok: boolean }>(`/shorts/projects/${projectId}/clip-order`, { method: "PATCH", body: JSON.stringify({ clip_ids: clipIds }) });
}

export function rerenderShortsProject(projectId: string) {
  return request<{ job: ShortsJob }>(`/shorts/projects/${projectId}/rerender`, { method: "POST" });
}

export function exportShortsProject(projectId: string) {
  return request<{ job: ShortsJob }>(`/shorts/projects/${projectId}/export`, { method: "POST" });
}

export function getShortsFinalDownloadUrl(projectId: string) {
  return request<{ url: string; expires_in: number }>(`/shorts/projects/${projectId}/final`);
}