"use client";

import { X } from "lucide-react";
import {
  type AdminFileDetail,
  type AdminFileAIGeneration,
} from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { generationModeLabels, type GenerationModeId } from "@/lib/generation-data";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function modeLabel(mode: string) {
  return generationModeLabels[mode as GenerationModeId] ?? mode;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function AIBlock({ ai }: { ai: AdminFileAIGeneration }) {
  return (
    <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
        AI-генерация
      </p>
      <div className="mt-3 space-y-0">
        <Row label="Режим" value={modeLabel(ai.mode)} />
        <Row label="Модель" value={ai.model || "—"} />
        <Row label="Соотношение" value={ai.aspect_ratio || "—"} />
        <Row
          label="Кредиты"
          value={`${ai.credit_cost} (${ai.quota_credits_used} из тарифа)`}
        />
        <Row
          label="С кошелька"
          value={ai.wallet_cents_charged > 0 ? formatRub(ai.wallet_cents_charged) : "—"}
        />
        <Row
          label="Длительность"
          value={ai.duration_ms > 0 ? `${(ai.duration_ms / 1000).toFixed(1)} с` : "—"}
        />
        <Row label="Создано" value={formatDateTime(ai.created_at)} />
      </div>
      {ai.prompt ? (
        <p className="mt-3 rounded-md bg-white/80 p-2 text-xs leading-relaxed text-slate-700">
          {ai.prompt}
        </p>
      ) : null}
      <p className="mt-2 font-mono text-[10px] text-slate-400">
        gen: {ai.generation_id}
      </p>
    </div>
  );
}

type AdminFileDetailPanelProps = {
  file: AdminFileDetail | null;
  loading: boolean;
  onClose: () => void;
};

export function AdminFileDetailPanel({
  file,
  loading,
  onClose,
}: AdminFileDetailPanelProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-l border-slate-200 bg-white lg:w-[360px]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Карточка файла</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-slate-500">Загрузка…</p>}
        {!loading && !file && (
          <p className="text-sm text-slate-500">Выберите файл в списке</p>
        )}
        {!loading && file && (
          <>
            <p className="break-all text-base font-semibold text-slate-900">{file.name}</p>
            <p className="mt-1 font-mono text-[10px] text-slate-400">{file.id}</p>
            <div className="mt-4 space-y-0">
              <Row label="Тип" value={file.mime_type} />
              <Row label="Размер" value={formatBytes(file.size)} />
              <Row label="Workspace" value={file.workspace_name} />
              <Row label="Папка" value={file.folder_name ?? "Корень"} />
              <Row
                label="Загрузил"
                value={file.uploader_name || file.uploader_email || "—"}
              />
              <Row label="Создан" value={formatDateTime(file.created_at)} />
              <Row label="Обновлён" value={formatDateTime(file.updated_at)} />
              <Row label="S3 key" value={<span className="break-all font-mono text-[10px]">{file.s3_key}</span>} />
              <Row
                label="Статус"
                value={file.deleted_at ? "В корзине" : "Активен"}
              />
            </div>
            {file.ai ? <AIBlock ai={file.ai} /> : null}
          </>
        )}
      </div>
    </aside>
  );
}
