"use client";

import { Check } from "lucide-react";

export type ShortsWizardStep = "projects" | "creation" | "processing" | "clips" | "editor" | "export";

export const shortsWizardSteps: Array<{ id: ShortsWizardStep; label: string }> = [
  { id: "projects", label: "Проекты" },
  { id: "creation", label: "Создание" },
  { id: "processing", label: "Обработка" },
  { id: "clips", label: "Фрагменты" },
  { id: "editor", label: "Редактор" },
  { id: "export", label: "Экспорт" },
];

type ShortsWizardNavProps = { activeStep: ShortsWizardStep; onStepChange?: (step: ShortsWizardStep) => void; canOpen?: (step: ShortsWizardStep) => boolean };

export function ShortsWizardNav({ activeStep, onStepChange, canOpen = () => true }: ShortsWizardNavProps) {
  const activeIndex = shortsWizardSteps.findIndex((step) => step.id === activeStep);
  return <nav aria-label="Этапы создания Shorts" className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
    {shortsWizardSteps.map((step, index) => {
      const active = step.id === activeStep;
      const available = canOpen(step.id);
      return <button key={step.id} type="button" disabled={!available || !onStepChange} onClick={() => onStepChange?.(step.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : available ? "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700" : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"}`} aria-current={active ? "step" : undefined}>
        {index > 0 && index < activeIndex ? <Check className="h-3.5 w-3.5" /> : null}{step.label}
      </button>;
    })}
  </nav>;
}