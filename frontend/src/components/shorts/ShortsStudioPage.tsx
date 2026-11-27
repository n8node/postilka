"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCircle2, Clock3, FileVideo, FolderOpen, Loader2, Play, RefreshCw, Trash2, Upload, Video, WandSparkles } from "lucide-react";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import { ShortsWizardNav, type ShortsWizardStep } from "@/components/shorts/ShortsWizardNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShortsProjectsPanel } from "@/components/shorts/ShortsProjectsPanel";
import { ShortsCreationPanel } from "@/components/shorts/ShortsCreationPanel";
import { ShortsClipsPanel, type ShortsClipDraft } from "@/components/shorts/ShortsClipsPanel";
import { ShortsEditorPanel, type ShortsEditorSettings } from "@/components/shorts/ShortsEditorPanel";
import { uploadFile, type WorkspaceFile } from "@/lib/files-api";
import { analyzeShortsProject, cancelShortsJob, createShortsProject, deleteShortsProject, exportShortsProject, getShortsAudioDownloadUrl, getShortsDraftDownloadUrl, getShortsDraftDownloadUrlPath, getShortsFinalDownloadUrl, getShortsJob, getShortsProject, getShortsTranscriptResult, getShortsTranscriptResultUrl, listShortsProjects, listShortsSources, rerenderShortsProject, deleteShortsClip, updateShortsClip, getShortsAnalysisForFile, getShortsSource, createShortsEditProject, addShortsClipToEditProject, updateShortsClipOrder, updateShortsSubtitleSettings, type ShortsClip, type ShortsJob, type ShortsProject, type ShortsProjectListItem, type ShortsTimedWord } from "@/lib/shorts-api";

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
  const [projectName, setProjectName] = useState("");
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
  const [sourceClips, setSourceClips] = useState<ShortsClip[]>([]);
  const [analysisSource, setAnalysisSource] = useState<ShortsProject | null>(null);
  const [sourceEditProjects, setSourceEditProjects] = useState<ShortsProject[]>([]);
  const [sources, setSources] = useState<ShortsProject[]>([]);
  const [editProjectId, setEditProjectId] = useState("");
  const [job, setJob] = useState<ShortsJob | null>(null);
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({});
  const [subtitleStyle, setSubtitleStyle] = useState("classic");
  const [subtitlePosition, setSubtitlePosition] = useState("bottom");
  const [subtitleFontSize, setSubtitleFontSize] = useState(58);
  const [subtitleTextColor, setSubtitleTextColor] = useState("#FFFFFF");
  const [subtitleBackground, setSubtitleBackground] = useState("#101010");
  const [watermark, setWatermark] = useState("");
  const [safeZone, setSafeZone] = useState(70);
  const [timedWords, setTimedWords] = useState<ShortsTimedWord[]>([]);
  const [history, setHistory] = useState<ShortsProjectListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clipSaving, setClipSaving] = useState<Record<string, boolean>>({});
  const [clipDrafts, setClipDrafts] = useState<Record<string, { start: string; end: string; text: string; selected: boolean }>>({});
  const projectRequestRef = useRef(0);
  const previewUrl = useMemo(() => sourceFile?.id.startsWith("blob:") ? sourceFile.id : "", [sourceFile]);

  function readTimedWords(result: unknown, offset: number): ShortsTimedWord[] {
    if (!result || typeof result !== "object") return [];
    const payload = result as { words?: unknown; result?: { words?: unknown } };
    const words = Array.isArray(payload.words) ? payload.words : Array.isArray(payload.result?.words) ? payload.result.words : [];
    return words.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const value = item as { word?: unknown; start?: unknown; end?: unknown; start_time?: unknown; end_time?: unknown };
      const start = Number(value.start ?? value.start_time);
      const end = Number(value.end ?? value.end_time);
      const word = typeof value.word === "string" ? value.word.trim() : "";
      return word && Number.isFinite(start) && Number.isFinite(end) && end > start ? [{ word, start: start + offset, end: end + offset }] : [];
    });
  }

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
    return ({ queued: "В очереди", claimed: "Подготовка", loading_project: "Подготовка проекта", download_source: "Подготовка видео", probe_duration: "Проверка видео", extract_audio: "Извлечение аудио", transcribe: "Распознавание речи", billing_transcription: "Проверка тарифа", segment_candidates: "Поиск лучших фрагментов", render_drafts: "Создание превью", completed: "Завершено", failed: "Ошибка", cancelled: "Остановлено" } as Record<string, string>)[step ?? ""] ?? step ?? "Обработка";
  }

  const processingCompleted = project?.is_edit_project
    ? analysisSource?.status === "completed"
    : project?.status === "completed" || (job?.job_type === "analyze" && job.status === "succeeded");

  const processingSteps = [
    { key: "starting", label: "Запуск обработки", min: 0 },
    { key: "loading_project", label: "Подготовка проекта", min: 2 },
    { key: "download_source", label: "Подготовка видео", min: 8 },
    { key: "probe_duration", label: "Проверка видео", min: 20 },
    { key: "extract_audio", label: "Извлечение аудио", min: 30 },
    { key: "transcribe", label: "Распознавание речи", min: 45 },
    { key: "billing_transcription", label: "Проверка тарифа", min: 60 },
    { key: "segment_candidates", label: "Поиск лучших фрагментов", min: 70 },
    { key: "render_drafts", label: "Создание превью фрагментов", min: 88 },
    { key: "completed", label: "Проект готов", min: 100 },
  ];

  useEffect(() => {
    void listShortsSources().then((result) => { setHistory(result.projects); setSources(result.sources); }).catch((error) => setJobMessage(error instanceof Error ? error.message : "Не удалось загрузить историю проектов")).finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    const requestedStep = new URLSearchParams(window.location.search).get("step") as ShortsWizardStep | null;
    if (requestedStep && ["projects", "creation", "processing", "clips", "editor", "export"].includes(requestedStep)) setActiveStep(requestedStep);
    if (id) void openProject(id);
  }, []);

  useEffect(() => {
    if (!analysisSource?.id) {
      setTimedWords([]);
      return;
    }
    let cancelled = false;
    void getShortsTranscriptResult(analysisSource.id).then((result) => {
      if (cancelled) return;
      const settings = analysisSource.settings;
      const offset = typeof settings?.processing_start_seconds === "number" ? settings.processing_start_seconds : 0;
      setTimedWords(readTimedWords(result, offset));
    }).catch(() => {
      if (!cancelled) setTimedWords([]);
    });
    return () => { cancelled = true; };
  }, [analysisSource?.id, analysisSource?.settings]);

  async function openProject(id: string) {
    const requestId = ++projectRequestRef.current;
    setJob(null);
    setJobMessage("");
    setClips([]);
    setSourceClips([]);
    setSourceEditProjects([]);
    setAnalysisSource(null);
    setDraftUrls({});
    setClipDrafts({});
    setClipSaving({});
    try {
      const result = await getShortsProject(id);
      if (requestId !== projectRequestRef.current) return;
      setProject(result.project);
      setEditProjectId(result.project.is_edit_project ? result.project.id : "");
      if (result.project.is_edit_project && result.project.source_id) {
        const source = await getShortsSource(result.project.source_id);
        if (requestId !== projectRequestRef.current) return;
        setAnalysisSource(source.project);
        setSourceClips(source.clips);
        setSourceEditProjects(source.edit_projects ?? []);
      } else { setAnalysisSource(result.project); setSourceClips(result.clips); }
      setClips(result.clips);
      setSubtitleStyle(result.project.settings?.subtitle_style ?? "classic");
      setSubtitlePosition(result.project.settings?.subtitle_position ?? "bottom");
      setSubtitleFontSize(result.project.settings?.subtitle_font_size ?? 58);
      setSubtitleTextColor(result.project.settings?.subtitle_text_color ?? "#FFFFFF");
      setSubtitleBackground(result.project.settings?.subtitle_background ?? "#101010");
      setWatermark(result.project.settings?.watermark ?? "");
      setSafeZone(result.project.settings?.safe_zone ?? 70);
      const historyJob = history.find((item) => item.project.id === id)?.job;
      // A montage can have completed rerender jobs in its history. They are not
      // the montage's current processing state and must not surface an old
      // render error when the editor is opened.
      const currentJob = result.project.is_edit_project && historyJob && !["queued", "running"].includes(historyJob.status)
        ? undefined
        : historyJob;
      const projectJob = currentJob ?? (result.project.status === "completed" || result.project.status === "failed" || result.project.status === "analyzing"
        ? { id: "project-status", project_id: id, job_type: "analyze", status: result.project.status === "completed" ? "succeeded" : result.project.status === "failed" ? "failed" : "running", current_step: result.project.status === "completed" ? "completed" : result.project.status === "failed" ? "failed" : (result.project.settings?.current_step ?? "loading_project"), progress: result.project.status === "completed" ? 100 : result.project.status === "failed" ? 0 : 0 }
        : null);
      setJob(projectJob);
      const requestedStep = new URLSearchParams(window.location.search).get("step") as ShortsWizardStep | null;
      setActiveStep(requestedStep && ["projects", "creation", "processing", "clips", "editor", "export"].includes(requestedStep) ? requestedStep : projectJob && ["queued", "running"].includes(projectJob.status) ? "processing" : result.project.status === "completed" && result.clips.length > 0 ? "clips" : result.project.status === "analyzing" ? "processing" : "creation");
      window.history.replaceState(null, "", `/app/shorts?project=${encodeURIComponent(id)}`);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось открыть проект");
    }
  }

  async function removeProject(id: string) {
    const item = history.find((entry) => entry.project.id === id);
    const confirmation = item?.project.is_edit_project
      ? "Удалить монтаж и его состав фрагментов? Исходное видео, анализ и другие монтажи останутся."
      : "Удалить проект Shorts? Длинное исходное видео останется в файлах.";
    if (!window.confirm(confirmation)) return;
    try {
      await deleteShortsProject(id);
      setHistory((items) => items.filter((entry) => entry.project.id !== id));
      if (project?.id === id) {
        setProject(null); setClips([]); setJob(null); setDraftUrls({});
        setActiveStep("projects");
        window.history.replaceState(null, "", "/app/shorts");
      }
      if (item?.project.source_id) {
        setSourceEditProjects((items) => items.filter((editProject) => editProject.id !== id));
      }
      setAnalysisSource(null); setSourceClips([]); setSourceEditProjects([]); setEditProjectId("");
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось удалить проект");
    }
  }

  async function cancelJob() {
    if (!job?.id || !project?.id || !window.confirm("Остановить обработку проекта? Уже сохранённые исходные файлы останутся.")) return;
    try {
      const result = await cancelShortsJob(job.id);
      setJob(result.job);
      setProject((current) => current ? { ...current, status: "cancelled" } : current);
      setJobMessage("Обработка остановлена. Вы сможете запустить её повторно.");
      await refreshProjects();
    } catch (error) { setJobMessage(error instanceof Error ? error.message : "Не удалось остановить обработку"); }
  }

  async function analyzeProject(id: string) {
    try {
      const result = await analyzeShortsProject(id);
      if (project?.id === id) setJob(result.job);
      setHistory((items) => items.map((item) => item.project.id === id ? { ...item, job: result.job, project: { ...item.project, status: "analyzing" } } : item));
      setJobMessage("Повторный анализ поставлен в очередь.");
      if (project?.id === id) setClips([]);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось запустить повторный анализ");
    }
  }

  useEffect(() => {
    if (!project?.id || !job?.id || job.id === "project-status") return;
    const requestId = projectRequestRef.current;
    if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
      if (job.status === "failed") setJobMessage(job.last_error || "Не удалось обработать видео. Откройте проект позже или запустите анализ повторно.");
      void getShortsProject(project.id).then(async (result) => { if (requestId !== projectRequestRef.current) return; setProject(result.project); setClips(result.clips); if (result.project.is_edit_project && result.project.source_id) { const source=await getShortsSource(result.project.source_id); if (requestId !== projectRequestRef.current) return; setAnalysisSource(source.project);setSourceClips(source.clips); } }).catch(() => undefined);
      return;
    }
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      if (stopped) return;
      try {
        const [nextProject, nextJob] = await Promise.all([getShortsProject(project.id), getShortsJob(job.id)]);
        if (stopped || requestId !== projectRequestRef.current) return;
        setProject(nextProject.project); setClips(nextProject.clips); setJob(nextJob.job);
        setHistory((items) => items.map((item) => item.project.id === project.id ? { ...item, project: nextProject.project, job: nextJob.job, clips: nextProject.clips.length } : item));
        if (nextProject.project.is_edit_project && nextProject.project.source_id) { const source=await getShortsSource(nextProject.project.source_id); if (stopped || requestId !== projectRequestRef.current) return; setAnalysisSource(source.project);setSourceClips(source.clips); }
        if (nextJob.job.status === "failed" || nextJob.job.status === "queued") setJobMessage(nextJob.job.last_error || (nextJob.job.status === "queued" ? `Повторная попытка: ${stepLabel(nextJob.job.current_step)}` : "Не удалось обработать видео."));
      } catch { /* transient polling failure */ }
      if (!stopped) timer = window.setTimeout(() => void poll(), 1500);
    };
    void poll();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [project?.id, job?.id, job?.status]);

  async function loadDraft(clipId: string) {
    if (draftUrls[clipId]) return;
    try { const result = await getShortsDraftDownloadUrl(clipId, editProjectId || undefined); setDraftUrls((current) => ({ ...current, [clipId]: result.url })); } catch { /* draft may not be ready */ }
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

  function clipDraft(clip: ShortsClip): ShortsClipDraft {
    return clipDrafts[clip.id] ?? { start: String(clip.start_seconds), end: String(clip.end_seconds), text: clip.transcript_text, selected: editProjectId ? Boolean(clip.included) : clip.status === "selected" || clip.status === "draft" };
  }

  async function createMontageProject() {
    if (!analysisSource) { setJobMessage("Сначала завершите анализ исходного видео."); return; }
    try { const created = await createShortsEditProject(analysisSource.id, `Монтаж ${sourceEditProjects.length + 1}`); setProject(created.project); setEditProjectId(created.project.id); const loaded=await getShortsProject(created.project.id); setClips(loaded.clips); const source=await getShortsSource(analysisSource.id);setSourceClips(source.clips);setSourceEditProjects(source.edit_projects ?? []);setActiveStep("editor"); await refreshProjects(); window.history.replaceState(null,"",`/app/shorts?project=${encodeURIComponent(created.project.id)}&step=editor`); }
    catch(error){setJobMessage(error instanceof Error?error.message:"Не удалось создать монтаж")}
  }

  async function addClipToCurrentEdit(clip: ShortsClip) {
    if (!editProjectId) { await createMontageProject(); return; }
    try { await addShortsClipToEditProject(editProjectId,clip.id); const loaded=await getShortsProject(editProjectId);setClips(loaded.clips);setDraftUrls((urls)=>{const next={...urls};delete next[clip.id];return next});setJobMessage("Фрагмент добавлен в монтаж."); }
    catch(error){setJobMessage(error instanceof Error?error.message:"Не удалось добавить фрагмент")}
  }

  async function refreshProjects() { try { const result=await listShortsSources();setHistory(result.projects);setSources(result.sources); } catch { /* history refresh is best effort */ } }

  async function saveClip(clip: ShortsClip) {
    const draft = clipDraft(clip);
    const start = Number(draft.start);
    const end = Number(draft.end);
    setClipSaving((value) => ({ ...value, [clip.id]: true }));
    try {
      const result = await updateShortsClip(clip.id, { start_seconds: start, end_seconds: end, transcript_text: draft.text, status: draft.selected ? "selected" : "candidate" }, editProjectId || undefined);
      setClips((items) => items.map((item) => item.id === clip.id ? result.clip : item));
      setClipDrafts((items) => ({ ...items, [clip.id]: { ...draft, start: String(result.clip.start_seconds), end: String(result.clip.end_seconds), text: result.clip.transcript_text } }));
      setJobMessage("Настройки клипа сохранены.");
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось сохранить клип");
    } finally {
      setClipSaving((value) => ({ ...value, [clip.id]: false }));
    }
  }

  async function downloadClip(clip: ShortsClip) {
    setClipSaving((value) => ({ ...value, [clip.id]: true }));
    try {
      const response = await fetch(getShortsDraftDownloadUrlPath(clip.id, editProjectId || undefined), { credentials: "include" });
      if (!response.ok) throw new Error(`Не удалось скачать фрагмент (${response.status})`);
      const blob = await response.blob();
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `shorts-fragment-${clip.id}.mp4`;
      anchor.rel = "noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(anchor.href);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось скачать фрагмент");
    } finally {
      setClipSaving((value) => ({ ...value, [clip.id]: false }));
    }
  }

  async function removeClip(clipId: string) {
    if (!project || !editProjectId || clips.length <= 1) return;
    if (!window.confirm("Удалить этот фрагмент из ролика? Это действие нельзя отменить.")) return;

    const previousClips = clips;
    const nextClips = previousClips.filter((clip) => clip.id !== clipId);
    setClips(nextClips);
    setDraftUrls((items) => {
      const next = { ...items };
      delete next[clipId];
      return next;
    });
    setClipDrafts((items) => {
      const next = { ...items };
      delete next[clipId];
      return next;
    });

    try {
      await deleteShortsClip(clipId, editProjectId);
      try {
        await updateShortsClipOrder(project.id, nextClips.map((clip) => clip.id));
      } catch {
        // The clip is deleted; order can be normalized on the next reorder.
      }
      setJobMessage("Фрагмент удалён.");
    } catch (error) {
      setClips(previousClips);
      setJobMessage(error instanceof Error ? error.message : "Не удалось удалить фрагмент");
    }
  }

  async function saveSubtitleSettings(nextSettings?: ShortsEditorSettings) {
    if (!project?.id) return;
    const settings = nextSettings ?? { style: subtitleStyle, position: subtitlePosition, fontSize: subtitleFontSize, textColor: subtitleTextColor, background: subtitleBackground, watermark, safeZone };
    if (nextSettings) {
      setSubtitleStyle(nextSettings.style); setSubtitlePosition(nextSettings.position); setSubtitleFontSize(nextSettings.fontSize);
      setSubtitleTextColor(nextSettings.textColor); setSubtitleBackground(nextSettings.background); setWatermark(nextSettings.watermark); setSafeZone(nextSettings.safeZone);
    }
    try { await updateShortsSubtitleSettings(project.id, { style: settings.style, position: settings.position, font_size: settings.fontSize, text_color: settings.textColor, background: settings.background, watermark: settings.watermark, safe_zone: settings.safeZone }); const result = await rerenderShortsProject(project.id); setJob(result.job); setDraftUrls({}); setJobMessage("Настройки сохранены. Draft-предпросмотры перерендериваются."); } catch (error) { setJobMessage(error instanceof Error ? error.message : "Не удалось перерендерить preview"); }
  }

  async function reorderClips(fromIndex: number, toIndex: number) {
    if (!project || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= clips.length || toIndex >= clips.length) return;
    const next = [...clips];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setClips(next);
    try { await updateShortsClipOrder(project.id, next.map((clip) => clip.id)); setJobMessage("Порядок клипов сохранён."); }
    catch (error) { setClips(clips); setJobMessage(error instanceof Error ? error.message : "Не удалось сохранить порядок клипов"); }
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
    if (!projectName.trim()) {
      setJobMessage("Введите название проекта.");
      return;
    }
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
        project_name: projectName.trim(),
        processing_range: { start_seconds: rangeStart, end_seconds: rangeEnd },
      });
      setProject(result.project); setEditProjectId(result.project.id);setAnalysisSource(result.project);setSourceClips([]);setJob(result.job); setClips([]); setJobMessage("Создан источник. Анализ поставлен в очередь.");
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
    <div className="w-full min-w-0 space-y-6 pb-12 text-slate-900">
      <PageHeader title="Shorts Studio" description="Подготовка длинного видео к анализу и автоматической нарезке с субтитрами." />
      <ShortsWizardNav activeStep={activeStep} completedSteps={processingCompleted ? ["processing"] : []} onStepChange={(step) => { if (job && ["queued", "running"].includes(job.status) && step === "creation") return; setActiveStep(step); const query = project?.id ? `?project=${encodeURIComponent(project.id)}&step=${step}` : `?step=${step}`; window.history.replaceState(null, "", `/app/shorts${query}`); }} canOpen={(step) => step === "projects" || (step === "creation" && !(job && ["queued", "running"].includes(job.status))) || Boolean(project)} />
      {activeStep === "projects" && <ShortsProjectsPanel items={history} loading={historyLoading} activeProjectId={project?.id} onCreate={() => { projectRequestRef.current++; setProject(null); setProjectName(""); setSourceFile(null); setSourceFileId(""); setJob(null); setClips([]); setSourceClips([]); setAnalysisSource(null); setSourceEditProjects([]); setEditProjectId(""); setDraftUrls({}); setClipDrafts({}); setClipSaving({}); setJobMessage(""); setActiveStep("creation"); window.history.replaceState(null, "", "/app/shorts?step=creation"); }} onOpen={(id) => { window.history.replaceState(null, "", `/app/shorts?project=${encodeURIComponent(id)}&step=editor`); void openProject(id); }} onRetry={(id) => void analyzeProject(id)} onDelete={(id) => void removeProject(id)} onCreateMontage={(sourceId) => { const requestId = ++projectRequestRef.current; const source=sources.find((item)=>item.id===sourceId); if (source) {setAnalysisSource(source);void getShortsSource(sourceId).then((data)=>{if (requestId !== projectRequestRef.current) return; setAnalysisSource(data.project);setSourceClips(data.clips);setSourceEditProjects(data.edit_projects ?? []);void createMontageProject();});} }} onOpenSource={(sourceId) => { const requestId = ++projectRequestRef.current; void getShortsSource(sourceId).then((data)=>{if (requestId !== projectRequestRef.current) return;setAnalysisSource(data.project);setSourceClips(data.clips);setSourceEditProjects(data.edit_projects ?? []);setProject(data.project);setEditProjectId("");setClips(data.clips);setJob(history.find((item) => item.project.id === sourceId)?.job ?? null);setDraftUrls({});setClipDrafts({});setActiveStep("clips");window.history.replaceState(null,"",`/app/shorts?project=${encodeURIComponent(sourceId)}&step=clips`);});}} />}
      {activeStep === "creation" && <ShortsCreationPanel projectName={projectName} onProjectNameChange={setProjectName} sourceFile={sourceFile} previewUrl={previewUrl} uploading={uploading} uploadProgress={uploadProgress} duration={duration} rangeStart={rangeStart} rangeEnd={rangeEnd} contentType={contentType} contentTypes={contentTypes} onUpload={(file) => void handleUpload(file)} onOpenPicker={() => setPickerOpen(true)} onDurationChange={(value) => { setDuration(value); setRangeEnd(Math.min(value, rangeEnd)); }} onRangeStartChange={setRangeStart} onRangeEndChange={setRangeEnd} onContentTypeChange={setContentType} onSubmit={() => void submit()} busy={busy} />}
      {activeStep === "processing" && (job?.status === "succeeded" || (project?.status === "completed" && clips.length > 0)) && <section className="max-w-4xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-9 w-9" /></div><h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Проект обработан</h2><p className="mt-2 text-sm text-slate-600">Обработка завершена успешно. У проекта уже есть готовые фрагменты.</p><button type="button" onClick={() => setActiveStep("clips")} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Перейти к фрагментам</button></section>}
      {activeStep === "processing" && !(job?.status === "succeeded" || (project?.status === "completed" && clips.length > 0)) && <section className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"><h2 className="text-3xl font-bold tracking-tight text-slate-900">Готовим ваш проект</h2><p className="mt-2 text-sm text-slate-500">Анализируем речь и содержание видео</p><div className="mt-5 rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between"><span className="text-2xl font-bold text-slate-900">{job?.progress ?? 0}%</span>{job && ["queued", "running"].includes(job.status) && <button type="button" onClick={() => void cancelJob()} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-rose-600">Остановить обработку</button>}</div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${job?.progress ?? 0}%` }} /></div><div className="mt-4 space-y-2">{processingSteps.map((step, index) => { const progress = job?.progress ?? 0; const currentIndex = Math.max(0, processingSteps.findIndex((item) => item.key === job?.current_step)); const done = job?.status === "succeeded" || index < currentIndex || (index === currentIndex && progress >= 100); const current = job?.status === "running" && index === currentIndex; return <div key={step.key} className={`flex items-center gap-3 rounded-xl border p-3 ${current ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-50 text-emerald-600" : current ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{done ? "✓" : index + 1}</span><span className="flex-1 text-sm font-semibold text-slate-800">{step.label}</span><span className="text-xs text-slate-500">{done ? "Завершён" : current ? `Выполняется · ${progress}%` : "Ожидает"}</span></div>; })}</div><p className="mt-4 text-xs text-slate-500">Можно закрыть страницу — проект продолжит обрабатываться. Пришлём уведомление.</p></div>{jobMessage && <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{jobMessage}</p>}{job?.status === "succeeded" && <button type="button" onClick={() => setActiveStep("clips")} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Перейти к фрагментам</button>}</section>}
        {/* Legacy inline creation controls remain below until the next wizard step removes them. */}
        <div className="hidden">
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
      </div>

      {jobMessage && activeStep !== "processing" && <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-900">{jobMessage}</p>}
      <WorkspaceMediaPickerModal open={pickerOpen} mediaKind="video" onClose={() => setPickerOpen(false)} onSelect={(file) => { setSourceFile(file); setSourceFileId(file.id); const nextDuration = Math.max(1, Math.round(file.media_metadata?.duration_seconds ?? 60)); setDuration(nextDuration); setRangeEnd(nextDuration); setPickerOpen(false); }} />
      {activeStep === "editor" && project && <ShortsEditorPanel
        key={project.id}
        clips={clips}
        draftUrls={draftUrls}
        initialSettings={{ style: subtitleStyle, position: subtitlePosition, fontSize: subtitleFontSize, textColor: subtitleTextColor, background: subtitleBackground, watermark, safeZone }}
        timedWords={timedWords}
        onSaveSettings={saveSubtitleSettings}
        onReorder={(fromIndex, toIndex) => void reorderClips(fromIndex, toIndex)}
        onOpenClips={() => { if (editProjectId) void getShortsSource(project.source_id || project.id).then((source)=>{setSourceClips(source.clips);setSourceEditProjects(source.edit_projects ?? []);setActiveStep("clips");}); else setActiveStep("clips"); window.history.replaceState(null, "", `/app/shorts?project=${encodeURIComponent(project.id)}&step=clips`); }}
        onDeleteClip={(clipId) => void removeClip(clipId)}
      />}
      {activeStep === "export" && project && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold text-slate-900">Экспорт</h2><p className="mt-2 text-sm text-slate-500">Настройки экспорта будут доступны на следующем этапе.</p></section>}
      {activeStep === "clips" && project && <ShortsClipsPanel clips={sourceClips.length ? sourceClips : clips} draftUrls={draftUrls} drafts={clipDrafts} saving={clipSaving} editClipIds={new Set(clips.map((clip)=>clip.id))} onAddToEditor={(clip)=>void addClipToCurrentEdit(clip)} onDraftChange={(id, draft) => setClipDrafts((items) => ({ ...items, [id]: draft }))} onSave={(clip) => void downloadClip(clip)} onMove={(index, direction) => void moveClip(index, direction)} onContinue={() => { if (!editProjectId) { void createMontageProject(); return; } setActiveStep("editor"); window.history.replaceState(null, "", `/app/shorts?project=${encodeURIComponent(project.id)}&step=editor`); }} />}
    </div>
  );
}