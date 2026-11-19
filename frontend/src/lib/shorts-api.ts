export type ShortsProject = {
  id: string;
  source_file_id?: string;
  content_type: string;
  language: string;
  status: string;
  source_duration_seconds: number;
  processing_minutes_reserved: number;
  source_expires_at?: string;
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

export function getShortsJob(id: string) {
  return request<{ job: ShortsJob }>(`/shorts/jobs/${id}`);
}

export function getShortsAudioDownloadUrl(projectId: string) {
  return request<{ url: string; expires_in: number }>(`/shorts/projects/${projectId}/audio`);
}