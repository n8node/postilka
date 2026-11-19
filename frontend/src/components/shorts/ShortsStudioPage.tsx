"use client";

import { useState } from "react";
import { createShortsProject } from "@/lib/shorts-api";

const contentTypes = [
  ["podcast", "Подкаст"],
  ["interview", "Интервью"],
  ["news", "Новости"],
  ["product_review", "Обзор товара"],
  ["vlog", "Влог"],
  ["stream", "Стрим"],
  ["other", "Другое"],
] as const;

export function ShortsStudioPage() {
  const [sourceFileId, setSourceFileId] = useState("");
  const [duration, setDuration] = useState(60);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(60);
  const [contentType, setContentType] = useState("podcast");
  const [jobMessage, setJobMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!sourceFileId.trim()) {
      setJobMessage("Укажите ID загруженного видео из медиатеки. Загрузка через S3 будет подключена следующим шагом.");
      return;
    }
    setBusy(true);
    setJobMessage("");
    try {
      const result = await createShortsProject({
        source_file_id: sourceFileId.trim(),
        content_type: contentType,
        language: "ru",
        source_duration_seconds: duration,
        processing_range: { start_seconds: rangeStart, end_seconds: rangeEnd },
      });
      setJobMessage(`Проект создан. Задача анализа: ${result.job.id}`);
    } catch (error) {
      setJobMessage(error instanceof Error ? error.message : "Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-white">
      <div className="mb-8">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/45">Postilka Studio</p>
        <h1 className="text-3xl font-semibold">Shorts Studio</h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Подготовка длинного видео к анализу и автоматической нарезке. Исходные материалы хранятся временно и не отправляются в KIE.ai.
        </p>
      </div>

      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-2">
        <label className="block text-sm text-white/70">
          ID видео в медиатеке
          <input value={sourceFileId} onChange={(e) => setSourceFileId(e.target.value)} placeholder="UUID файла" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-violet-400/60" />
        </label>
        <label className="block text-sm text-white/70">
          Тип видео
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
            {contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm text-white/70">
          Длительность исходника, сек.
          <input type="number" min={1} value={duration} onChange={(e) => { const value = Math.max(1, Number(e.target.value)); setDuration(value); setRangeEnd(Math.min(value, rangeEnd)); }} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
        </label>
        <div className="text-sm text-white/70">
          <p>Диапазон обработки</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input type="number" min={0} max={duration} value={rangeStart} onChange={(e) => setRangeStart(Math.max(0, Number(e.target.value)))} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" aria-label="Начало диапазона" />
            <input type="number" min={1} max={duration} value={rangeEnd} onChange={(e) => setRangeEnd(Math.min(duration, Math.max(1, Number(e.target.value))))} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" aria-label="Конец диапазона" />
          </div>
          <p className="mt-2 text-xs text-white/40">Можно обработать только часть видео, если минут тарифа недостаточно.</p>
        </div>
      </section>

      <div className="mt-6 flex items-center gap-4">
        <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-violet-500 px-5 py-3 font-medium transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Создание проекта…" : "Запустить анализ"}
        </button>
        {jobMessage && <p className="text-sm text-white/65">{jobMessage}</p>}
      </div>
    </main>
  );
}