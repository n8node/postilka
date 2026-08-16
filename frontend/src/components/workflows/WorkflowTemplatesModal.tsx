"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  Share2,
  Video,
  Send,
  Loader2,
  Copy,
  ChevronRight,
} from "lucide-react";
import {
  fetchWorkflowTemplates,
  cloneWorkflowTemplate,
  type WorkflowTemplate,
} from "@/lib/workflows-api";

interface WorkflowTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCloned: (clonedWorkflowId: string) => void;
}

export const WorkflowTemplatesModal: React.FC<WorkflowTemplatesModalProps> = ({
  isOpen,
  onClose,
  onTemplateCloned,
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchWorkflowTemplates()
      .then((res) => setTemplates(res.items || []))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClone = async (tplId: string) => {
    setCloningId(tplId);
    try {
      const cloned = await cloneWorkflowTemplate(tplId);
      onTemplateCloned(cloned.id);
      onClose();
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Галерея готовых сценариев (Шаблоны)
              </h2>
              <p className="text-xs text-zinc-500">
                Выберите эталонный шаблон и настройте его под свои каналы за 1 клик
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

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm">Загрузка шаблонов...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center text-sm text-zinc-400">
              Шаблоны пока не добавлены
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-5 transition hover:border-indigo-500/50 hover:shadow-lg"
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {tpl.category}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {tpl.graph.nodes?.length || 0} узлов
                      </span>
                    </div>

                    <h3 className="mb-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {tpl.name}
                    </h3>
                    <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleClone(tpl.id)}
                    disabled={cloningId === tpl.id}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 transition"
                  >
                    {cloningId === tpl.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {cloningId === tpl.id
                      ? "Создание копии..."
                      : "Использовать этот шаблон"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
