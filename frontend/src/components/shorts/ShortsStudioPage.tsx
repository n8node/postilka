"use client";

import { useEffect, useState } from "react";
import { FileVideo, FolderOpen, Loader2 } from "lucide-react";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import type { WorkspaceFile } from "@/lib/files-api";
import { createShortsProject, getShortsDraftDownloadUrl, getShortsJob, getShortsProject, rerenderShortsProject, updateShortsSubtitleSettings, type ShortsClip, type ShortsJob, type ShortsProject } from "@/lib/shorts-api";

const contentTypes = [
  ["podcast", "Подкаст"],
  ["interview", "Интервью"],
  ["news", "Новости"],
  ["product_review", "Обзор товара"],
  ["vlog", "Влог"],
  ["stream", "Стрим"],
  ["other", "Другое"],
] as const;

export function ShortsStudioPage() {
  const [sourceFileId, setSourceFileId] = useState("");
  const [sourceFile, setSourceFile] = useState<WorkspaceFile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [duration, setDuration] = useState(60);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(60);
  const [contentType, setContentType] = useState("podcast");
  const [jobMessage, setJobMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [project, setProject] = useState<ShortsProject | null>(null);
  const [clips, setClips] = useState<ShortsClip[]>([]);
  const [job, setJob] = useState<ShortsJob | null>(null);
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({});
  const [subtitleStyle, setSubtitleStyle] = useState("classic");
  const [subtitlePosition, setSubtitlePosition] = useState("bottom");

  useEffect(() => {
    if (!project?.id || !job?.id) return;
    if (job.status === "succeeded" || job.status === "failed") {
      void getShortsProject(project.id).then((result) => { setProject(result.project); setClips(result.clips); }).catch(() => undefined);
      return;
    }
    const timer = window.setInterval(async () => {
      try {
        const [nextProject, nextJob] = await Promise.all([getShortsProject(project.id), getShortsJob(job.id)]);
        setProject(nextProject.project); setClips(nextProject.clips); setJob(nextJob.job);
      } catch { /* transient polling failure */ }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [project?.id, job?.id, job?.status]);

  async function loadDraft(clipId: string) {
    if (draftUrls[clipId]) return;
    try { const result = await getShortsDraftDownloadUrl(clipId); setDraftUrls((current) => ({ ...current, [clipId]: result.url })); } catch { /* draft may not be ready */ }
  }

  async function saveSubtitleSettings() {
    if (!project?.id) return;
    try { await updateShortsSubtitleSettings(project.id, { style: subtitleStyle, position: subtitlePosition }); const result = await rerenderShortsProject(project.id); setJob(result.job); setDraftUrls({}); setJobMessage("Настройки сохранены. Draft-предпросмотры перерендериваются."); } catch (error) { setJobMessage(error instanceof Error ? error.message : "Не удалось перерендерить preview"); }
  }

  async function submit() {
    if (!sourceFileId.trim()) {
      setJobMessage("Выберите исходное видео из файлов.");
      return;
    }
    setBusy(true);
    setJobMessage("");
    try {
      const result = await createShortsProject({
        source_file_id: sourceFileId.trim(),
        content_type: contentType,
        language: "ru",
        source_duration_seconds: duration,
        processing_range: { start_seconds: rangeStart, end_seconds: rangeEnd },
      });
      setProject(result.project); setJob(result.job); setClips([]); setJobMessage(`Проект создан. Задача анализа: ${result.job.id}`);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Инструменты · видео</p>
        <h1 className="mt-2 text-2xl font-semibold text-text">Shorts Studio</h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Подготовка длинного видео к анализу и автоматической нарезке. Исходные материалы хранятся временно и не отправляются в KIE.ai.
        </p>
      </div>

        <section className="grid gap-5 rounded-xl border border-border bg-surface p-5 shadow-sm lg:grid-cols-2">
        <label className="block text-sm text-white/70">
          ID видео в медиатеке
          <button type="button" onClick={() => setPickerOpen(true)} className="mt-2 flex w-full items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-left hover:border-accent"><FileVideo className="h-5 w-5 text-accent" /><span className="min-w-0 flex-1 truncate text-sm text-text">{sourceFile?.name ?? "Выбрать видео из файлов"}</span><FolderOpen className="h-4 w-4 text-muted" /></button>
        </label>
        <label className="block text-sm text-white/70">
          Тип видео
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
            {contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm text-white/70">
          Длительность исходника, сек.
          <input type="number" min={1} value={duration} onChange={(e) => { const value = Math.max(1, Number(e.target.value)); setDuration(value); setRangeEnd(Math.min(value, rangeEnd)); }} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
        </label>
        <div className="text-sm text-white/70">
          <p>Диапазон обработки</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input type="number" min={0} max={duration} value={rangeStart} onChange={(e) => setRangeStart(Math.max(0, Number(e.target.value)))} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" aria-label="Начало диапазона" />
            <input type="number" min={1} max={duration} value={rangeEnd} onChange={(e) => setRangeEnd(Math.min(duration, Math.max(1, Number(e.target.value))))} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" aria-label="Конец диапазона" />
          </div>
          <p className="mt-2 text-xs text-white/40">Можно обработать только часть видео, если минут тарифа недостаточно.</p>
        </div>
      </section>

      <div className="mt-6 flex items-center gap-4">
        <button type="button" onClick={submit} disabled={busy} className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Создание проекта…</> : "Запустить анализ"}
        </button>
        {jobMessage && <p className="text-sm text-white/65">{jobMessage}</p>}
      </div>
      <WorkspaceMediaPickerModal open={pickerOpen} mediaKind="video" onClose={() => setPickerOpen(false)} onSelect={(file) => { setSourceFile(file); setSourceFileId(file.id); const nextDuration = Math.max(1, Math.round(file.media_metadata?.duration_seconds ?? 60)); setDuration(nextDuration); setRangeEnd(nextDuration); setPickerOpen(false); }} />
      {project && <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="text-lg font-semibold">Стиль субтитров</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm text-white/70">Стиль<select value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="classic">Classic</option><option value="bold">Bold</option><option value="minimal">Minimal</option></select></label><label className="text-sm text-white/70">Позиция<select value={subtitlePosition} onChange={(e) => setSubtitlePosition(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="top">Сверху</option><option value="center">По центру</option><option value="bottom">Снизу</option></select></label><button type="button" onClick={saveSubtitleSettings} className="self-end rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Сохранить стиль</button></div></section>}
      {(project || job) && <section className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Результаты анализа</h2><p className="mt-1 text-sm text-white/55">{job?.current_step ?? project?.status ?? "Ожидание"}</p></div>
          {job && <span className="rounded-full bg-violet-400/15 px-3 py-1 text-sm text-violet-200">{job.progress}% · {job.status}</span>}
        </div>
        {clips.length === 0 ? <p className="mt-6 text-sm text-white/50">Кандидаты появятся после транскрибации и обработки worker.</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => <article key={clip.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <div className="aspect-[9/16] bg-black">{draftUrls[clip.id] ? <video src={draftUrls[clip.id]} controls playsInline className="h-full w-full object-contain" /> : <button type="button" onClick={() => loadDraft(clip.id)} className="flex h-full w-full items-center justify-center text-sm text-violet-200 hover:bg-white/5">Загрузить preview</button>}</div>
            <div className="p-4"><p className="text-xs text-white/45">{clip.start_seconds.toFixed(1)}–{clip.end_seconds.toFixed(1)} сек. · score {clip.score.toFixed(2)}</p><p className="mt-2 line-clamp-4 text-sm text-white/80">{clip.transcript_text}</p></div>
          </article>)}
        </div>}
      </section>}
    </main>
  );
}