"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createCompanyProfile, deleteCompanyProfile, fetchCompanyProfiles, updateCompanyProfile, type CompanyProfile, type CompanyProfileInput } from "@/lib/company-profiles-api";

const empty: CompanyProfileInput = { name: "", company_name: "", industry: "", description: "", website: "", target_audience: "", tone: "", text_instructions: "", banned_words: "", brand_color: "", visual_style: "", visual_avoid: "" };
const fields: { key: keyof CompanyProfileInput; label: string; placeholder?: string; area?: boolean }[] = [
  { key: "name", label: "Название профиля", placeholder: "Например, Основной профиль" },
  { key: "company_name", label: "Название компании" },
  { key: "industry", label: "Отрасль" },
  { key: "description", label: "Описание компании", area: true },
  { key: "website", label: "Сайт" },
  { key: "target_audience", label: "Целевая аудитория", area: true },
  { key: "tone", label: "Тон общения", placeholder: "Профессиональный, дружелюбный, уверенный" },
  { key: "text_instructions", label: "Правила для текста", placeholder: "Короткие абзацы, простой язык…", area: true },
  { key: "banned_words", label: "Запрещённые слова", placeholder: "Список через запятую" },
  { key: "brand_color", label: "Основной цвет", placeholder: "#4987F4" },
  { key: "visual_style", label: "Стиль изображений и видео", placeholder: "Современный, минималистичный…", area: true },
  { key: "visual_avoid", label: "Чего избегать в медиа", area: true },
];

export function CompanyProfilesSection() {
  const [items, setItems] = useState<CompanyProfile[]>([]);
  const [form, setForm] = useState<CompanyProfileInput>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function load() { try { setItems((await fetchCompanyProfiles()).items); } catch { setError("Не удалось загрузить профили"); } }
  useEffect(() => { void load(); }, []);
  function reset() { setEditing(null); setForm(empty); setError(null); }
  async function save() { setSaving(true); setError(null); try { if (editing) await updateCompanyProfile(editing, form); else await createCompanyProfile(form); reset(); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить профиль"); } finally { setSaving(false); } }
  async function remove(id: string) { if (!window.confirm("Удалить профиль компании?")) return; try { await deleteCompanyProfile(id); await load(); if (editing === id) reset(); } catch { setError("Не удалось удалить профиль"); } }
  return <div className="space-y-5">
    <div><h2 className="text-lg font-semibold text-text">Профили компании</h2><p className="mt-1 text-sm text-muted">Выберите профиль при генерации — его настройки будут добавлены к запросу для текста, фото и видео.</p></div>
    {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted">{[item.tone, item.company_name].filter(Boolean).join(" · ") || "Настройки не заполнены"}</p></div><div className="flex gap-1"><button type="button" className="rounded-md p-2 text-muted hover:bg-zinc-100" onClick={() => { setEditing(item.id); setForm({ ...item }); }} aria-label="Редактировать"><Pencil size={16} /></button><button type="button" className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-700" onClick={() => void remove(item.id)} aria-label="Удалить"><Trash2 size={16} /></button></div></div>)}</div>
    <Card className="p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{editing ? "Редактирование профиля" : "Новый профиль"}</h3>{editing ? <button type="button" className="text-sm text-muted hover:text-text" onClick={reset}>Отменить</button> : null}</div><div className="grid gap-4 sm:grid-cols-2">{fields.map(({ key, label, placeholder, area }) => <label key={key} className={area ? "sm:col-span-2" : ""}><span className="mb-1 block text-sm font-medium">{label}</span>{area ? <textarea value={String(form[key] ?? "")} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" /> : <input value={String(form[key] ?? "")} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />}</label>)}</div><button type="button" disabled={saving || !form.name.trim()} onClick={() => void save()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus size={16} />{saving ? "Сохранение…" : editing ? "Сохранить изменения" : "Создать профиль"}</button></Card>
  </div>;
}