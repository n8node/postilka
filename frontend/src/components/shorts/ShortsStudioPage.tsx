"use client";

import { useEffect, useState } from "react";
import { FileVideo, FolderOpen, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import { uploadFile, type WorkspaceFile } from "@/lib/files-api";
import { analyzeShortsProject, createShortsProject, deleteShortsProject, getShortsDraftDownloadUrl, getShortsJob, getShortsProject, listShortsProjects, rerenderShortsProject, updateShortsClip, updateShortsSubtitleSettings, type ShortsClip, type ShortsJob, type ShortsProject, type ShortsProjectListItem } from "@/lib/shorts-api";

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
  const [history, setHistory] = useState<ShortsProjectListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clipSaving, setClipSaving] = useState<Record<string, boolean>>({});
  const [clipDrafts, setClipDrafts] = useState<Record<string, { start: string; end: string; text: string; selected: boolean }>>({});

  useEffect(() => {
    void listShortsProjects().then((result) => setHistory(result.projects)).catch(() => undefined).finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    if (id) void openProject(id);
  }, []);

  async function openProject(id: string) {
    try {
      const result = await getShortsProject(id);
      setProject(result.project);
      setClips(result.clips);
      setJob(history.find((item) => item.project.id === id)?.job ?? null);
      window.history.replaceState(null, "", `/shorts?project=${encodeURIComponent(id)}`);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось открыть проект");
    }
  }

  async function removeProject(id: string) {
    if (!window.confirm("Удалить этот Shorts-проект? Исходное видео останется в файлах.")) return;
    try {
      await deleteShortsProject(id);
      setHistory((items) => items.filter((item) => item.project.id !== id));
      if (project?.id === id) {
        setProject(null); setClips([]); setJob(null); setDraftUrls({});
        window.history.replaceState(null, "", "/shorts");
      }
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось удалить проект");
    }
  }

  async function analyzeProject(id: string) {
    try {
      const result = await analyzeShortsProject(id);
      setJob(result.job);
      setHistory((items) => items.map((item) => item.project.id === id ? { ...item, job: result.job, project: { ...item.project, status: "analyzing" } } : item));
      setJobMessage("Повторный анализ поставлен в очередь.");
      if (project?.id === id) setClips([]);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось запустить повторный анализ");
    }
  }

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

  function clipDraft(clip: ShortsClip) {
    return clipDrafts[clip.id] ?? { start: String(clip.start_seconds), end: String(clip.end_seconds), text: clip.transcript_text, selected: clip.status === "selected" || clip.status === "draft" };
  }

  async function saveClip(clip: ShortsClip) {
    const draft = clipDraft(clip);
    const start = Number(draft.start);
    const end = Number(draft.end);
    setClipSaving((value) => ({ ...value, [clip.id]: true }));
    try {
      const result = await updateShortsClip(clip.id, { start_seconds: start, end_seconds: end, transcript_text: draft.text, status: draft.selected ? "selected" : "candidate" });
      setClips((items) => items.map((item) => item.id === clip.id ? result.clip : item));
      setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, start: String(result.clip.start_seconds), end: String(result.clip.end_seconds), text: result.clip.transcript_text } }));
      setJobMessage("Настройки клипа сохранены.");
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось сохранить клип");
    } finally {
      setClipSaving((value) => ({ ...value, [clip.id]: false }));
    }
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
      setProject(result.project); setJob(result.job); setClips([]); setJobMessage(`РџСЂРѕРµРєС‚ СЃРѕР·РґР°РЅ. Р—Р°РґР°С‡Р° Р°РЅР°Р»РёР·Р°: ${result.job.id}`);
      setHistory((items) => [{ project: result.project, job: result.job, clips: 0, source_file: sourceFile ?? undefined }, ...items.filter((item) => item.project.id !== result.project.id)]);
      window.history.replaceState(null, "", `/shorts?project=${encodeURIComponent(result.project.id)}`);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    if (!file.type.startsWith("video/")) { setJobMessage("Выберите видеофайл."); return; }
    setUploading(true); setUploadProgress(0); setJobMessage("");
    try {
      const uploaded = await uploadFile(file, null, setUploadProgress);
      setSourceFile(uploaded); setSourceFileId(uploaded.id);
      const nextDuration = Math.max(1, Math.round(uploaded.media_metadata?.duration_seconds ?? duration));
      setDuration(nextDuration); setRangeEnd(nextDuration); setUploadProgress(100); setJobMessage("Видео загружено и выбрано для анализа.");
    } catch (error) { setJobMessage(error instanceof Error ? error.message : "Не удалось загрузить видео"); }
    finally { setUploading(false); }
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
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void handleUpload(file); }} className="mt-2 rounded-lg border border-dashed border-border bg-bg p-3">
            <div className="flex items-center gap-3"><FileVideo className="h-5 w-5 text-accent" /><span className="min-w-0 flex-1 truncate text-sm text-text">{sourceFile?.name ?? "Перетащите видео сюда или выберите из файлов"}</span><button type="button" onClick={() => setPickerOpen(true)} className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text hover:border-accent"><FolderOpen className="mr-1 inline h-4 w-4" />Медиатека</button><label className="cursor-pointer rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90"><Upload className="mr-1 inline h-4 w-4" />Загрузить<input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file); event.currentTarget.value = ""; }} /></label></div>
            {uploading && <div className="mt-3"><div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-xs text-muted">Загрузка видео…</p></div>}
          </div>
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
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">История проектов</h2><p className="mt-1 text-sm text-white/50">Проекты сохраняются после обновления страницы.</p></div>{historyLoading && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}</div>
        {!historyLoading && history.length === 0 ? <p className="mt-5 text-sm text-white/50">Пока нет созданных проектов.</p> : <div className="mt-5 space-y-3">
          {history.map((item) => <article key={item.project.id} className={`flex flex-wrap items-center gap-4 rounded-xl border p-3 ${project?.id === item.project.id ? "border-violet-400/60 bg-violet-400/10" : "border-white/10 bg-black/10"}`}>
            <div className="h-16 w-12 overflow-hidden rounded-md bg-black">{item.source_file?.id ? <video src={`/app/api/v1/files/${item.source_file.id}/download?disposition=inline`} muted playsInline className="h-full w-full object-cover" /> : <FileVideo className="m-3 h-6 w-6 text-white/40" />}</div>
            <div className="min-w-[180px] flex-1"><p className="truncate text-sm font-medium text-white">{item.source_file?.name ?? "Исходное видео"}</p><p className="mt-1 text-xs text-white/50">{new Date(item.project.created_at).toLocaleString("ru-RU")} · {item.clips} клипов</p><p className="mt-1 text-xs text-violet-200">{item.project.status}</p></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => void openProject(item.project.id)} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10">Открыть</button>{!item.job || (item.job.status !== "queued" && item.job.status !== "running") ? <button type="button" onClick={() => void analyzeProject(item.project.id)} className="rounded-lg border border-violet-400/30 p-2 text-violet-200 hover:bg-violet-400/10" aria-label="Повторить анализ"><RefreshCw className="h-4 w-4" /></button> : null}<button type="button" onClick={() => void removeProject(item.project.id)} className="rounded-lg border border-red-400/30 p-2 text-red-200 hover:bg-red-400/10" aria-label="Удалить проект"><Trash2 className="h-4 w-4" /></button></div>
          </article>)}
        </div>}
      </section>
      {(project || job) && <section className="mt-8 rounded-xl border border-border bg-surface p-6 shadow-sm">
                  {clips.length === 0 ? <p className="mt-6 text-sm text-white/50">Candidates will appear after worker processing.</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => {
            const draft = clipDraft(clip);
            return <article key={clip.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <div className="aspect-[9/16] bg-black">{draftUrls[clip.id] ? <video src={draftUrls[clip.id]} controls playsInline className="h-full w-full object-contain" /> : <button type="button" onClick={() => loadDraft(clip.id)} className="flex h-full w-full items-center justify-center text-sm text-violet-200 hover:bg-white/5">Load preview</button>}</div>
              <div className="space-y-3 p-4">
                <p className="text-xs text-white/45">score {clip.score.toFixed(2)}</p>
                <div className="grid grid-cols-2 gap-2"><label className="text-xs text-white/60">Start<input type="number" min="0" step="0.1" value={draft.start} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, start: e.target.value } }))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white" /></label><label className="text-xs text-white/60">End<input type="number" min="0" step="0.1" value={draft.end} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, end: e.target.value } }))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white" /></label></div>
                <label className="block text-xs text-white/60">Subtitles<textarea value={draft.text} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, text: e.target.value } }))} rows={4} className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-white" /></label>
                <label className="flex items-center gap-2 text-sm text-white/75"><input type="checkbox" checked={draft.selected} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, selected: e.target.checked } }))} />Select for final render</label>
                <button type="button" onClick={() => void saveClip(clip)} disabled={clipSaving[clip.id]} className="rounded-lg border border-violet-400/30 px-3 py-2 text-sm text-violet-100 hover:bg-violet-400/10 disabled:opacity-50">{clipSaving[clip.id] ? "Saving..." : "Save clip"}</button>
              </div>
            </article>;
          })}
        </div>}
      </section>}
    </main>
  );
}