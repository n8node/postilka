"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Play,
  Loader2,
  Plus,
  Trash2,
  Variable,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UploadCloud,
  Folder,
  Image as ImageIcon,
} from "lucide-react";
import type { WorkflowNode } from "@/lib/workflows-api";
import { uploadFile } from "@/lib/files-api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import { NODE_DEFINITIONS } from "./nodeTypes";

interface NodeInspectorProps {
  node: WorkflowNode | null;
  allNodes: WorkflowNode[];
  workflowId?: string;
  onClose: () => void;
  onUpdateNodeData: (nodeId: string, newData: Record<string, any>) => void;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
  onTestNode: (node: WorkflowNode) => Promise<{ outputs: Record<string, any> }>;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  allNodes,
  workflowId,
  onClose,
  onUpdateNodeData,
  onOpenMediaPicker,
  onTestNode,
}) => {
  const inspectorFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    outputs?: Record<string, any>;
    error?: string;
  } | null>(null);
  const [showVariablePickerFor, setShowVariablePickerFor] = useState<string | null>(null);

  if (!node) return null;

  const def = NODE_DEFINITIONS[node.type];
  const data = node.data || {};

  const handleFieldChange = (key: string, value: any) => {
    onUpdateNodeData(node.id, {
      ...data,
      [key]: value,
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestNode(node);
      setTestResult({ outputs: res.outputs });
    } catch (err: any) {
      setTestResult({ error: err?.message || "Ошибка при выполнении узла" });
    } finally {
      setTesting(false);
    }
  };

  // Upstream node variable suggestions
  const upstreamNodes = allNodes.filter((n) => n.id !== node.id);

  const insertVariable = (fieldKey: string, variableStr: string) => {
    const currentVal = (data[fieldKey] as string) || "";
    handleFieldChange(fieldKey, currentVal + " " + variableStr);
    setShowVariablePickerFor(null);
  };

  return (
    <aside
      onWheel={(e) => e.stopPropagation()}
      data-panel="inspector"
      className="absolute right-3 top-3 bottom-3 z-30 flex w-96 sm:w-[440px] max-h-[calc(100%-1.5rem)] flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md ${
              def?.color.badge || "bg-indigo-600 text-white"
            } text-xs shadow-sm`}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Настройки узла
            </h3>
            <p className="text-[10px] text-zinc-500">ID: {node.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4 text-xs">
        {/* Title Field */}
        <div>
          <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            Название узла
          </label>
          <input
            type="text"
            value={data.title || ""}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
            placeholder={def?.title || "Название..."}
          />
        </div>

        {/* Dynamic Fields per Node Type */}

        {/* 1. TRIGGER */}
        {node.type === "trigger" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Тип запуска
              </label>
              <select
                value={data.triggerType || "manual"}
                onChange={(e) => handleFieldChange("triggerType", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="manual">Ручной запуск (по кнопке)</option>
                <option value="schedule">По расписанию (Cron)</option>
                <option value="webhook">Входящий Webhook / RSS</option>
              </select>
            </div>
            {data.triggerType === "schedule" && (
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Расписание (Cron выражение)
                </label>
                <input
                  type="text"
                  value={data.scheduleCron || "0 9 * * *"}
                  onChange={(e) => handleFieldChange("scheduleCron", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="0 9 * * *"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  Например: каждый день в 09:00 МСК (0 9 * * *)
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. AI TEXT (YANDEX GPT) */}
        {node.type === "ai_text" && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Промпт для генерации
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "prompt" ? null : "prompt"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={4}
                value={data.prompt || ""}
                onChange={(e) => handleFieldChange("prompt", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Опишите тему, требования к посту, хештеги и CTA..."
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Роль / Системный промпт
              </label>
              <input
                type="text"
                value={data.role || "Опытный SMM-копирайтер"}
                onChange={(e) => handleFieldChange("role", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="SMM-копирайтер"
              />
            </div>
          </div>
        )}

        {/* 3. AI IMAGE */}
        {node.type === "ai_image" && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Промпт для изображения
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "prompt" ? null : "prompt"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={3}
                value={data.prompt || ""}
                onChange={(e) => handleFieldChange("prompt", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Digital art, futuristic composition, 4k..."
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Соотношение сторон
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {["1:1", "16:9", "9:16"].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleFieldChange("aspectRatio", ratio)}
                    className={`rounded-xl border py-1.5 text-center text-xs font-medium transition ${
                      (data.aspectRatio || "1:1") === ratio
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. AI VIDEO */}
        {node.type === "ai_video" && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Промпт / Сценарий видео
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "prompt" ? null : "prompt"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={3}
                value={data.prompt || ""}
                onChange={(e) => handleFieldChange("prompt", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Cinematic camera move, neon reflections..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Формат
                </label>
                <select
                  value={data.aspectRatio || "9:16"}
                  onChange={(e) => handleFieldChange("aspectRatio", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="9:16">9:16 (Shorts/Reels)</option>
                  <option value="16:9">16:9 (Горизонтальное)</option>
                  <option value="1:1">1:1 (Квадрат)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Длительность
                </label>
                <select
                  value={data.durationSeconds || 5}
                  onChange={(e) =>
                    handleFieldChange("durationSeconds", parseInt(e.target.value, 10))
                  }
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={5}>5 секунд</option>
                  <option value={10}>10 секунд</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 5. TELEGRAM NODE */}
        {node.type === "social_telegram" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Формат Telegram
              </label>
              <select
                value={data.format || "message"}
                onChange={(e) => handleFieldChange("format", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="message">Обычный пост / сообщение</option>
                <option value="story">Telegram Story (История)</option>
                <option value="video_note">Кружочек (Video Note)</option>
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Текст публикации
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={4}
                value={data.text || ""}
                onChange={(e) => handleFieldChange("text", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
            </div>

            {/* Telegram specific toggles */}
            <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!data.silent}
                  onChange={(e) => handleFieldChange("silent", e.target.checked)}
                  className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                  Без звука (Silent message)
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!data.pin}
                  onChange={(e) => handleFieldChange("pin", e.target.checked)}
                  className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                  Закрепить сообщение в канале (Pin)
                </span>
              </label>
            </div>

            {/* Inline Buttons Builder */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Инлайн-кнопки (URL)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const btns = Array.isArray(data.buttons) ? [...data.buttons] : [];
                    btns.push({ text: "Перейти на сайт 🚀", url: "https://postilka.ru" });
                    handleFieldChange("buttons", btns);
                  }}
                  className="flex items-center gap-1 text-[10px] text-sky-600 hover:text-sky-700"
                >
                  <Plus className="h-3 w-3" />
                  Добавить кнопку
                </button>
              </div>

              <div className="space-y-1.5">
                {Array.isArray(data.buttons) &&
                  data.buttons.map((btn: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={btn.text || ""}
                        onChange={(e) => {
                          const btns = [...data.buttons];
                          btns[idx].text = e.target.value;
                          handleFieldChange("buttons", btns);
                        }}
                        placeholder="Текст кнопки"
                        className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={btn.url || ""}
                        onChange={(e) => {
                          const btns = [...data.buttons];
                          btns[idx].url = e.target.value;
                          handleFieldChange("buttons", btns);
                        }}
                        placeholder="URL https://..."
                        className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const btns = data.buttons.filter((_: any, i: number) => i !== idx);
                          handleFieldChange("buttons", btns);
                        }}
                        className="p-1 text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. YOUTUBE NODE */}
        {node.type === "social_youtube" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Формат YouTube
              </label>
              <select
                value={data.format || "shorts"}
                onChange={(e) => handleFieldChange("format", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="shorts">YouTube Shorts (Вертикальное)</option>
                <option value="video">Обычное видео (Горизонтальное)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Заголовок видео (Title)
              </label>
              <input
                type="text"
                value={data.titleText || ""}
                onChange={(e) => handleFieldChange("titleText", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Заголовок ролика #shorts"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Описание (Description)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "description" ? null : "description"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 hover:bg-red-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={3}
                value={data.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Приватность
                </label>
                <select
                  value={data.privacyStatus || "public"}
                  onChange={(e) => handleFieldChange("privacyStatus", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="public">Публичное (Public)</option>
                  <option value="unlisted">Доступ по ссылке</option>
                  <option value="private">Приватное (Private)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Теги (через запятую)
                </label>
                <input
                  type="text"
                  value={data.tags || ""}
                  onChange={(e) => handleFieldChange("tags", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="shorts, ai, marketing"
                />
              </div>
            </div>
          </div>
        )}

        {/* 7. VK NODE */}
        {node.type === "social_vk" && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Текст записи ВКонтакте
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={4}
                value={data.text || ""}
                onChange={(e) => handleFieldChange("text", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.fromGroup !== false}
                  onChange={(e) => handleFieldChange("fromGroup", e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                  Опубликовать от имени сообщества
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!data.signed}
                  onChange={(e) => handleFieldChange("signed", e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                  Подпись автора публикации
                </span>
              </label>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Первый комментарий (опционально)
              </label>
              <input
                type="text"
                value={data.firstComment || ""}
                onChange={(e) => handleFieldChange("firstComment", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Ссылка на источник или дополнительный материал..."
              />
            </div>
          </div>
        )}

        {/* 7. FILES / MEDIA NODE */}
        {node.type === "files_media" && (
          <div className="space-y-3">
            <input
              type="file"
              ref={inspectorFileInputRef}
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                setUploadError(null);
                const localUrl = URL.createObjectURL(file);
                const isVid = file.type.startsWith("video/");
                handleFieldChange("fileUrl", localUrl);
                handleFieldChange("imageUrl", !isVid ? localUrl : undefined);
                handleFieldChange("videoUrl", isVid ? localUrl : undefined);
                handleFieldChange("fileName", file.name);
                handleFieldChange("mediaKind", isVid ? "video" : "image");

                try {
                  const res = await uploadFile(file);
                  const permUrl = await getCachedFileMediaUrl(res.id, "preview");
                  handleFieldChange("fileUrl", permUrl);
                  handleFieldChange("imageUrl", !isVid ? permUrl : undefined);
                  handleFieldChange("videoUrl", isVid ? permUrl : undefined);
                  handleFieldChange("fileId", res.id);
                  handleFieldChange("fileName", res.name);
                } catch (err: any) {
                  setUploadError("Upload failed");
                } finally {
                  setIsUploading(false);
                }
              }}
            />

            {/* Media Preview Box */}
            {data.fileUrl || data.imageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
                {data.mediaKind === "video" ? (
                  <video
                    src={(data.fileUrl as string) || (data.videoUrl as string)}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={(data.fileUrl as string) || (data.imageUrl as string)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            ) : null}

            {/* Upload / Pick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => inspectorFileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5 text-indigo-500" />
                )}
                <span>Загрузить с ПК</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenMediaPicker?.(node.id, "fileUrl")}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
              >
                <Folder className="h-3.5 w-3.5" />
                <span>Медиатека</span>
              </button>
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Прямая ссылка на файл (URL)
              </label>
              <input
                type="text"
                value={data.fileUrl || ""}
                onChange={(e) => {
                  handleFieldChange("fileUrl", e.target.value);
                  handleFieldChange("imageUrl", e.target.value);
                }}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {/* Variable Picker Helper Dropdown */}
        {showVariablePickerFor && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-indigo-950 dark:text-indigo-200">
                Вставить переменную из шагов:
              </span>
              <button
                onClick={() => setShowVariablePickerFor(null)}
                className="text-indigo-500 hover:text-indigo-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-40 space-y-1 overflow-y-auto">
              {upstreamNodes.length === 0 ? (
                <div className="text-[11px] text-zinc-500">
                  Нет других узлов на холсте
                </div>
              ) : (
                upstreamNodes.map((un) => {
                  const uDef = NODE_DEFINITIONS[un.type];
                  return (
                    <div key={un.id} className="space-y-1 py-1">
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                        {un.data.title || un.id} ({un.type}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {uDef?.outputs.map((out) => (
                          <button
                            key={out.id}
                            type="button"
                            onClick={() =>
                              insertVariable(
                                showVariablePickerFor!,
                                `{{ ${un.id}.${out.id} }}`
                              )
                            }
                            className="rounded bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 text-[11px] text-indigo-700 dark:text-indigo-300 font-mono shadow-sm hover:bg-indigo-600 hover:text-white transition"
                          >
                            .{out.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Test Node Execution Output */}
        {testResult && (
          <div
            className={`rounded-xl border p-3 text-xs ${
              testResult.error
                ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              {testResult.error ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{testResult.error ? "Ошибка выполнения" : "Результат шага"}</span>
            </div>
            {testResult.error ? (
              <p className="text-[11px]">{testResult.error}</p>
            ) : (
              <pre className="max-h-32 overflow-x-auto rounded bg-black/5 dark:bg-black/30 p-1.5 text-[10px] font-mono">
                {JSON.stringify(testResult.outputs, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Footer / Test Button */}
      <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 p-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 py-2.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition"
        >
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
          {testing ? "Выполняется тест..." : "Протестировать этот узел"}
        </button>
      </div>
    </aside>
  );
};
