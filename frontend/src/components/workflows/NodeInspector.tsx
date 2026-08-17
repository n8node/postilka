"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Calendar,
  Clock,
  Info,
  Copy,
  Link2,
  Radio,
  Square,
} from "lucide-react";
import type { WorkflowNode } from "@/lib/workflows-api";
import {
  fetchWorkflowWebhook,
  startWorkflowWebhookTest,
  stopWorkflowWebhookTest,
  fetchWorkflowWebhookTestStatus,
  type WorkflowWebhookTestStatus,
} from "@/lib/workflows-api";
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

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [webhookListening, setWebhookListening] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] =
    useState<WorkflowWebhookTestStatus | null>(null);
  const webhookPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopWebhookPolling = useCallback(() => {
    if (webhookPollRef.current) {
      clearInterval(webhookPollRef.current);
      webhookPollRef.current = null;
    }
  }, []);

  const loadWebhookInfo = useCallback(async () => {
    if (!workflowId || node?.type !== "trigger") return;
    setWebhookLoading(true);
    setWebhookError(null);
    try {
      const info = await fetchWorkflowWebhook(workflowId);
      setWebhookUrl(info.webhook_url || "");
    } catch (err: any) {
      setWebhookError(err?.message || "Не удалось получить URL webhook");
    } finally {
      setWebhookLoading(false);
    }
  }, [workflowId, node?.type]);

  useEffect(() => {
    stopWebhookPolling();
    setWebhookListening(false);
    setWebhookTestStatus(null);
    if (node?.type === "trigger" && node.data?.triggerType === "webhook" && workflowId) {
      loadWebhookInfo();
    } else {
      setWebhookUrl("");
    }
    return () => stopWebhookPolling();
  }, [node?.id, node?.type, node?.data?.triggerType, workflowId, loadWebhookInfo, stopWebhookPolling]);

  const pollWebhookTest = useCallback(async () => {
    if (!workflowId) return;
    try {
      const status = await fetchWorkflowWebhookTestStatus(workflowId);
      setWebhookTestStatus(status);
      if (status.received || status.error || !status.listening) {
        setWebhookListening(false);
        stopWebhookPolling();
      }
    } catch (err: any) {
      setWebhookError(err?.message || "Ошибка проверки webhook");
      setWebhookListening(false);
      stopWebhookPolling();
    }
  }, [workflowId, stopWebhookPolling]);

  const handleStartWebhookTest = async () => {
    if (!workflowId) return;
    setWebhookError(null);
    setWebhookTestStatus(null);
    try {
      const status = await startWorkflowWebhookTest(workflowId);
      setWebhookTestStatus(status);
      setWebhookListening(true);
      stopWebhookPolling();
      webhookPollRef.current = setInterval(() => {
        pollWebhookTest();
      }, 2000);
      pollWebhookTest();
    } catch (err: any) {
      setWebhookError(err?.message || "Не удалось начать прослушивание");
    }
  };

  const handleStopWebhookTest = async () => {
    if (!workflowId) return;
    stopWebhookPolling();
    setWebhookListening(false);
    try {
      await stopWorkflowWebhookTest(workflowId);
      setWebhookTestStatus({ listening: false });
    } catch (err: any) {
      setWebhookError(err?.message || "Не удалось остановить прослушивание");
    }
  };

  const handleCopyWebhookUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch {
      setWebhookError("Не удалось скопировать URL");
    }
  };

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
                <option value="schedule">По расписанию (Календарь / Cron)</option>
                <option value="webhook">Входящий Webhook / RSS</option>
              </select>
            </div>

            {data.triggerType === "schedule" && (
              <div className="space-y-3 pt-1">
                {/* 1.1 Calendar Date/Time Picker */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Выбор в календаре (Дата и время)</span>
                    </label>
                    {data.scheduleDateTime && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange("scheduleDateTime", "")}
                        className="text-[10px] text-zinc-400 hover:text-red-500 transition"
                      >
                        Очистить
                      </button>
                    )}
                  </div>

                  <input
                    type="datetime-local"
                    value={data.scheduleDateTime || ""}
                    onChange={(e) => handleFieldChange("scheduleDateTime", e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  />

                  {/* Quick Date Presets */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        d.setHours(9, 0, 0, 0);
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T09:00`;
                        handleFieldChange("scheduleDateTime", iso);
                      }}
                      className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Завтра в 09:00
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setHours(d.getHours() + 1);
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                        handleFieldChange("scheduleDateTime", iso);
                      }}
                      className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Через 1 час
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                        handleFieldChange("scheduleDateTime", iso);
                      }}
                      className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Через 24 часа
                    </button>
                  </div>
                </div>

                {/* 1.2 Cron Expression */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                      <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Cron выражение (периодический запуск)</span>
                    </label>
                    {data.scheduleCron && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange("scheduleCron", "")}
                        className="text-[10px] text-zinc-400 hover:text-red-500 transition"
                      >
                        Очистить
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={data.scheduleCron || ""}
                    onChange={(e) => handleFieldChange("scheduleCron", e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                    placeholder="0 9 * * *"
                  />

                  {/* Quick Cron Presets */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleFieldChange("scheduleCron", "0 9 * * *")}
                      className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Каждый день в 09:00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange("scheduleCron", "0 12 * * 1-5")}
                      className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 transition"
                    >
                      По будням в 12:00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange("scheduleCron", "0 * * * *")}
                      className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 transition"
                    >
                      Раз в час
                    </button>
                  </div>
                </div>

                {/* 1.3 Conflict Banner (if both are specified) */}
                {data.scheduleDateTime && data.scheduleCron && (
                  <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1 text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Конфликт расписания: заданы календарь и cron</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                      <strong>Приоритет: Календарь.</strong> Если в кроне выставлено одно расписание, а в календаре выбрана дата — запуск будет произведён по календарю.
                    </p>
                  </div>
                )}

                {/* 1.4 Explanatory Hint */}
                <div className="rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 text-[11px] text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5 font-medium mb-0.5">
                    <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold">Правило приоритета:</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Если в кроне выставлено одно, а в календаре выставлено другое — приоритет всегда имеет календарь.
                  </p>
                </div>
              </div>
            )}

            {data.triggerType === "webhook" && (
              <div className="space-y-3 pt-1">
                <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                    <Link2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span>URL для входящего Webhook</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                    Отправьте POST, PUT или GET на этот адрес из внешнего сервиса (CRM, сайт, Zapier и т.д.), чтобы запустить процесс.
                  </p>

                  {webhookLoading ? (
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Генерация ссылки...</span>
                    </div>
                  ) : webhookUrl ? (
                    <div className="flex items-start gap-1.5">
                      <code className="flex-1 break-all rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-[10px] font-mono text-zinc-800 dark:text-zinc-200">
                        {webhookUrl}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyWebhookUrl}
                        title="Скопировать URL"
                        className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 text-zinc-500 hover:text-indigo-600 transition"
                      >
                        {webhookCopied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadWebhookInfo}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Получить URL webhook
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/40 p-3 space-y-2">
                  <label className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                    <Radio className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span>RSS-лента (опционально)</span>
                  </label>
                  <input
                    type="url"
                    value={data.rssFeedUrl || ""}
                    onChange={(e) => handleFieldChange("rssFeedUrl", e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="https://example.com/feed.xml"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Укажите RSS для автоматического опроса новых публикаций. Пока основной запуск — через webhook URL выше.
                  </p>
                </div>

                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                      Проверка соединения
                    </label>
                    {webhookListening && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Слушаем...
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Нажмите «Проверить соединение», затем отправьте тестовый запрос на URL webhook. Полученные данные появятся ниже.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {!webhookListening ? (
                      <button
                        type="button"
                        onClick={handleStartWebhookTest}
                        disabled={!webhookUrl || webhookLoading}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                      >
                        <Play className="h-3 w-3" />
                        Проверить соединение
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopWebhookTest}
                        className="flex items-center gap-1.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                      >
                        <Square className="h-3 w-3 fill-current" />
                        Остановить тестирование
                      </button>
                    )}
                  </div>

                  {webhookListening && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-2.5 py-2 text-[10px] text-amber-800 dark:text-amber-200">
                      Ожидаем входящий сигнал на webhook URL (до 2 минут)...
                    </div>
                  )}

                  {webhookTestStatus?.received && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5">
                      <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Сигнал получен
                      </div>
                      <pre className="max-h-36 overflow-auto rounded bg-black/5 dark:bg-black/30 p-1.5 text-[10px] font-mono text-zinc-800 dark:text-zinc-200">
                        {JSON.stringify(webhookTestStatus.received, null, 2)}
                      </pre>
                    </div>
                  )}

                  {webhookTestStatus?.error && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-2.5 py-2 text-[10px] text-amber-800 dark:text-amber-200">
                      {webhookTestStatus.error}
                    </div>
                  )}

                  {webhookError && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-2.5 py-2 text-[10px] text-red-700 dark:text-red-300">
                      {webhookError}
                    </div>
                  )}
                </div>
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
        {node.type === "trigger" && data.triggerType === "webhook" ? (
          <p className="text-center text-[10px] text-zinc-500 leading-relaxed">
            Для webhook используйте «Проверить соединение» выше
          </p>
        ) : (
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
        )}
      </div>
    </aside>
  );
};
