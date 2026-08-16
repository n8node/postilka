"use client";

import React, { useEffect, useState } from "react";
import {
  GitBranch,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Loader2,
  Layers,
  Save,
  X,
} from "lucide-react";
import {
  fetchAdminWorkflowTemplates,
  createAdminWorkflowTemplate,
  updateAdminWorkflowTemplate,
  deleteAdminWorkflowTemplate,
  fetchAdminWorkflowStats,
  type WorkflowTemplate,
  type WorkflowStats,
} from "@/lib/workflows-api";

export function AdminWorkflowsPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal create/edit state
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("social");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tplRes, statsRes] = await Promise.all([
        fetchAdminWorkflowTemplates(),
        fetchAdminWorkflowStats().catch(() => null),
      ]);
      setTemplates(tplRes.items || []);
      setStats(statsRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setCategory("social");
    setIsActive(true);
    setSortOrder(templates.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: WorkflowTemplate) => {
    setEditingTemplate(tpl);
    setName(tpl.name);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setIsActive(tpl.is_active);
    setSortOrder(tpl.sort_order);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTemplate) {
        await updateAdminWorkflowTemplate(editingTemplate.id, {
          name,
          description,
          category,
          is_active: isActive,
          sort_order: sortOrder,
        });
      } else {
        await createAdminWorkflowTemplate({
          name,
          description,
          category,
          icon: "workflow",
          is_active: isActive,
          sort_order: sortOrder,
        });
      }
      setIsModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот шаблон?")) return;
    await deleteAdminWorkflowTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Управление процессами
          </h1>
          <p className="text-xs text-zinc-500">
            Системные шаблоны процессов, аналитика запусков и глобальные настройки
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
        >
          <Plus className="h-4 w-4" />
          Добавить шаблон
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs text-zinc-500">Всего процессов</span>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.total_workflows}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs text-zinc-500">Активных сценариев</span>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {stats.active_workflows}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs text-zinc-500">Всего запусков (Runs)</span>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.total_runs}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className="text-xs text-zinc-500">Успешных выполнений</span>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {stats.successful_runs}
            </p>
          </div>
        </div>
      )}

      {/* Templates Table */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Системные шаблоны платформы
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Загрузка...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Название</th>
                  <th className="px-6 py-3 font-semibold">Категория</th>
                  <th className="px-6 py-3 font-semibold">Узлы</th>
                  <th className="px-6 py-3 font-semibold">Статус</th>
                  <th className="px-6 py-3 font-semibold">Порядок</th>
                  <th className="px-6 py-3 font-semibold text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {tpl.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1">
                        {tpl.description}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                        {tpl.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {tpl.graph.nodes?.length || 0}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          tpl.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {tpl.is_active ? "Активен" : "Скрыт"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {tpl.sort_order}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(tpl)}
                          className="rounded p-1 text-zinc-400 hover:text-indigo-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="rounded p-1 text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {editingTemplate ? "Редактировать шаблон" : "Новый шаблон процесса"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Название шаблона
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="Кросс-постинг с AI..."
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Описание
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                placeholder="Краткое описание работы сценария..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Категория
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  <option value="social">Социальные сети</option>
                  <option value="video">Видео / Shorts</option>
                  <option value="ai">AI Генерация</option>
                  <option value="news">Новости и RSS</option>
                  <option value="ecommerce">E-Commerce</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Активен и отображается пользователям
              </span>
            </label>

            <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
