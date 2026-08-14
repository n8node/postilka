"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  fetchAdminAgentTemplates,
  updateAdminAgentTemplate,
  type AgentTemplate,
} from "@/lib/missions-api";

export function AdminAgentTemplatesPage({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<AgentTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const apply = useCallback((t: AgentTemplate) => {
    setSelectedId(t.id);
    setName(t.name);
    setDescription(t.description);
    setPrompt(t.prompt);
    setActive(t.is_active);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAgentTemplates();
      setItems(res.items);
      if (res.items[0]) apply(res.items[0]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateAdminAgentTemplate(selectedId, {
        name,
        description,
        prompt,
        is_active: active,
      });
      setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      apply(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl space-y-4 p-6"}>
      {!embedded ? <h1 className="text-lg font-semibold">Системные агенты</h1> : null}
      <p className="text-sm text-slate-600">
        Промпт системного Ai агента. Пользовательские шаблоны живут в кабинете.
      </p>
      {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {saved ? <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Сохранено</div> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => {
              const t = items.find((x) => x.id === e.target.value);
              if (t) apply(t);
            }}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {items.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <label className="block text-sm">
            Название
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Описание
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Системный промпт
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={16}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Активен
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить
          </button>
        </>
      )}
    </div>
  );
}
