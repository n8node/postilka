"use client";

import { Plus, Save, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, deleteAdminStorageProvider, fetchAdminStorageProviders, saveAdminStorageProvider, testAdminStorageProvider, type StorageProviderAdminView } from "@/lib/api";

const emptyProvider = (id: string): StorageProviderAdminView => ({ id, name: "Новый провайдер", endpoint: "", bucket: "", region: "ru-central1", access_key: "", secret_key_set: false, use_ssl: true, path_style: true, enabled: false, cors_origins: [], cors_xml: "" });

export function AdminStorageSettingsPage() {
  const [items, setItems] = useState<StorageProviderAdminView[]>([]);
  const [selected, setSelected] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const current = items.find((item) => item.id === selected);

  async function load() {
    setLoading(true);
    try { const data = await fetchAdminStorageProviders(); setItems(data); if (!selected && data[0]) setSelected(data[0].id); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось загрузить провайдеров"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function update(patch: Partial<StorageProviderAdminView>) { if (current) setItems(items.map((item) => item.id === current.id ? { ...item, ...patch } : item)); }
  function payload() { if (!current) throw new Error("provider is not selected"); return { name: current.name.trim(), endpoint: current.endpoint.trim(), bucket: current.bucket.trim(), region: current.region.trim(), access_key: current.access_key.trim(), use_ssl: current.use_ssl, path_style: current.path_style, enabled: current.enabled, ...(secret.trim() ? { secret_key: secret.trim() } : {}) }; }
  async function save() { if (!current) return; setBusy(true); setError(""); try { const saved = await saveAdminStorageProvider(current.id, payload()); setItems(items.map((item) => item.id === saved.id ? saved : item)); setSecret(""); setMessage("Провайдер сохранён"); } catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось сохранить провайдера"); } finally { setBusy(false); } }
  async function test() { if (!current) return; setBusy(true); setError(""); try { if (secret.trim()) { const saved = await saveAdminStorageProvider(current.id, payload()); setItems(items.map((item) => item.id === saved.id ? saved : item)); setSecret(""); } const result = await testAdminStorageProvider(current.id); setMessage(result.message); } catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось проверить подключение"); } finally { setBusy(false); } }
  async function remove() { if (!current || !confirm("Удалить этого провайдера?")) return; setBusy(true); try { await deleteAdminStorageProvider(current.id); const next = items.filter((item) => item.id !== current.id); setItems(next); setSelected(next[0]?.id || ""); } catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось удалить провайдера"); } finally { setBusy(false); } }
  function add() { const id = crypto.randomUUID(); setItems([...items, emptyProvider(id)]); setSelected(id); setSecret(""); setMessage(""); }
  function toggleActive(value: boolean) { setItems(items.map((item) => ({ ...item, enabled: item.id === current?.id ? value : false }))); }

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-semibold text-slate-900">S3-совместимое хранилище</h1><p className="mt-1 text-sm text-slate-500">Добавляйте несколько провайдеров и переключайте активное хранилище.</p></div>
    {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
    {message && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{message}</div>}
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200"><button onClick={add} className="mb-2 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-slate-400 px-3 py-2 text-sm"><Plus className="h-4 w-4" /> Новый провайдер</button>{items.map((item) => <button key={item.id} onClick={() => { setSelected(item.id); setSecret(""); }} className={`mb-[-1px] shrink-0 border-b-2 px-4 py-2 text-sm ${item.id === selected ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600"}`}>{item.name || "Без названия"}{item.enabled && <span className="ml-2 text-xs text-green-600">● активен</span>}</button>)}</div>
    {!current ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Создайте первого провайдера.</div> : <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field label="Название провайдера" value={current.name} onChange={(value) => update({ name: value })} placeholder="REG.RU" />
      <Field label="Endpoint (URL)" value={current.endpoint} onChange={(value) => update({ endpoint: value })} placeholder="https://s3.regru.cloud" />
      <Field label="Bucket (имя бакета)" value={current.bucket} onChange={(value) => update({ bucket: value })} placeholder="my-bucket" />
      <Field label="Region" value={current.region} onChange={(value) => update({ region: value })} placeholder="ru-central1" />
      <Field label="Access Key ID" value={current.access_key} onChange={(value) => update({ access_key: value })} />
      <Field label="Secret Access Key" value={secret} onChange={setSecret} placeholder={current.secret_key_set ? "Новый ключ (текущий сохранён)" : "Secret Access Key"} password />
      <div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={current.use_ssl} onChange={(e) => update({ use_ssl: e.target.checked })} /> HTTPS (Use SSL)</label><label><input type="checkbox" checked={current.path_style} onChange={(e) => update({ path_style: e.target.checked })} /> Path-style адресация</label><label><input type="checkbox" checked={current.enabled} onChange={(e) => toggleActive(e.target.checked)} /> Активный провайдер</label></div>
      <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"><Save className="h-4 w-4" /> Сохранить</button><button disabled={busy} onClick={() => void test()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm"><Zap className="h-4 w-4" /> Проверка соединения</button><button disabled={busy} onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm text-red-700"><Trash2 className="h-4 w-4" /> Удалить</button></div>
      <p className="text-xs text-slate-500">Активным может быть только один провайдер. Переключение влияет на новые загрузки, генерации и чтение объектов.</p>
    </section>}
    {current?.cors_xml && <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">CORS для этого бакета</h2><pre className="mt-3 max-h-80 overflow-auto rounded-md bg-slate-50 p-4 text-xs">{current.cors_xml}</pre></section>}
  </div>;
}

function Field({ label, value, onChange, placeholder, password = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; password?: boolean }) { return <div><label className="mb-1.5 block text-sm font-medium">{label}</label><input type={password ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={password ? "new-password" : "off"} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>; }