"use client";

import { Check, Loader2, Plus, Save } from "lucide-react";
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

export function ShortsClipsPanel({ clips, draftUrls, drafts, saving, onSave, onContinue, editClipIds, onAddToEditor }: Props) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Шаг 4 из 6</p><h2 className="mt-2 text-xl font-bold text-slate-900">Фрагменты</h2><p className="mt-1 text-sm text-slate-500">Выберите лучшие моменты и сохраните нужные фрагменты в монтаж.</p></div>{clips.length > 0 && <button type="button" onClick={onContinue} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Перейти в редактор</button>}</div>
    {clips.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Фрагменты появятся после завершения анализа видео.</div> : <div className="mt-6 flex flex-wrap items-start gap-5">{clips.map((clip, index) => { const draft = drafts[clip.id] ?? { start: String(clip.start_seconds), end: String(clip.end_seconds), text: clip.transcript_text, selected: clip.status === "selected" || clip.status === "draft" }; const score = Math.max(0, Math.min(100, Math.round(clip.score * 10))); const inMontage = editClipIds?.has(clip.id); return <article key={clip.id} className="w-full max-w-[312px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative aspect-[9/16] bg-slate-950">{draftUrls[clip.id] ? <video src={draftUrls[clip.id]} controls playsInline className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-violet-200"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Загрузка превью…</div>}<span className="absolute left-3 top-3 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">{time(Number(draft.start))} — {time(Number(draft.end))}</span></div><div className="space-y-3 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Фрагмент {index + 1}</p><span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">Оценка {score} / 100</span></div><div className="flex gap-2"><button type="button" disabled={saving[clip.id]} onClick={() => onSave(clip)} className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><Save className="mr-1 inline h-3.5 w-3.5" />{saving[clip.id] ? "Сохранение…" : "Сохранить"}</button>{onAddToEditor && <button type="button" disabled={inMontage} onClick={() => onAddToEditor(clip)} className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-default disabled:text-indigo-400">{inMontage ? <><Check className="mr-1 inline h-3.5 w-3.5" />В монтаже</> : <><Plus className="mr-1 inline h-3.5 w-3.5" />В монтаж</>}</button>}</div></div></article>; })}</div>}
  </section>;
}