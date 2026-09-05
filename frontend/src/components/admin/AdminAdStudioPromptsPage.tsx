"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminAdStudioSystemPrompts,
  updateAdminAdStudioSystemPrompt,
  type AdStudioSystemPrompt,
} from "@/lib/ad-studio";

const labels: Record<string, string> = {
  "combine/both": "Комбинация: товар и модель",
  "combine/product_only": "Комбинация: только товар",
  "combine/avatar_only": "Комбинация: только модель",
  "combine/none": "Комбинация: без референсов",
  "reference_to_video/default": "Референс → видео",
  "image_to_image/default": "Фото → фото",
  "text_to_image/default": "Текст → фото",
  "text_to_video/default": "Текст → видео",
  "image_to_video/default": "Фото → видео",
};

export function AdminAdStudioPromptsPage() {
  const [items, setItems] = useState<AdStudioSystemPrompt[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminAdStudioSystemPrompts().then((res) => setItems(res.items ?? [])).catch(() => setError("Не удалось загрузить промпты"));
  }, []);

  async function save(item: AdStudioSystemPrompt) {
    setSaving(item.id);
    setError(null);
    try {
      const res = await updateAdminAdStudioSystemPrompt(item.id, { prompt_text: item.prompt_text, is_active: item.is_active });
      setItems((current) => current.map((x) => (x.id === item.id ? res.item : x)));
    } catch {
      setError("Не удалось сохранить промпт");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div><h2 className="text-lg font-semibold text-slate-900">Системные промпты AI Studio</h2><p className="mt-1 text-sm text-slate-500">Эти промпты отправляются в KIE.ai. Промпт шаблона больше не используется.</p></div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-200 p-4">
          <div className="mb-2 flex items-center justify-between gap-3"><label className="text-sm font-medium text-slate-700">{labels[`${item.mode}/${item.scenario}`] ?? `${item.mode} / ${item.scenario}`}</label><label className="text-xs text-slate-500"><input type="checkbox" checked={item.is_active} onChange={(e) => setItems((current) => current.map((x) => x.id === item.id ? { ...x, is_active: e.target.checked } : x))} /> Активен</label></div>
          <textarea value={item.prompt_text} onChange={(e) => setItems((current) => current.map((x) => x.id === item.id ? { ...x, prompt_text: e.target.value } : x))} rows={4} className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm" />
          <button type="button" onClick={() => void save(item)} disabled={saving === item.id} className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{saving === item.id ? "Сохранение…" : "Сохранить"}</button>
        </div>
      ))}
    </div>
  );
}
