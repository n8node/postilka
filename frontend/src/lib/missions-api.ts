import { apiFetch } from "@/lib/api";
import type { Post } from "@/lib/posts-api";

export type AgentTemplateKind = "system" | "user";

export type AgentTemplate = {
  id: string;
  workspace_id?: string;
  kind: AgentTemplateKind;
  slug: string;
  name: string;
  description: string;
  prompt: string;
  tools: string[];
  settings: {
    default_metric?: string;
    default_frequency?: string;
    channel_ids?: string[];
  };
  require_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MissionStatus =
  | "draft"
  | "clarifying"
  | "planning"
  | "pending_approval"
  | "running"
  | "completed"
  | "canceled";

export type MissionMetric = "clicks" | "likes" | "reach" | "subscribers" | "manual";

export type MissionPlanItem = {
  role: "attention" | "problem" | "proof" | "choice" | "objection" | "action";
  due_at?: string;
  channel_ids?: string[];
  text: string;
  post_id?: string;
};

export type Mission = {
  id: string;
  workspace_id: string;
  agent_template_id?: string;
  title: string;
  goal: string;
  metric: MissionMetric;
  metric_target?: number | null;
  status: MissionStatus;
  channel_ids: string[];
  starts_at?: string;
  ends_at?: string;
  frequency: string;
  brief: { product?: string; audience?: string; observations?: string };
  plan: { items?: MissionPlanItem[]; approved_at?: string; manually_changed?: boolean };
  measurability: "automatic" | "partial" | "manual";
  result: { summary?: string; notes?: string };
  template_name?: string;
  post_count?: number;
  created_at: string;
  updated_at: string;
};

export type MissionMessage = {
  id: string;
  workspace_id: string;
  mission_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  draft: "Черновик",
  clarifying: "Уточнение",
  planning: "Ход",
  pending_approval: "Ждёт разрешения",
  running: "Запущена",
  completed: "Завершена",
  canceled: "Отменена",
};

export const MISSION_METRIC_LABEL: Record<MissionMetric, string> = {
  clicks: "Переходы по ссылке",
  likes: "Лайки",
  reach: "Охват",
  subscribers: "Подписчики",
  manual: "Вручную",
};

export const MISSION_ROLE_LABEL: Record<MissionPlanItem["role"], string> = {
  attention: "Внимание",
  problem: "Проблема",
  proof: "Доказательство",
  choice: "Выбор",
  objection: "Снятие сомнения",
  action: "Действие",
};

export const MEASURABILITY_LABEL: Record<Mission["measurability"], string> = {
  automatic: "Автоматически",
  partial: "Частично",
  manual: "Вручную",
};

export function fetchAgentTemplates() {
  return apiFetch<{ items: AgentTemplate[] }>("/agent-templates");
}

export function createAgentTemplate(payload: {
  name: string;
  description?: string;
  prompt: string;
  settings?: AgentTemplate["settings"];
}) {
  return apiFetch<AgentTemplate>("/agent-templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMissions(params: { status?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return apiFetch<{ items: Mission[]; total: number }>(`/missions${q ? `?${q}` : ""}`);
}

export function createMission(payload: {
  agent_template_id: string;
  title: string;
  goal?: string;
  metric?: MissionMetric;
  metric_target?: number | null;
  channel_ids?: string[];
  starts_at?: string | null;
  ends_at?: string | null;
  frequency?: string;
  brief?: Mission["brief"];
}) {
  return apiFetch<Mission>("/missions", { method: "POST", body: JSON.stringify(payload) });
}

export function fetchMission(id: string) {
  return apiFetch<{ mission: Mission; messages: MissionMessage[]; posts: Post[] }>(
    `/missions/${encodeURIComponent(id)}`,
  );
}

export function updateMission(id: string, payload: Partial<{
  title: string;
  goal: string;
  metric: MissionMetric;
  metric_target: number | null;
  channel_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  frequency: string;
  brief: Mission["brief"];
}>) {
  return apiFetch<Mission>(`/missions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function chatMission(id: string, message: string) {
  return apiFetch<{ mission: Mission; reply: MissionMessage }>(`/missions/${encodeURIComponent(id)}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function createMissionDrafts(id: string) {
  return apiFetch<{ mission: Mission; posts: Post[] }>(`/missions/${encodeURIComponent(id)}/drafts`, {
    method: "POST",
  });
}

export function approveMission(id: string) {
  return apiFetch<Mission>(`/missions/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export function cancelMission(id: string) {
  return apiFetch<Mission>(`/missions/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export function completeMission(id: string, payload: { summary?: string; notes?: string } = {}) {
  return apiFetch<Mission>(`/missions/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveMissionAsTemplate(id: string, name?: string) {
  return apiFetch<AgentTemplate>(`/missions/${encodeURIComponent(id)}/save-template`, {
    method: "POST",
    body: JSON.stringify({ name: name || "" }),
  });
}

export function fetchAdminAgentTemplates() {
  return apiFetch<{ items: AgentTemplate[] }>("/admin/agent-templates");
}

export function updateAdminAgentTemplate(id: string, payload: Partial<AgentTemplate>) {
  return apiFetch<AgentTemplate>(`/admin/agent-templates/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
