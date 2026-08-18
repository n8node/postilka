"use client";

import { useEffect, useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/api";

const TOGGLES: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "posts", label: "Публикации" },
  { key: "channels", label: "Каналы" },
  { key: "billing", label: "Тариф и кошелёк" },
  { key: "quota", label: "Лимиты тарифа" },
  { key: "ai", label: "Генерация картинок и видео" },
  { key: "files", label: "Файлы и корзина" },
  { key: "team", label: "Команда и согласование" },
  { key: "support", label: "Ответы в тикетах поддержки" },
];

export function NotificationSettingsBlock() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotificationPreferences()
      .then(setPrefs)
      .catch(() => setError("Не удалось загрузить настройки"));
  }, []);

  async function toggle(key: keyof NotificationPreferences, value: boolean) {
    if (!prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    setError("");
    try {
      const saved = await updateNotificationPreferences({ [key]: value });
      setPrefs(saved);
    } catch {
      setPrefs(prefs);
      setError("Не удалось сохранить");
    } finally {
      setSavingKey(null);
    }
  }

  if (!prefs) {
    return <p className="text-sm text-muted">{error || "Загрузка…"}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Что показывать в колокольчике. По умолчанию включено всё.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TOGGLES.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={prefs[item.key]}
              disabled={savingKey === item.key}
              onChange={(e) => void toggle(item.key, e.target.checked)}
              className="h-4 w-4 rounded border-border accent-zinc-900"
            />
            {item.label}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
