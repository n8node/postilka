export type ShortsProject = {
  id: string;
  source_id?: string;
  is_edit_project?: boolean;
  name?: string;
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
  settings?: { transcript?: unknown; transcript_result?: unknown; processing_start_seconds?: number; processing_end_seconds?: number; current_step?: string; subtitle_style?: string; subtitle_position?: string; subtitle_font_size?: number; subtitle_text_color?: string; subtitle_background?: string; watermark?: string; safe_zone?: number; subtitle_words_per_block?: number };
};

export type ShortsProjectListItem = {
  project: ShortsProject;
  edit_project_id?: string;
  source_id?: string;
  job?: ShortsJob;
  clips: number;
  source_file?: { id: string; name: string; mime_type: string; media_metadata?: { duration_seconds?: number; width?: number; height?: number } | null };
};

export type ShortsClip = {
  id: string;
  source_id?: string;
  included?: boolean;
  start_seconds: number;
  end_seconds: number;
  transcript_text: string;
  score: number;
  status: string;
  draft_file_id?: string;
  crop_config?: ShortsCropConfig;
};

export type ShortsCropKeyframe = {
  time: number;
  center_x: number;
  center_y: number;
  scale: number;
};

export type ShortsCropConfig = {
  mode: "auto" | "manual" | "tracking";
  aspect_ratio: "9:16" | "1:1" | "16:9";
  keyframes: ShortsCropKeyframe[];
};

export type ShortsTimedWord = {
  word: string;
  start: number;
  end: number;
};

export type ShortsJob = {
  id: string;
  project_id: string;
  job_type: string;
  status: string;
  current_step: string;
  progress: number;
  last_error?: string;
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
    throw new Error(body?.message ?? body?.error ?? `Не удалось выполнить запрос (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function createShortsProject(input: {
  source_file_id: string;
  content_type: string;
  language: string;
  source_duration_seconds: number;
  project_name: string;
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

export function getShortsAnalysisForFile(fileId: string) {
  return request<{ source?: ShortsProject; found: boolean }>(`/shorts/analysis?file_id=${encodeURIComponent(fileId)}`);
}

export function getShortsSource(sourceId: string) {
  return request<{ project: ShortsProject; clips: ShortsClip[]; edit_projects: ShortsProject[] }>(`/shorts/sources/${sourceId}`);
}

export function listShortsSources() {
  return request<{ sources: ShortsProject[]; projects: ShortsProjectListItem[] }>("/shorts/sources");
}

export function createShortsEditProject(sourceId: string, name?: string) {
  return request<{ project: ShortsProject }>("/shorts/edit-projects", { method: "POST", body: JSON.stringify({ source_id: sourceId, name }) });
}

export function addShortsClipToEditProject(projectId: string, clipId: string) {
  return request<{ ok: boolean }>(`/shorts/edit-projects/${projectId}/clips`, { method: "POST", body: JSON.stringify({ clip_id: clipId }) });
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

export function cancelShortsJob(id: string) {
  return request<{ job: ShortsJob }>(`/shorts/jobs/${id}/cancel`, { method: "POST" });
}

export function getShortsAudioDownloadUrl(projectId: string) {
  return request<{ url: string; expires_in: number }>(`/shorts/projects/${projectId}/audio`);
}

export function getShortsTranscriptResultUrl(projectId: string) {
  return `${apiBase}/shorts/projects/${projectId}/transcript-result`;
}

export async function getShortsTranscriptResult(projectId: string): Promise<unknown> {
  const response = await fetch(getShortsTranscriptResultUrl(projectId), { credentials: "include" });
  if (!response.ok) throw new Error(`Не удалось загрузить таймкоды субтитров (${response.status})`);
  return response.json();
}

export function getShortsProject(id: string) {
  return request<{ project: ShortsProject; clips: ShortsClip[] }>(`/shorts/projects/${id}`);
}

export function getShortsDraftDownloadUrl(clipId: string, editProjectId?: string) {
  const query = editProjectId ? `?edit_project_id=${encodeURIComponent(editProjectId)}` : "";
  return request<{ url: string; expires_in: number }>(`/shorts/clips/${clipId}/draft${query}`);
}

export function getShortsDraftDownloadUrlPath(clipId: string, editProjectId?: string) {
  const query = editProjectId ? `?edit_project_id=${encodeURIComponent(editProjectId)}` : "";
  return `${apiBase}/shorts/clips/${encodeURIComponent(clipId)}/download${query}`;
}

export function deleteShortsClip(clipId: string, editProjectId: string) {
  return request<{ ok: boolean }>(`/shorts/clips/${clipId}?edit_project_id=${encodeURIComponent(editProjectId)}`, { method: "DELETE" });
}

export function updateShortsClip(clipId: string, input: { start_seconds: number; end_seconds: number; transcript_text: string; status: string }, editProjectId?: string) {
  const query = editProjectId ? `?edit_project_id=${encodeURIComponent(editProjectId)}` : "";
  return request<{ clip: ShortsClip }>(`/shorts/clips/${clipId}${query}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateShortsSubtitleSettings(projectId: string, input: { style: string; position: string; font_size: number; text_color: string; background: string; watermark: string; safe_zone: number; words_per_block: number }) {
  return request<{ ok: boolean }>(`/shorts/projects/${projectId}/subtitle-settings`, { method: "PATCH", body: JSON.stringify(input) });
}

export function updateShortsClipCrop(clipId: string, editProjectId: string, config: ShortsCropConfig) {
  return request<{ ok: boolean }>(`/shorts/clips/${encodeURIComponent(clipId)}/crop?edit_project_id=${encodeURIComponent(editProjectId)}`, { method: "PATCH", body: JSON.stringify(config) });
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