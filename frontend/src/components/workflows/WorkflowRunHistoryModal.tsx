"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  Sparkles,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  fetchWorkflowRuns,
  type WorkflowRun,
  type WorkflowRunStep,
} from "@/lib/workflows-api";

interface WorkflowRunHistoryModalProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowRunHistoryModal: React.FC<WorkflowRunHistoryModalProps> = ({
  workflowId,
  isOpen,
  onClose,
}) => {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !workflowId) return;
    setLoading(true);
    fetchWorkflowRuns(workflowId)
      .then((res) => {
        setRuns(res.items || []);
        if (res.items && res.items.length > 0) {
          setSelectedRun(res.items[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, workflowId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                История запусков процесса
              </h2>
              <p className="text-xs text-zinc-500">
                Детальный лог выполнения шагов, затраты токенов и результаты
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Runs List */}
          <div className="w-80 border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-xs">Загрузка истории...</span>
              </div>
            ) : runs.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                Пока не было запусков
              </div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                    selectedRun?.id === run.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {run.status === "completed" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {run.status === "failed" && (
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {run.status === "running" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                      )}
                      <span className="text-xs font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                        {run.status === "completed"
                          ? "Успешно"
                          : run.status === "failed"
                          ? "С ошибкой"
                          : run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(run.created_at).toLocaleString("ru-RU")}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              ))
            )}
          </div>

          {/* Right Column: Run Details & Step Traces */}
          <div className="flex-1 overflow-y-auto p-6 text-xs">
            {selectedRun ? (
              <div className="space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3">
                    <span className="text-[10px] text-zinc-500">Статус</span>
                    <p className="mt-0.5 font-bold uppercase text-zinc-900 dark:text-zinc-100 text-xs">
                      {selectedRun.status}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3">
                    <span className="text-[10px] text-zinc-500">Токены AI</span>
                    <p className="mt-0.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {selectedRun.tokens_used}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3">
                    <span className="text-[10px] text-zinc-500">Кредиты KIE</span>
                    <p className="mt-0.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {selectedRun.credits_used}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3">
                    <span className="text-[10px] text-zinc-500">Источник</span>
                    <p className="mt-0.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {selectedRun.trigger_source}
                    </p>
                  </div>
                </div>

                {/* Error Message banner if failed */}
                {selectedRun.error_message && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30 p-4 text-red-800 dark:text-red-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>Причина ошибки</span>
                    </div>
                    <p>{selectedRun.error_message}</p>
                  </div>
                )}

                {/* Outputs / Context Payload */}
                <div>
                  <h4 className="mb-2 font-bold text-zinc-900 dark:text-zinc-100">
                    Контекст и результаты шагов (JSON)
                  </h4>
                  <pre className="max-h-96 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 p-4 text-[11px] font-mono text-emerald-400">
                    {JSON.stringify(selectedRun.context_data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400">
                Выберите запуск слева для просмотра подробностей
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
