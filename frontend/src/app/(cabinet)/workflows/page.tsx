"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Plus,
  Play,
  Sparkles,
  Clock,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Copy,
  Layers,
} from "lucide-react";
import {
  fetchWorkflows,
  createWorkflow,
  deleteWorkflow,
  runWorkflow,
  type Workflow,
} from "@/lib/workflows-api";
import { WorkflowTemplatesModal } from "@/components/workflows/WorkflowTemplatesModal";

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWorkflows();
      setWorkflows(res.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateNew = async () => {
    const created = await createWorkflow({
      name: "Новый процесс",
      description: "Нажмите, чтобы настроить цепочку нод и логику публикации",
    });
    router.push(`/workflows/${created.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Вы уверены, что хотите удалить этот процесс?")) return;
    await deleteWorkflow(id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleRun = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunningId(id);
    try {
      await runWorkflow(id);
      await load();
    } finally {
      setRunningId(null);
    }
  };

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Автоматизированные процессы
            </h1>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Workflow Builder
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Визуальный холст для создания многошаговых процессов генерации контента и постинга
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <Sparkles className="h-4 w-4 text-purple-500" />
            Галерея шаблонов
          </button>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            Создать процесс
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск процесса по названию..."
          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-4 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Workflows Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Загрузка процессов...</span>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 mb-4">
            <GitBranch className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            У вас пока нет настроенных процессов
          </h3>
          <p className="mx-auto max-w-sm text-xs text-zinc-500 mb-6">
            Создайте свой первый процесс на визуальном холсте или выберите готовый сценарий из галереи
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsTemplatesOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              Выбрать из шаблонов
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Создать с нуля
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkflows.map((w) => (
            <div
              key={w.id}
              onClick={() => router.push(`/workflows/${w.id}`)}
              className="group relative flex flex-col justify-between rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition hover:border-indigo-500/50 hover:shadow-xl cursor-pointer"
            >
              <div>
                {/* Card Top Row */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        w.is_active ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-zinc-400"
                      }`}
                    />
                    <span className="text-[11px] font-medium text-zinc-500">
                      {w.is_active ? "Активен" : "На паузе"}
                    </span>
                  </div>

                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {w.graph.nodes?.length || 0} узлов
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-1">
                  {w.name}
                </h3>
                <p className="line-clamp-2 text-xs text-zinc-500 mb-4">
                  {w.description || "Без описания"}
                </p>
              </div>

              {/* Bottom Card Metadata & Actions */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                <div className="flex items-center justify-between">
                  {/* Last Run Indicator */}
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    {w.last_run ? (
                      <>
                        {w.last_run.status === "completed" && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        {w.last_run.status === "failed" && (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span>
                          {w.last_run.status === "completed" ? "Успешно" : "Ошибка"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Не запускался</span>
                      </>
                    )}
                  </div>

                  {/* Run & Delete Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Запустить процесс сейчас"
                      onClick={(e) => handleRun(w.id, e)}
                      disabled={runningId === w.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition disabled:opacity-50"
                    >
                      {runningId === w.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5 fill-current" />
                      )}
                    </button>

                    <button
                      title="Удалить процесс"
                      onClick={(e) => handleDelete(w.id, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Modal */}
      <WorkflowTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onTemplateCloned={(clonedId) => {
          router.push(`/workflows/${clonedId}`);
        }}
      />
    </div>
  );
}
