"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminMediaProviderRoutes,
  fetchAdminMediaProviders,
  updateAdminMediaProvider,
  updateAdminMediaProviderRoutes,
  type MediaProvider,
  type MediaProviderRoute,
} from "@/lib/api";

const DEFAULT_ROUTES: MediaProviderRoute[] = [
  { media_type: "image", provider_id: "kie", priority: 1, enabled: true },
  { media_type: "video", provider_id: "kie", priority: 1, enabled: true },
];

export function AdminMediaProvidersPage({ embedded = false }: { embedded?: boolean }) {
  const [providers, setProviders] = useState<MediaProvider[]>([]);
  const [routes, setRoutes] = useState<MediaProviderRoute[]>(DEFAULT_ROUTES);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingRoutes, setSavingRoutes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providerResult, routeResult] = await Promise.all([
        fetchAdminMediaProviders(),
        fetchAdminMediaProviderRoutes(),
      ]);
      setProviders(providerResult.providers);
      setRoutes(routeResult.routes.length ? routeResult.routes : DEFAULT_ROUTES);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить провайдеров");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function patchProvider(id: string, patch: Partial<MediaProvider>) {
    setProviders((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function saveProvider(provider: MediaProvider) {
    setSaving(provider.id); setError(null); setMessage(null);
    try {
      const apiKey = keys[provider.id]?.trim();
      const result = await updateAdminMediaProvider(provider.id, {
        display_name: provider.display_name,
        api_base_url: provider.api_base_url,
        enabled: provider.enabled,
        test_only: provider.test_only,
        ...(apiKey ? { api_key: apiKey } : {}),
      });
      patchProvider(provider.id, result.provider);
      setKeys((current) => ({ ...current, [provider.id]: "" }));
      setMessage(`Настройки ${provider.display_name} сохранены`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить провайдера");
    } finally { setSaving(null); }
  }

  function providerFor(mediaType: "image" | "video", priority: number) {
    return routes.find((route) => route.media_type === mediaType && route.priority === priority)?.provider_id ?? "";
  }

  function setRoute(mediaType: "image" | "video", priority: number, providerId: string) {
    setRoutes((current) => {
      const filtered = current.filter((route) => !(route.media_type === mediaType && route.priority === priority));
      return providerId ? [...filtered, { media_type: mediaType, provider_id: providerId, priority, enabled: true }] : filtered;
    });
  }

  async function saveRoutes() {
    setSavingRoutes(true); setError(null); setMessage(null);
    try { const result = await updateAdminMediaProviderRoutes(routes); setRoutes(result.routes); setMessage("Маршрутизация сохранена"); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось сохранить маршрутизацию"); }
    finally { setSavingRoutes(false); }
  }

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-5xl space-y-6"}>
      <div><h1 className="text-2xl font-semibold text-slate-900">AI — Провайдеры</h1><p className="mt-1 text-sm text-slate-500">Управление доступностью, тестовым режимом и приоритетом провайдеров изображений и видео.</p></div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div><h2 className="text-base font-semibold text-slate-900">Маршрутизация</h2><p className="mt-1 text-sm text-slate-500">Провайдеры с меньшим номером приоритета вызываются первыми. Пока runtime KIE сохраняется без изменений.</p></div>
        {(["image", "video"] as const).map((mediaType) => (
          <div key={mediaType} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">{mediaType === "image" ? "Изображения — основной" : "Видео — основной"}<select value={providerFor(mediaType, 1)} onChange={(e) => setRoute(mediaType, 1, e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Не выбран</option>{providers.filter((p) => p.enabled).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">{mediaType === "image" ? "Изображения — fallback" : "Видео — fallback"}<select value={providerFor(mediaType, 2)} onChange={(e) => setRoute(mediaType, 2, e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"><option value="">Не выбран</option>{providers.filter((p) => p.enabled).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>
          </div>
        ))}
        <button type="button" onClick={() => void saveRoutes()} disabled={savingRoutes} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" />{savingRoutes ? "Сохранение…" : "Сохранить маршрутизацию"}</button>
      </section>

      {providers.map((provider) => (
        <section key={provider.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div><h2 className="text-base font-semibold text-slate-900">{provider.display_name}</h2><p className="mt-1 text-xs text-slate-500">ID: {provider.id} · API-ключ: {provider.api_key_set ? "сохранён" : "не задан"}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">API Base URL<input value={provider.api_base_url} onChange={(e) => patchProvider(provider.id, { api_base_url: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium text-slate-700">Новый API Key<input type="password" value={keys[provider.id] ?? ""} onChange={(e) => setKeys((current) => ({ ...current, [provider.id]: e.target.value }))} placeholder={provider.api_key_set ? "Оставьте пустым, чтобы не менять" : "Введите ключ"} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          </div>
          <div className="flex flex-wrap gap-5 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={provider.enabled} onChange={(e) => patchProvider(provider.id, { enabled: e.target.checked })} />Включён для пользователей</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={provider.test_only} onChange={(e) => patchProvider(provider.id, { test_only: e.target.checked })} />Только для суперадмина</label></div>
          <button type="button" onClick={() => void saveProvider(provider)} disabled={saving === provider.id} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving === provider.id ? "Сохранение…" : "Сохранить провайдера"}</button>
        </section>
      ))}
    </div>
  );
}