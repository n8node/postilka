"use client";

import { ArrowDown, ArrowUp, Check, Loader2, Save, Plus } from "lucide-react";
import type { ShortsClip } from "@/lib/shorts-api";

export type ShortsClipDraft = { start: string; end: string; text: string; selected: boolean };

type Props = {
  clips: ShortsClip[];
  draftUrls: Record<string, string>;
  drafts: Record<string, ShortsClipDraft>;
  saving: Record<string, boolean>;
  onDraftChange: (id: string, draft: ShortsClipDraft) => void;
  onSave: (clip: ShortsClip) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onContinue: () => void;
  editClipIds?: Set<string>;
  onAddToEditor?: (clip: ShortsClip) => void;
};

const time = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;

export function ShortsClipsPanel({ clips, draftUrls, drafts, saving, onDraftChange, onSave, onMove, onContinue, editClipIds, onAddToEditor }: Props) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Шаг 4 из 6</p><h2 className="mt-2 text-xl font-bold text-slate-900">Фрагменты</h2><p className="mt-1 text-sm text-slate-500">Выберите лучшие моменты, поправьте таймкоды и текст субтитров.</p></div>{clips.length > 0 && <button type="button" onClick={onContinue} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Перейти в редактор</button>}</div>
    {clips.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Фрагменты появятся после завершения анализа видео.</div> : <div className="mt-6 flex flex-wrap items-start gap-5">{clips.map((clip, index) => { const draft = drafts[clip.id] ?? { start: String(clip.start_seconds), end: String(clip.end_seconds), text: clip.transcript_text, selected: clip.status === "selected" || clip.status === "draft" }; return <article key={clip.id} className="w-full max-w-[312px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative aspect-[9/16] bg-slate-950">{draftUrls[clip.id] ? <video src={draftUrls[clip.id]} controls playsInline className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-violet-200"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка превью…</div>}<span className="absolute left-3 top-3 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">{time(Number(draft.start))} — {time(Number(draft.end))}</span></div><div className="space-y-3 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Фрагмент {index + 1}</p><p className="mt-1 text-xs text-slate-500">Score {clip.score.toFixed(2)}</p></div><div className="flex gap-1">{onAddToEditor && <button type="button" disabled={editClipIds?.has(clip.id)} onClick={() => onAddToEditor(clip)} className="rounded-lg border border-indigo-200 px-2 py-1.5 text-xs font-semibold text-indigo-700 disabled:cursor-default disabled:bg-indigo-50 disabled:text-indigo-400">{editClipIds?.has(clip.id) ? <><Check className="mr-1 inline h-3.5 w-3.5"/>В монтаже</> : <><Plus className="mr-1 inline h-3.5 w-3.5"/>Добавить в редактор</>}</button>}<button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === clips.length - 1} onClick={() => onMove(index, 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button></div></div><label className="block text-xs font-semibold text-slate-600">Начало<input type="number" min="0" step="0.1" value={draft.start} onChange={(event) => onDraftChange(clip.id, { ...draft, start: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500" /></label><label className="block text-xs font-semibold text-slate-600">Конец<input type="number" min="0" step="0.1" value={draft.end} onChange={(event) => onDraftChange(clip.id, { ...draft, end: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500" /></label><label className="block text-xs font-semibold text-slate-600">Текст субтитров<textarea value={draft.text} onChange={(event) => onDraftChange(clip.id, { ...draft, text: event.target.value })} rows={4} className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-indigo-500" /></label><button type="button" onClick={() => onSave(clip)} disabled={saving[clip.id]} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving[clip.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Сохранить фрагмент</button></div></article>; })}</div>}
  </section>;
}