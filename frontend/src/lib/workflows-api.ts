import { apiFetch } from "@/lib/api";

export type WorkflowTriggerType = "manual" | "schedule" | "webhook";

export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "awaiting_approval";

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type NodePosition = {
  x: number;
  y: number;
};

export type WorkflowNode = {
  id: string;
  type: string;
  position: NodePosition;
  data: Record<string, any>;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowRunStep = {
  id: string;
  run_id: string;
  node_id: string;
  node_type: string;
  node_title: string;
  status: WorkflowStepStatus;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
  duration_ms: number;
};

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  workspace_id: string;
  triggered_by?: string;
  trigger_source: string;
  status: WorkflowRunStatus;
  error_message?: string;
  context_data: Record<string, any>;
  tokens_used: number;
  credits_used: number;
  kopecks_spent: number;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  steps?: WorkflowRunStep[];
};

export type Workflow = {
  id: string;
  workspace_id: string;
  created_by?: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: WorkflowTriggerType;
  schedule_cron: string;
  schedule_tz: string;
  next_run_at?: string;
  graph: WorkflowGraph;
  created_at: string;
  updated_at: string;
  last_run?: WorkflowRun;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  graph: WorkflowGraph;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowStats = {
  total_workflows: number;
  active_workflows: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
};

// Client API calls

export async function fetchWorkflows(): Promise<{ items: Workflow[] }> {
  return apiFetch<{ items: Workflow[] }>("/workflows");
}

export async function fetchWorkflow(id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/${id}`);
}

export async function createWorkflow(data: {
  name: string;
  description?: string;
  trigger_type?: WorkflowTriggerType;
  schedule_cron?: string;
  schedule_tz?: string;
  graph?: WorkflowGraph;
}): Promise<Workflow> {
  return apiFetch<Workflow>("/workflows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateWorkflow(
  id: string,
  data: {
    name?: string;
    description?: string;
    is_active?: boolean;
    trigger_type?: WorkflowTriggerType;
    schedule_cron?: string;
    schedule_tz?: string;
    graph?: WorkflowGraph;
  }
): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteWorkflow(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/workflows/${id}`, {
    method: "DELETE",
  });
}

export async function runWorkflow(
  id: string,
  inputs?: Record<string, any>
): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(`/workflows/${id}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: inputs || {} }),
  });
}

export async function testWorkflowNode(
  workflowId: string,
  node: WorkflowNode,
  inputs?: Record<string, any>
): Promise<{ outputs: Record<string, any> }> {
  return apiFetch<{ outputs: Record<string, any> }>(
    `/workflows/${workflowId}/test-node`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node, inputs: inputs || {} }),
    }
  );
}

export async function fetchWorkflowRuns(
  id: string,
  limit = 30
): Promise<{ items: WorkflowRun[] }> {
  return apiFetch<{ items: WorkflowRun[] }>(
    `/workflows/${id}/runs?limit=${limit}`
  );
}

export async function fetchWorkflowRun(
  workflowId: string,
  runId: string
): Promise<WorkflowRun> {
  return apiFetch<WorkflowRun>(`/workflows/${workflowId}/runs/${runId}`);
}

export async function fetchWorkflowTemplates(): Promise<{
  items: WorkflowTemplate[];
}> {
  return apiFetch<{ items: WorkflowTemplate[] }>("/workflows/templates");
}

export async function cloneWorkflowTemplate(
  templateId: string
): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/templates/${templateId}/clone`, {
    method: "POST",
  });
}

// Admin API calls

export async function fetchAdminWorkflowTemplates(): Promise<{
  items: WorkflowTemplate[];
}> {
  return apiFetch<{ items: WorkflowTemplate[] }>(
    "/admin/workflows/templates"
  );
}

export async function createAdminWorkflowTemplate(data: {
  name: string;
  description: string;
  category: string;
  icon: string;
  is_active?: boolean;
  sort_order?: number;
  graph?: WorkflowGraph;
}): Promise<WorkflowTemplate> {
  return apiFetch<WorkflowTemplate>("/admin/workflows/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateAdminWorkflowTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    icon?: string;
    is_active?: boolean;
    sort_order?: number;
    graph?: WorkflowGraph;
  }
): Promise<WorkflowTemplate> {
  return apiFetch<WorkflowTemplate>(`/admin/workflows/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteAdminWorkflowTemplate(
  id: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/admin/workflows/templates/${id}`, {
    method: "DELETE",
  });
}

export async function fetchAdminWorkflowStats(): Promise<WorkflowStats> {
  return apiFetch<WorkflowStats>("/admin/workflows/stats");
}
