"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, fetchAdminHeaderButtons, updateAdminHeaderButtons, type HeaderButton } from "@/lib/api";

const empty = (): HeaderButton => ({ id: crypto.randomUUID(), text: "Новая кнопка", icon: "", href: "/dashboard", color: "#111827", radius: 8, shadow: "sm" });
const shadowLabels = { none: "Нет", sm: "Маленькая", md: "Средняя", lg: "Большая" } as const;

export function AdminHeaderButtonsPage() {
  const [buttons, setButtons] = useState<HeaderButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void fetchAdminHeaderButtons().then((data) => setButtons(data.buttons ?? [])).catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить кнопки")).finally(() => setLoading(false)); }, []);
  function update(id: string, patch: Partial<HeaderButton>) { setButtons((all) => all.map((button) => button.id === id ? { ...button, ...patch } : button)); }
  function move(index: number, delta: number) { const next = [...buttons]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setButtons(next); }
  async function save() { setBusy(true); setError(""); setMessage(""); try { const data = await updateAdminHeaderButtons(buttons); setButtons(data.buttons); setMessage("Кнопки сохранены"); } catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось сохранить кнопки"); } finally { setBusy(false); } }
  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-semibold text-slate-900">Кнопки верхней панели</h1><p className="mt-1 text-sm text-slate-500">Кнопки отображаются в верхней панели кабинета слева направо.</p></div>
    {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}{message && <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Список кнопок</h2><button type="button" onClick={() => setButtons((all) => [...all, empty()])} className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm text-white"><Plus className="h-4 w-4" />Добавить</button></div>
      {loading ? <p className="text-sm text-slate-500">Загрузка…</p> : buttons.length === 0 ? <p className="text-sm text-slate-500">Кнопок пока нет.</p> : <div className="space-y-3">{buttons.map((button, index) => <div key={button.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-[1fr_1fr_1fr_120px_130px_auto]">
        <label className="text-xs text-slate-500">Текст<input value={button.text} onChange={(e) => update(button.id, { text: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900" /></label>
        <label className="text-xs text-slate-500">Ссылка<input value={button.href} onChange={(e) => update(button.id, { href: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900" /></label>
        <label className="text-xs text-slate-500">Иконка<select value={button.icon ?? ""} onChange={(e) => update(button.id, { icon: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"><option value="">Без иконки</option><option value="Sparkles">Sparkles</option><option value="Star">Star</option><option value="Zap">Zap</option><option value="ExternalLink">ExternalLink</option></select></label>
        <label className="text-xs text-slate-500">Цвет<input type="color" value={button.color} onChange={(e) => update(button.id, { color: e.target.value })} className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-300 bg-white p-1" /></label>
        <label className="text-xs text-slate-500">Радиус, px<input type="number" min="0" max="32" value={button.radius} onChange={(e) => update(button.id, { radius: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900" /></label>
        <label className="text-xs text-slate-500">Тень<select value={button.shadow} onChange={(e) => update(button.id, { shadow: e.target.value as HeaderButton["shadow"] })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900">{Object.entries(shadowLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <div className="flex items-end gap-1"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Выше"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === buttons.length - 1} onClick={() => move(index, 1)} className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Ниже"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => setButtons((all) => all.filter((item) => item.id !== button.id))} className="rounded p-2 text-red-500 hover:bg-red-50" aria-label="Удалить"><Trash2 className="h-4 w-4" /></button></div>
      </div>)}</div>}
      <button type="button" disabled={busy || loading} onClick={() => void save()} className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" />{busy ? "Сохранение…" : "Сохранить изменения"}</button>
    </section>
  </div>;
}