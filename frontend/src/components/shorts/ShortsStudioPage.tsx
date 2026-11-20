"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Clock3, FileVideo, FolderOpen, Loader2, Play, RefreshCw, Trash2, Upload, Video, WandSparkles } from "lucide-react";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import { ShortsWizardNav, type ShortsWizardStep } from "@/components/shorts/ShortsWizardNav";
import { ShortsProjectsPanel } from "@/components/shorts/ShortsProjectsPanel";
import { uploadFile, type WorkspaceFile } from "@/lib/files-api";
import { analyzeShortsProject, createShortsProject, deleteShortsProject, exportShortsProject, getShortsAudioDownloadUrl, getShortsDraftDownloadUrl, getShortsFinalDownloadUrl, getShortsJob, getShortsProject, getShortsTranscriptResultUrl, listShortsProjects, rerenderShortsProject, updateShortsClip, updateShortsClipOrder, updateShortsSubtitleSettings, type ShortsClip, type ShortsJob, type ShortsProject, type ShortsProjectListItem } from "@/lib/shorts-api";

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
  const [activeStep, setActiveStep] = useState<ShortsWizardStep>("projects");
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
  const [subtitleFontSize, setSubtitleFontSize] = useState(58);
  const [subtitleTextColor, setSubtitleTextColor] = useState("#FFFFFF");
  const [subtitleBackground, setSubtitleBackground] = useState("#101010");
  const [watermark, setWatermark] = useState("");
  const [safeZone, setSafeZone] = useState(70);
  const [history, setHistory] = useState<ShortsProjectListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clipSaving, setClipSaving] = useState<Record<string, boolean>>({});
  const [clipDrafts, setClipDrafts] = useState<Record<string, { start: string; end: string; text: string; selected: boolean }>>({});

  function statusLabel(status?: string) {
    return ({ analyzing: "Анализируется", rendering: "Рендерится", completed: "Готово", failed: "Ошибка", draft: "Черновик" } as Record<string, string>)[status ?? ""] ?? status ?? "Ожидает запуска";
  }

  function statusClass(status?: string) {
    return status === "completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "failed" ? "bg-rose-50 text-rose-700 ring-rose-200" : status === "analyzing" || status === "rendering" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-slate-600 ring-slate-200";
  }

  function formatSeconds(value: number) {
    const seconds = Math.max(0, Math.round(value));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function stepLabel(step?: string) {
    return ({ queued: "В очереди", claimed: "Подготовка", downloading: "Подготовка видео", transcribing: "Распознавание речи", analyzing: "Поиск лучших фрагментов", rendering: "Создание превью", completed: "Завершено", failed: "Ошибка" } as Record<string, string>)[step ?? ""] ?? step ?? "Обработка";
  }

  useEffect(() => {
    void listShortsProjects().then((result) => setHistory(result.projects)).catch((error) => setJobMessage(error instanceof Error ? error.message : "Не удалось загрузить историю проектов")).finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    const requestedStep = new URLSearchParams(window.location.search).get("step") as ShortsWizardStep | null;
    if (requestedStep && ["projects", "creation", "processing", "clips", "editor", "export"].includes(requestedStep)) setActiveStep(requestedStep);
    if (id) void openProject(id);
  }, []);

  async function openProject(id: string) {
    try {
      const result = await getShortsProject(id);
      setProject(result.project);
      setClips(result.clips);
      setSubtitleStyle(result.project.settings?.subtitle_style ?? "classic");
      setSubtitlePosition(result.project.settings?.subtitle_position ?? "bottom");
      setSubtitleFontSize(result.project.settings?.subtitle_font_size ?? 58);
      setSubtitleTextColor(result.project.settings?.subtitle_text_color ?? "#FFFFFF");
      setSubtitleBackground(result.project.settings?.subtitle_background ?? "#101010");
      setWatermark(result.project.settings?.watermark ?? "");
      setSafeZone(result.project.settings?.safe_zone ?? 70);
      const historyJob = history.find((item) => item.project.id === id)?.job;
      if (historyJob) setJob(historyJob);
      else if (result.project.status === "completed" || result.project.status === "failed") setJob({ id: "project-status", project_id: id, job_type: "analyze", status: result.project.status === "completed" ? "succeeded" : "failed", current_step: result.project.status === "completed" ? "completed" : "failed", progress: result.project.status === "completed" ? 100 : 0 });
      setActiveStep(result.project.status === "completed" && result.clips.length > 0 ? "clips" : result.project.status === "analyzing" ? "processing" : "creation");
      window.history.replaceState(null, "", `/app/shorts?project=${encodeURIComponent(id)}`);
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
        window.history.replaceState(null, "", "/app/shorts");
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
    if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
      if (job.status === "failed") setJobMessage(job.last_error || "Не удалось обработать видео. Откройте проект позже или запустите анализ повторно.");
      void getShortsProject(project.id).then((result) => { setProject(result.project); setClips(result.clips); }).catch(() => undefined);
      return;
    }
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      if (stopped) return;
      try {
        const [nextProject, nextJob] = await Promise.all([getShortsProject(project.id), getShortsJob(job.id)]);
        if (stopped) return;
        setProject(nextProject.project); setClips(nextProject.clips); setJob(nextJob.job);
        if (nextJob.job.status === "failed" || nextJob.job.status === "queued") setJobMessage(nextJob.job.last_error || (nextJob.job.status === "queued" ? `Повторная попытка: ${stepLabel(nextJob.job.current_step)}` : "Не удалось обработать видео."));
      } catch { /* transient polling failure */ }
      if (!stopped) timer = window.setTimeout(() => void poll(), 1500);
    };
    void poll();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [project?.id, job?.id, job?.status]);

  async function loadDraft(clipId: string) {
    if (draftUrls[clipId]) return;
    try { const result = await getShortsDraftDownloadUrl(clipId); setDraftUrls((current) => ({ ...current, [clipId]: result.url })); } catch { /* draft may not be ready */ }
  }

  useEffect(() => {
    if (!clips.length) return;
    clips.forEach((clip) => { if (clip.draft_file_id && !draftUrls[clip.id]) void loadDraft(clip.id); });
  }, [clips]);

  async function downloadAudio() {
    if (!project) return;
    try { const result = await getShortsAudioDownloadUrl(project.id); const anchor = document.createElement("a"); anchor.href = result.url; anchor.download = "shorts-audio.mp3"; anchor.target = "_blank"; anchor.rel = "noreferrer"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); }
    catch (error) { setJobMessage(error instanceof Error ? error.message : "Аудиофайл ещё не готов"); }
  }

  function downloadTranscriptResult() {
    if (!project) return;
    const anchor = document.createElement("a"); anchor.href = getShortsTranscriptResultUrl(project.id); anchor.download = "shorts-transcript-result.json"; anchor.target = "_blank"; anchor.rel = "noreferrer"; document.body.appendChild(anchor); anchor.click(); anchor.remove();
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
    try { await updateShortsSubtitleSettings(project.id, { style: subtitleStyle, position: subtitlePosition, font_size: subtitleFontSize, text_color: subtitleTextColor, background: subtitleBackground, watermark, safe_zone: safeZone }); const result = await rerenderShortsProject(project.id); setJob(result.job); setDraftUrls({}); setJobMessage("Настройки сохранены. Draft-предпросмотры перерендериваются."); } catch (error) { setJobMessage(error instanceof Error ? error.message : "Не удалось перерендерить preview"); }
  }

  async function moveClip(index: number, direction: -1 | 1) {
    if (!project) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= clips.length) return;
    const next = [...clips];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setClips(next);
    try { await updateShortsClipOrder(project.id, next.map((clip) => clip.id)); setJobMessage("Порядок клипов сохранён."); }
    catch (error) { setClips(clips); setJobMessage(error instanceof Error ? error.message : "Не удалось сохранить порядок клипов"); }
  }

  async function exportProject() {
    if (!project) return;
    try { const result = await exportShortsProject(project.id); setJob(result.job); setJobMessage("Финальный MP4 поставлен в очередь."); }
    catch (error) { setJobMessage(error instanceof Error ? error.message : "Не удалось запустить экспорт"); }
  }

  async function downloadFinal() {
    if (!project) return;
    try { const result = await getShortsFinalDownloadUrl(project.id); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (error) { setJobMessage(error instanceof Error ? error.message : "Финальный файл ещё не готов"); }
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
      setProject(result.project); setJob(result.job); setClips([]); setJobMessage("Проект создан. Анализ поставлен в очередь.");
      setActiveStep("processing");
      setHistory((items) => [{ project: result.project, job: result.job, clips: 0, source_file: sourceFile ?? undefined }, ...items.filter((item) => item.project.id !== result.project.id)]);
      window.history.replaceState(null, "", `/app/shorts?project=${encodeURIComponent(result.project.id)}`);
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
    <main className="min-h-screen space-y-6 bg-slate-50 pb-12 text-slate-900">
      <ShortsWizardNav activeStep={activeStep} onStepChange={(step) => { setActiveStep(step); const query = project?.id ? `?project=${encodeURIComponent(project.id)}&step=${step}` : `?step=${step}`; window.history.replaceState(null, "", `/app/shorts${query}`); }} canOpen={(step) => step === "projects" || step === "creation" || Boolean(project)} />
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-800 px-6 py-8 text-white shadow-lg sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Инструменты · видео</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Shorts Studio</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
          Подготовка длинного видео к анализу и автоматической нарезке с субтитрами.
        </p><div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-violet-100 ring-1 ring-white/15"><WandSparkles className="h-4 w-4" /> Автоматическая нарезка</div>
      </div>

      <ShortsProjectsPanel items={history} loading={historyLoading} activeProjectId={project?.id} onOpen={(id) => void openProject(id)} onRetry={(id) => void analyzeProject(id)} onDelete={(id) => void removeProject(id)} />

        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          ID видео в медиатеке
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void handleUpload(file); }} className="mt-2 rounded-lg border border-dashed border-border bg-bg p-3">
            <div className="flex items-center gap-3"><FileVideo className="h-5 w-5 shrink-0 text-indigo-600" /><span className="min-w-0 flex-1 truncate text-sm text-slate-800">{sourceFile?.name ?? "Перетащите видео сюда или выберите из файлов"}</span><button type="button" onClick={() => setPickerOpen(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400"><FolderOpen className="mr-1 inline h-4 w-4" />Медиатека</button><label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Upload className="mr-1 inline h-4 w-4" />Загрузить<input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file); event.currentTarget.value = ""; }} /></label></div>
            {uploading && <div className="mt-3"><div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-xs text-muted">Загрузка видео…</p></div>}
          </div>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Тип видео
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
            {contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Длительность исходника, сек.
          <input type="number" min={1} step={0.1} value={duration} onChange={(e) => { const value = Math.max(1, Number(e.target.value)); setDuration(value); setRangeEnd(Math.min(value, rangeEnd)); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none" />
        </label>
        <div className="text-sm text-slate-700">
          <p>Диапазон обработки</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input type="number" min={0} max={duration} value={rangeStart} onChange={(e) => setRangeStart(Math.max(0, Number(e.target.value)))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none" aria-label="Начало диапазона" />
            <input type="number" min={1} max={duration} value={rangeEnd} onChange={(e) => setRangeEnd(Math.min(duration, Math.max(1, Number(e.target.value))))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none" aria-label="Конец диапазона" />
          </div>
          <p className="mt-2 text-xs text-slate-500">Можно обработать только часть видео, если минут тарифа недостаточно.</p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Создание проекта…</> : "Запустить анализ"}
        </button>
        {jobMessage && <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-900">{jobMessage}</p>}
        {job && (job.status === "queued" || job.status === "running" || job.status === "succeeded") && <div className={`w-full rounded-2xl border p-4 shadow-sm ${job.status === "succeeded" ? "border-emerald-200 bg-emerald-50" : "border-indigo-200 bg-white"}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{job.status === "succeeded" ? "Анализ завершён" : "Анализ видео выполняется"}</p><p className="mt-1 text-xs font-medium text-slate-600">Этап: {stepLabel(job.current_step)} · обработано примерно {formatSeconds(rangeStart + (rangeEnd - rangeStart) * Math.min(100, Math.max(0, job.progress)) / 100)} из {formatSeconds(rangeEnd)}</p></div><span className="text-lg font-bold text-indigo-700">{job.progress}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 transition-all duration-700" style={{ width: `${Math.min(100, Math.max(2, job.progress))}%` }} /></div></div>}
        {job?.status === "failed" && <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-bold">Не удалось обработать видео</p><p className="mt-1">{job.last_error || jobMessage || "Worker завершил задачу с ошибкой. Проверьте настройки transcriber."}</p></div>}
      </div>
      <WorkspaceMediaPickerModal open={pickerOpen} mediaKind="video" onClose={() => setPickerOpen(false)} onSelect={(file) => { setSourceFile(file); setSourceFileId(file.id); const nextDuration = Math.max(1, Math.round(file.media_metadata?.duration_seconds ?? 60)); setDuration(nextDuration); setRangeEnd(nextDuration); setPickerOpen(false); }} />
      {project && <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-900">Субтитры и safe zone</h2><div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6"><label className="text-sm font-medium text-slate-700">Стиль<select value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"><option value="classic">Classic</option><option value="bold">Bold</option><option value="minimal">Minimal</option></select></label><label className="text-sm font-medium text-slate-700">Позиция<select value={subtitlePosition} onChange={(e) => setSubtitlePosition(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"><option value="top">Сверху</option><option value="center">По центру</option><option value="bottom">Снизу</option></select></label><label className="text-sm font-medium text-slate-700">Размер<input type="number" min="24" max="120" value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" /></label><label className="text-sm font-medium text-slate-700">Цвет<input type="color" value={subtitleTextColor} onChange={(e) => setSubtitleTextColor(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white" /></label><label className="text-sm font-medium text-slate-700">Фон<input type="color" value={subtitleBackground} onChange={(e) => setSubtitleBackground(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white" /></label><label className="text-sm font-medium text-slate-700">Safe zone<input type="number" min="0" max="300" value={safeZone} onChange={(e) => setSafeZone(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" /></label></div><label className="mt-4 block text-sm font-medium text-slate-700">Watermark<input value={watermark} onChange={(e) => setWatermark(e.target.value)} placeholder="@brand" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900" /></label><button type="button" onClick={saveSubtitleSettings} className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Сохранить настройки</button></section>}
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">История проектов</h2><p className="mt-1 text-sm text-slate-500">Проекты сохраняются после обновления страницы.</p></div>{historyLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}</div>
        {!historyLoading && history.length === 0 ? <p className="mt-5 text-sm text-slate-500">Пока нет созданных проектов.</p> : <div className="mt-5 space-y-3">
          {history.map((item) => <article key={item.project.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-md ${project?.id === item.project.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}>
            <div className="h-16 w-12 overflow-hidden rounded-md bg-black">{item.source_file?.id ? <video src={`/app/api/v1/files/${item.source_file.id}/download?disposition=inline`} muted playsInline className="h-full w-full object-cover" /> : <FileVideo className="m-3 h-6 w-6 text-white/40" />}</div>
            <div className="min-w-[180px] flex-1"><p className="truncate text-sm font-semibold text-slate-900">{item.source_file?.name ?? "Исходное видео"}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.project.created_at).toLocaleString("ru-RU")} · {item.clips} клипов</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(item.project.status)}`}>{statusLabel(item.project.status)}</span></div>
            <div className="min-w-[180px] flex-1"><p className="truncate text-sm font-semibold text-slate-900">{item.source_file?.name ?? "Исходное видео"}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.project.created_at).toLocaleString("ru-RU")} · {item.clips} клипов</p><span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(item.project.status)}`}><Clock3 className="h-3.5 w-3.5" />{statusLabel(item.project.status)}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => void openProject(item.project.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"><Play className="mr-1 inline h-3.5 w-3.5" />Открыть</button>{!item.job || (item.job.status !== "queued" && item.job.status !== "running") ? <button type="button" onClick={() => void analyzeProject(item.project.id)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Повторить анализ"><RefreshCw className="h-4 w-4" /></button> : null}<button type="button" onClick={() => void removeProject(item.project.id)} className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600" aria-label="Удалить проект"><Trash2 className="h-4 w-4" /></button></div>
          </article>)}
        </div>}
      </section>
      {(project || job) && <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex flex-wrap items-center gap-3"><h2 className="mr-auto text-lg font-bold text-slate-900">Клипы</h2>{project?.settings?.transcript_result ? <button type="button" onClick={downloadTranscriptResult} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Скачать JSON с таймингами</button> : null}<button type="button" onClick={() => void downloadAudio()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Скачать MP3</button><button type="button" onClick={() => void exportProject()} disabled={!clips.some((clip) => clip.status === "selected" || clip.status === "draft") || job?.status === "queued" || job?.status === "running"} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50">Экспортировать MP4</button>{project?.status === "completed" ? <button type="button" onClick={() => void downloadFinal()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Скачать MP4</button> : null}{job?.job_type === "export" && <span className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">{job.current_step || job.status} · {job.progress}%</span>}</div>
                  {clips.length === 0 ? <p className="mt-6 text-sm text-slate-500">Candidates will appear after worker processing.</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip, clipIndex) => {
            const draft = clipDraft(clip);
            return <article key={clip.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[9/16] bg-slate-950">{draftUrls[clip.id] ? <video src={draftUrls[clip.id]} controls playsInline className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-violet-200"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка превью…</div>}</div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">Клип {clipIndex + 1} · score {clip.score.toFixed(2)}</p><div className="flex gap-1"><button type="button" disabled={clipIndex === 0} onClick={() => void moveClip(clipIndex, -1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={clipIndex === clips.length - 1} onClick={() => void moveClip(clipIndex, 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></div></div>
                <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">Start<input type="number" min="0" step="0.1" value={draft.start} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, start: e.target.value } }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900" /></label><label className="text-xs text-slate-500">End<input type="number" min="0" step="0.1" value={draft.end} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, end: e.target.value } }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900" /></label></div>
                <label className="block text-xs text-slate-500">Subtitles<textarea value={draft.text} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, text: e.target.value } }))} rows={4} className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900" /></label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.selected} onChange={(e) => setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, selected: e.target.checked } }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />Выбрать для финального экспорта</label>
                <button type="button" onClick={() => void saveClip(clip)} disabled={clipSaving[clip.id]} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{clipSaving[clip.id] ? "Сохранение…" : "Сохранить клип"}</button>
              </div>
            </article>;
          })}
        </div>}
      </section>}
    </main>
  );
}