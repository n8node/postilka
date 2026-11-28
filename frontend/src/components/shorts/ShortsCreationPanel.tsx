"use client";

import { FileVideo, FolderOpen, Upload } from "lucide-react";
import type { WorkspaceFile } from "@/lib/files-api";

type ShortsCreationPanelProps = {
  sourceFile: WorkspaceFile | null;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  uploading: boolean;
  uploadProgress: number;
  duration: number;
  rangeStart: number;
  rangeEnd: number;
  contentType: string;
  contentTypes: readonly (readonly [string, string])[];
  onUpload: (file: File) => void;
  onOpenPicker: () => void;
  onDurationChange: (value: number) => void;
  onRangeStartChange: (value: number) => void;
  onRangeEndChange: (value: number) => void;
  onContentTypeChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  previewUrl?: string;
}

function formatBytes(size: number) {
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(1)} ГБ`;
  if (size >= 1024 ** 2) return `${Math.round(size / 1024 ** 2)} МБ`;
  return `${Math.round(size / 1024)} КБ`;
}

export function ShortsCreationPanel(props: ShortsCreationPanelProps) {
  const { sourceFile, projectName, onProjectNameChange, uploading, uploadProgress, duration, rangeStart, rangeEnd, contentType, contentTypes, onUpload, onOpenPicker, onDurationChange, onRangeStartChange, onRangeEndChange, onContentTypeChange, onSubmit, busy, previewUrl } = props;
  return <section className="grid gap-6 lg:grid-cols-2">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Шаг 1 из 2</p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">Исходное видео</h2>
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) onUpload(file); }} className="mt-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 p-6 text-center">
        <FileVideo className="mx-auto h-8 w-8 text-indigo-600" /><p className="mt-3 text-sm font-semibold text-slate-800">Перетащите видео сюда или выберите файл</p><p className="mt-1 text-xs text-slate-500">MP4, MOV, WebM, MKV · до 4 ГБ</p>
        <div className="mt-4 flex justify-center gap-2"><label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Upload className="mr-1 inline h-4 w-4" />Выбрать файл<input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} /></label><button type="button" onClick={onOpenPicker} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-400"><FolderOpen className="mr-1 inline h-4 w-4" />Из медиатеки</button></div>
      </div>
      {uploading && <div className="mt-4"><div className="flex justify-between text-xs font-medium text-slate-600"><span>Загрузка файла</span><span>{uploadProgress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} /></div></div>}
      <div className="mt-5 space-y-4"><label className="block text-sm font-medium text-slate-700">Название проекта<span className="ml-1 text-rose-500">*</span><input value={projectName} onChange={(event) => onProjectNameChange(event.target.value)} placeholder="Например, Выпуск подкаста 12" maxLength={160} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500" required /></label><label className="block text-sm font-medium text-slate-700">Тип видео<select value={contentType} onChange={(event) => onContentTypeChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500">{contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Начало, сек.<input type="number" min={0} max={duration} step={0.1} value={rangeStart} onChange={(event) => onRangeStartChange(Math.max(0, Number(event.target.value)))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900" /></label><label className="text-sm font-medium text-slate-700">Конец, сек.<input type="number" min={1} max={duration} step={0.1} value={rangeEnd} onChange={(event) => onRangeEndChange(Math.min(duration, Math.max(1, Number(event.target.value))))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900" /></label></div><label className="block text-sm font-medium text-slate-700">Длительность исходника, сек.<input type="number" min={1} step={0.1} value={duration} onChange={(event) => onDurationChange(Math.max(1, Number(event.target.value)))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900" /></label></div>
      <button type="button" onClick={onSubmit} disabled={busy || uploading || !sourceFile || !projectName.trim()} className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Создание проекта…" : "Создать проект"}</button>
    </div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold text-slate-900">Предпросмотр</h2>{sourceFile ? <><div className="relative mt-5 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800">{previewUrl ? <video src={previewUrl} muted playsInline controls preload="metadata" className="h-full w-full object-contain" aria-label={`Предпросмотр ${sourceFile.name}`} /> : <FileVideo className="h-16 w-16 text-white/30" />}</div><h3 className="mt-4 truncate text-base font-bold text-slate-900">{sourceFile.name}</h3><div className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-500"><span>◷ {duration.toFixed(1)} сек.</span><span>▣ {sourceFile.media_metadata?.width ?? "—"}×{sourceFile.media_metadata?.height ?? "—"}</span><span>{formatBytes(sourceFile.size)}</span><span>{sourceFile.mime_type.replace("video/", "").toUpperCase()}</span></div><p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Анализ будет выполнен в выбранном диапазоне: {rangeStart.toFixed(1)}–{rangeEnd.toFixed(1)} сек.</p></> : <div className="mt-5 flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-800 p-8 text-center text-sm text-indigo-100">После выбора видео здесь появятся его параметры и диапазон обработки.</div>}</div>
  </section>;
}