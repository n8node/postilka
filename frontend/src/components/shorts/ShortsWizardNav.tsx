"use client";

import { Check, ChevronRight, FolderKanban, Scissors, Sparkles, Subtitles, Upload, Video } from "lucide-react";

export type ShortsWizardStep = "projects" | "creation" | "processing" | "clips" | "editor" | "export";

export const shortsWizardSteps: Array<{ id: ShortsWizardStep; label: string }> = [
  { id: "projects", label: "Проекты" },
  { id: "creation", label: "Создание" },
  { id: "processing", label: "Обработка" },
  { id: "clips", label: "Фрагменты" },
  { id: "editor", label: "Редактор" },
  { id: "export", label: "Экспорт" },
];

const stepIcons = { projects: FolderKanban, creation: Upload, processing: Video, clips: Scissors, editor: Subtitles, export: Sparkles };

type ShortsWizardNavProps = { activeStep: ShortsWizardStep; completedSteps?: ShortsWizardStep[]; onStepChange?: (step: ShortsWizardStep) => void; canOpen?: (step: ShortsWizardStep) => boolean };

export function ShortsWizardNav({ activeStep, completedSteps = [], onStepChange, canOpen = () => true }: ShortsWizardNavProps) {
  const activeIndex = shortsWizardSteps.findIndex((step) => step.id === activeStep);
  return <nav aria-label="Этапы создания Shorts" className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
    {shortsWizardSteps.map((step, index) => {
      const active = step.id === activeStep;
      const available = canOpen(step.id);
      const Icon = stepIcons[step.id];
      const completed = completedSteps.includes(step.id) || (index > 0 && index < activeIndex);
      return <button key={step.id} type="button" disabled={!available || !onStepChange} onClick={() => onStepChange?.(step.id)} className={`group inline-flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-indigo-50 text-indigo-700" : available ? "text-slate-600 hover:bg-slate-50 hover:text-indigo-700" : "cursor-not-allowed text-slate-300"}`} aria-current={active ? "step" : undefined}>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>{completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span>{step.label}</span>{index < shortsWizardSteps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
      </button>;
    })}
  </nav>;
}