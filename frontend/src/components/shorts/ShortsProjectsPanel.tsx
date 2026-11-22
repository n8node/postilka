"use client";

import { useState } from "react";
import { Play, RefreshCw, Search, Trash2, Layers3, ListVideo } from "lucide-react";
import type { ShortsProjectListItem } from "@/lib/shorts-api";

type ProjectFilter = "all" | "processing" | "ready" | "failed";

type ShortsProjectsPanelProps = {
  items: ShortsProjectListItem[];
  loading?: boolean;
  activeProjectId?: string;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateMontage?: (sourceId: string) => void;
  onOpenSource?: (sourceId: string) => void;
};

function projectStatus(status: string) {
  if (status === "failed") return { label: "Ошибка", className: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (status === "completed") return { label: "Готово", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (status === "analyzing" || status === "rendering") return { label: "В обработке", className: "bg-amber-50 text-amber-700 ring-amber-200" };
  return { label: "Черновик", className: "bg-slate-100 text-slate-600 ring-slate-200" };
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function ShortsProjectsPanel({ items, loading, activeProjectId, onOpen, onRetry, onDelete, onCreateMontage, onOpenSource }: ShortsProjectsPanelProps) {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => {
    const status = item.project.status;
    const matchesFilter = filter === "all" || (filter === "processing" && (status === "analyzing" || status === "rendering")) || (filter === "ready" && status === "completed") || (filter === "failed" && status === "failed");
    const name = item.source_file?.name ?? "";
    return matchesFilter && name.toLowerCase().includes(query.trim().toLowerCase());
  });

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-end gap-4">
      <div className="mr-auto"><h2 className="text-xl font-bold text-slate-900">Последние проекты</h2><p className="mt-1 text-sm text-slate-500">Открывайте проект и продолжайте с сохранённого этапа.</p></div>
      <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию" className="w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500" /></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
      {([["all", "Все"], ["processing", "В обработке"], ["ready", "Готовые"], ["failed", "С ошибкой"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
    </div>
    {loading ? <p className="mt-6 text-sm text-slate-500">Загрузка проектов…</p> : filtered.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Проекты не найдены.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((item) => { const status = projectStatus(item.project.status); const active = activeProjectId === item.project.id; return <article key={item.project.id} className={`overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md ${active ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
        <div className="relative aspect-video bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800"><span className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white">{formatDuration(item.project.source_duration_seconds)}</span></div>
        <div className="space-y-3 p-4"><p className="truncate text-sm font-bold text-slate-900">{item.source_file?.name ?? "Проект Shorts"}</p><p className="text-xs text-slate-500">{new Date(item.project.created_at).toLocaleDateString("ru-RU")} · {item.clips} фрагм.</p><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.className}`}>{status.label}</span><div className="flex gap-2">{item.project.is_edit_project && <span className="inline-flex rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">Монтаж</span>}<button type="button" onClick={() => item.project.is_edit_project ? onOpen(item.project.id) : item.project.source_id ? onOpenSource?.(item.project.source_id) : onOpen(item.project.id)} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"><Play className="mr-1 inline h-3.5 w-3.5" />{item.project.is_edit_project ? "Открыть монтаж" : item.project.status === "draft" ? "Продолжить анализ" : "Открыть фрагменты"}</button>{item.project.is_edit_project ? null : <button type="button" disabled={!item.project.source_id || item.project.status !== "completed"} onClick={() => item.project.source_id && onCreateMontage?.(item.project.source_id)} className="rounded-xl border border-indigo-200 p-2 text-indigo-600 disabled:opacity-40" title="Создать дополнительный монтаж"><Layers3 className="h-4 w-4" /></button>}{item.project.status === "failed" ? <button type="button" onClick={() => onRetry(item.project.id)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-indigo-300" aria-label="Повторить"><RefreshCw className="h-4 w-4" /></button> : null}<button type="button" onClick={() => onDelete(item.project.id)} className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-300 hover:text-rose-600" aria-label="Удалить" title={item.project.is_edit_project ? "Удалить монтаж и его фрагменты; источник останется" : "Удалить проект Shorts; длинное видео останется в файлах"}><Trash2 className="h-4 w-4" /></button></div></div>
      </article>; })}
    </div>}
  </section>;
}