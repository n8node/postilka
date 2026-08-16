"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  fetchWorkflow,
  updateWorkflow,
  runWorkflow,
  testWorkflowNode,
  type Workflow,
  type WorkflowGraph,
  type WorkflowNode,
} from "@/lib/workflows-api";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { WorkflowRunHistoryModal } from "@/components/workflows/WorkflowRunHistoryModal";
import { WorkflowTemplatesModal } from "@/components/workflows/WorkflowTemplatesModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkflow(id);
      setWorkflow(data);
    } catch (err: any) {
      setError(err?.message || "Не удалось загрузить процесс");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSave = async (
    graph: WorkflowGraph,
    name?: string,
    isActive?: boolean
  ) => {
    if (!workflow) return;
    const updated = await updateWorkflow(workflow.id, {
      graph,
      name,
      is_active: isActive,
    });
    setWorkflow(updated);
  };

  const handleRun = async () => {
    if (!workflow) return;
    await runWorkflow(workflow.id);
    setIsHistoryOpen(true);
  };

  const handleTestNode = async (node: WorkflowNode) => {
    if (!workflow) throw new Error("Workflow not loaded");
    return testWorkflowNode(workflow.id, node);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin mr-3 text-indigo-600" />
        <span className="text-sm font-medium">Загрузка холста процесса...</span>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {error || "Процесс не найден"}
        </h2>
        <button
          onClick={() => router.push("/workflows")}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          Вернуться к списку процессов
        </button>
      </div>
    );
  }

  return (
    <>
      <WorkflowCanvas
        workflow={workflow}
        onSave={handleSave}
        onRun={handleRun}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onTestNode={handleTestNode}
      />

      {/* History Modal */}
      <WorkflowRunHistoryModal
        workflowId={workflow.id}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Templates Modal */}
      <WorkflowTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onTemplateCloned={(clonedId) => {
          router.push(`/workflows/${clonedId}`);
        }}
      />
    </>
  );
}
