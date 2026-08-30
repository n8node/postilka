"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
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
  ExternalLink,
  Split,
  GitFork,
  MessageSquare,
  Send,
  Eye,
  Pin,
  VolumeX,
  Shield,
  MapPin,
  ListPlus,
  Video,
  Film,
  FileText,
  HelpCircle,
  Layers,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { WorkflowNode } from "@/lib/workflows-api";
import {
  fetchWorkflowWebhook,
  startWorkflowWebhookTest,
  stopWorkflowWebhookTest,
  fetchWorkflowWebhookTestStatus,
  type WorkflowWebhookTestStatus,
} from "@/lib/workflows-api";
import {
  fetchChannels,
  fetchWorkspaceMembers,
  type ChannelListItem,
  type WorkspaceMember,
} from "@/lib/api";
import { uploadFile } from "@/lib/files-api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import {
  NODE_DEFINITIONS,
  socialFieldNeeds,
  validateAIImageNode,
  validateAIVideoNode,
  validateFormatterTemplate,
  validatePlainText,
  validatePromptRequired,
  validateSocialContent,
} from "./nodeTypes";
import {
  FieldNeedLabel,
  SocialMediaFields,
  SocialRequirementsBanner,
} from "./SocialMediaFields";
import {
  applyGenerationSlotValue,
  isGenerationSlotField,
  WorkflowAIImageFields,
  WorkflowAIVideoFields,
} from "./WorkflowGenerationFields";
import { useVariableDrag } from "./VariableDragContext";
import {
  applyVariableDrop,
  canAcceptVariable,
  dropModeForAccept,
  inferFieldAccept,
  parseVarPayload,
  rejectDropMessage,
  varDropAttrs,
} from "./variableDrag";
import { WorkflowMediaPreview, ButtonStylePicker } from "./WorkflowMediaPreview";
import { StoryAreaEditor } from "@/components/posts/StoryAreaEditor";
import {
  normalizeStorySettings,
  type TelegramStorySettings,
} from "@/lib/telegram-story";

interface NodeInspectorProps {
  node: WorkflowNode | null;
  allNodes: WorkflowNode[];
  workflowId?: string;
  layout?: "sidebar" | "form";
  onClose?: () => void;
  onUpdateNodeData: (nodeId: string, newData: Record<string, any>) => void;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
  onTestNode?: (node: WorkflowNode) => Promise<{ outputs: Record<string, any> }>;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  allNodes,
  workflowId,
  layout = "sidebar",
  onClose,
  onUpdateNodeData,
  onOpenMediaPicker,
  onTestNode,
}) => {
  const isFormLayout = layout === "form";
  const inspectorFileInputRef = useRef<HTMLInputElement>(null);
  const formRootRef = useRef<HTMLDivElement>(null);
  const { payload: dragPayload, dropError, setFocusedField, setDropError } =
    useVariableDrag();
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

  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingChannels(true);
    fetchChannels()
      .then((res) => {
        if (mounted && res?.items) {
          setChannels(res.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingChannels(false);
      });
    setLoadingMembers(true);
    fetchWorkspaceMembers()
      .then((res) => {
        if (mounted && res?.members) {
          setWorkspaceMembers(res.members);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingMembers(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = formRootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-var-field]");
    els.forEach((el) => {
      el.classList.remove(
        "ring-2",
        "ring-emerald-400",
        "ring-red-400",
        "ring-offset-1",
        "dark:ring-offset-zinc-900"
      );
      if (!dragPayload) return;
      const accept =
        el.dataset.varAccept || inferFieldAccept(el.dataset.varField || "");
      if (canAcceptVariable(accept, dragPayload.type)) {
        el.classList.add("ring-2", "ring-emerald-400", "ring-offset-1", "dark:ring-offset-zinc-900");
      } else {
        el.classList.add("ring-2", "ring-red-400", "ring-offset-1", "dark:ring-offset-zinc-900");
      }
    });
  }, [dragPayload]);

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

  const handleFieldChange = (keyOrUpdates: string | Record<string, any>, value?: any) => {
    if (typeof keyOrUpdates === "string") {
      onUpdateNodeData(node.id, {
        ...data,
        [keyOrUpdates]: value,
      });
    } else if (typeof keyOrUpdates === "object" && keyOrUpdates !== null) {
      onUpdateNodeData(node.id, {
        ...data,
        ...keyOrUpdates,
      });
    }
  };

  const handleTest = async () => {
    if (!onTestNode) return;
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
    const accept = inferFieldAccept(fieldKey);
    if (isGenerationSlotField(fieldKey)) {
      const currentVal = String(
        fieldKey.includes(".")
          ? (Array.isArray(data[fieldKey.split(".")[0]])
              ? data[fieldKey.split(".")[0]][Number(fieldKey.split(".")[1])]
              : "") || ""
          : data[fieldKey] || ""
      );
      handleFieldChange(
        applyGenerationSlotValue(
          data,
          fieldKey,
          applyVariableDrop(currentVal, variableStr, dropModeForAccept(accept))
        )
      );
      setShowVariablePickerFor(null);
      return;
    }
    const currentVal = (data[fieldKey] as string) || "";
    handleFieldChange(
      fieldKey,
      applyVariableDrop(currentVal, variableStr, dropModeForAccept(accept))
    );
    setShowVariablePickerFor(null);
  };

  const applyDropToField = (fieldKey: string, expression: string, sourceType: string) => {
    const accept = inferFieldAccept(fieldKey);
    if (!canAcceptVariable(accept, sourceType)) {
      setDropError(rejectDropMessage(accept, sourceType));
      return false;
    }
    if (isGenerationSlotField(fieldKey)) {
      const currentVal = String(
        fieldKey.includes(".")
          ? (Array.isArray(data[fieldKey.split(".")[0]])
              ? data[fieldKey.split(".")[0]][Number(fieldKey.split(".")[1])]
              : "") || ""
          : data[fieldKey] || ""
      );
      handleFieldChange(
        applyGenerationSlotValue(
          data,
          fieldKey,
          applyVariableDrop(currentVal, expression, dropModeForAccept(accept))
        )
      );
      return true;
    }
    if (fieldKey.startsWith("fieldValue:")) {
      const idx = Number(fieldKey.slice("fieldValue:".length));
      const next = [...(Array.isArray(data.fields) ? data.fields : [])];
      if (!next[idx]) return false;
      next[idx] = {
        ...next[idx],
        value: applyVariableDrop(
          String(next[idx].value || ""),
          expression,
          dropModeForAccept(accept)
        ),
      };
      handleFieldChange("fields", next);
      return true;
    }
    const currentVal = (data[fieldKey] as string) || "";
    handleFieldChange(
      fieldKey,
      applyVariableDrop(currentVal, expression, dropModeForAccept(accept))
    );
    return true;
  };

  const handleVarDragOver = (e: React.DragEvent) => {
    const fieldEl = (e.target as HTMLElement).closest("[data-var-field]") as
      | HTMLElement
      | null;
    if (!fieldEl) return;
    const payload = dragPayload || parseVarPayload(e.dataTransfer);
    if (!payload) return;
    const accept = fieldEl.dataset.varAccept || inferFieldAccept(fieldEl.dataset.varField || "");
    if (canAcceptVariable(accept, payload.type)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.preventDefault();
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleVarDrop = (e: React.DragEvent) => {
    const fieldEl = (e.target as HTMLElement).closest("[data-var-field]") as
      | HTMLElement
      | null;
    if (!fieldEl?.dataset.varField) return;
    const payload = dragPayload || parseVarPayload(e.dataTransfer);
    if (!payload) return;
    e.preventDefault();
    applyDropToField(fieldEl.dataset.varField, payload.expression, payload.type);
  };

  const handleVarFocus = (e: React.FocusEvent) => {
    const fieldEl = (e.target as HTMLElement).closest("[data-var-field]") as
      | HTMLElement
      | null;
    if (fieldEl?.dataset.varField) {
      setFocusedField(fieldEl.dataset.varField);
    }
  };

  const socialNeeds = socialFieldNeeds(node.type, data);
  const socialError = validateSocialContent(node.type, data);
  const promptError = validatePromptRequired(node.type, data);
  const aiImageError = node.type === "ai_image" ? validateAIImageNode(data) : null;
  const aiVideoError = node.type === "ai_video" ? validateAIVideoNode(data) : null;
  const plainTextError = validatePlainText(node.type, data);
  const formatterError = validateFormatterTemplate(node.type, data);

  const renderSocialMedia = (
    accentClass: string,
    labels?: { image?: string; video?: string }
  ) => (
    <SocialMediaFields
      data={data}
      nodeId={node.id}
      showImage={socialNeeds.image !== "hidden"}
      showVideo={socialNeeds.video !== "hidden"}
      imageNeed={socialNeeds.image}
      videoNeed={socialNeeds.video}
      imageLabel={labels?.image || "Фото"}
      videoLabel={labels?.video || "Видео"}
      accentClass={accentClass}
      showVariablePickerFor={showVariablePickerFor}
      setShowVariablePickerFor={setShowVariablePickerFor}
      onFieldChange={(key, value) => handleFieldChange(key, value)}
      onOpenMediaPicker={onOpenMediaPicker}
    />
  );

  const renderChannelSelector = (provider: string, providerTitle: string) => {
    const providerChannels = channels.filter(
      (c) => c.provider === provider && c.status !== "disabled"
    );
    const selectedChannelId = data.channelId || "";

    if (loadingChannels) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/40 p-2.5 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
          <span>Загрузка подключенных каналов...</span>
        </div>
      );
    }

    if (providerChannels.length === 0) {
      return (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-semibold text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Нет подключенных каналов {providerTitle}</span>
          </div>
          <p className="text-[11px] text-zinc-700 dark:text-zinc-400 leading-relaxed">
            Чтобы процесс мог публиковать посты, подключите канал {providerTitle} в разделе каналов.
          </p>
          <Link
            href="/channels"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Подключить {providerTitle}</span>
            <ExternalLink className="h-3 w-3 opacity-80" />
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
            Подключенный канал {providerTitle}
          </label>
          <Link
            href="/channels"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <span>Каналы</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
        <select
          value={selectedChannelId}
          onChange={(e) => {
            const chId = e.target.value;
            const targetCh = providerChannels.find((c) => c.id === chId);
            handleFieldChange({
              channelId: chId,
              channelName: targetCh ? targetCh.name : "",
            });
          }}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:border-indigo-500 focus:outline-none"
        >
          <option value="">-- Выберите канал из списка --</option>
          {providerChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name} {ch.bot_username ? `(@${ch.bot_username})` : ch.chat_id ? `(${ch.chat_id})` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const formBody = (
    <>
      {!isFormLayout && (
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
      )}

      <div
        ref={formRootRef}
        onDragOver={handleVarDragOver}
        onDrop={handleVarDrop}
        onFocusCapture={handleVarFocus}
        className={
          isFormLayout
            ? "space-y-4 text-xs"
            : "flex-1 min-h-0 space-y-4 overflow-y-auto p-4 text-xs"
        }
      >
        {dropError && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-[11px] font-medium text-red-700 dark:text-red-300">
            {dropError}
          </div>
        )}
        {/* Title Field */}
        <div>
          <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            Название узла
          </label>
          <input
            type="text"
            value={data.title || ""}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            {...varDropAttrs("title")}
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
                <option value="webhook">Входящий Webhook</option>
                <option value="rss">RSS-лента (новые записи)</option>
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

            {data.triggerType === "rss" && (
              <div className="space-y-3 pt-1">
                <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-950/20 p-3 space-y-2">
                  <label className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                    <Radio className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span>URL RSS-ленты</span>
                  </label>
                  <input
                    type="url"
                    value={data.rssFeedUrl || ""}
                    onChange={(e) => handleFieldChange("rssFeedUrl", e.target.value)}
                    {...varDropAttrs("rssFeedUrl")}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="https://example.com/feed.xml"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-500">Интервал опроса (мин)</label>
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        value={data.rssPollIntervalMinutes ?? 15}
                        onChange={(e) =>
                          handleFieldChange("rssPollIntervalMinutes", Number(e.target.value) || 15)
                        }
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-zinc-500">Новых записей за раз</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={data.rssMaxItemsPerRun ?? 1}
                        onChange={(e) =>
                          handleFieldChange("rssMaxItemsPerRun", Number(e.target.value) || 1)
                        }
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Worker опрашивает ленту и запускает процесс для новых записей. Доступны переменные{" "}
                    <code className="font-mono text-[9px]">{`{{ trigger_1.title }}`}</code>,{" "}
                    <code className="font-mono text-[9px]">{`{{ trigger_1.link }}`}</code>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. AI TEXT (YANDEX GPT) */}
        {node.type === "ai_text" && (
          <div className="space-y-3">
            <SocialRequirementsBanner error={promptError} hint="Промпт обязателен. Роль можно оставить по умолчанию." />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Промпт для генерации" need="required" />
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
                {...varDropAttrs("prompt")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Опишите тему, требования к посту, хештеги и CTA..."
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                <FieldNeedLabel label="Роль / Системный промпт" need="optional" />
              </label>
              <input
                type="text"
                value={data.role || "Опытный SMM-копирайтер"}
                onChange={(e) => handleFieldChange("role", e.target.value)}
                {...varDropAttrs("role")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="SMM-копирайтер"
              />
            </div>
          </div>
        )}

        {/* 2b. PLAIN TEXT (без AI) */}
        {node.type === "plain_text" && (
          <div className="space-y-2">
            <SocialRequirementsBanner error={plainTextError} hint="Текст обязателен. Переменные подставятся при запуске." />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Текст поста" need="required" />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={8}
                value={data.text || ""}
                onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none whitespace-pre-wrap"
                placeholder="Напишите текст публикации вручную. Можно использовать переменные: {{ ai_text_1.text }}"
              />
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Без списания AI-квоты. Текст передаётся на выход как есть; переменные вида{" "}
              <code className="font-mono text-[9px]">{`{{ node_id.field }}`}</code> подставляются при запуске процесса.
            </p>
          </div>
        )}

        {node.type === "ai_image" && (
          <WorkflowAIImageFields
            data={data}
            nodeId={node.id}
            error={aiImageError}
            showVariablePickerFor={showVariablePickerFor}
            setShowVariablePickerFor={setShowVariablePickerFor}
            onPatch={(updates) => handleFieldChange(updates)}
            onOpenMediaPicker={onOpenMediaPicker}
          />
        )}

        {node.type === "ai_video" && (
          <WorkflowAIVideoFields
            data={data}
            nodeId={node.id}
            error={aiVideoError}
            showVariablePickerFor={showVariablePickerFor}
            setShowVariablePickerFor={setShowVariablePickerFor}
            onPatch={(updates) => handleFieldChange(updates)}
            onOpenMediaPicker={onOpenMediaPicker}
          />
        )}

        {/* 5. TELEGRAM NODE */}
        {node.type === "social_telegram" && (() => {
          const currentTgChannel = channels.find((c) => c.id === data.channelId);
          const caps = currentTgChannel?.publish_capabilities;
          const canStories = caps?.formats ? caps.formats.includes("story") : true;
          const canVideoNotes = caps?.composer_video_note ?? true;
          const canPin = caps?.composer_pin ?? true;
          const canSilent = caps?.composer_silent ?? true;
          const canButtons = caps?.inline_buttons ?? true;
          const currentFormat = data.format || "message";

          return (
            <div className="space-y-3">
              {renderChannelSelector("telegram", "Telegram")}

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Формат Telegram
                </label>
                <select
                  value={currentFormat}
                  onChange={(e) => handleFieldChange("format", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-medium"
                >
                  <option value="message">Обычный пост (текст / фото / видео)</option>
                  {canStories && <option value="story">Telegram История (Story)</option>}
                  {canVideoNotes && <option value="video_note">Кружочек (Video Note)</option>}
                </select>
              </div>

              <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

              {currentFormat === "message" && (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        <FieldNeedLabel label="Текст публикации" need={socialNeeds.text} />
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
                {...varDropAttrs("text")}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="{{ ai_text_1.text }}"
                    />
                  </div>

                  {renderSocialMedia(
                    "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100"
                  )}

                  {/* Media delivery: together vs separate */}
                  <div className="space-y-2">
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 text-xs">
                      Доставка медиа и текста
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleFieldChange("mediaLayout", "separate")}
                        className={`rounded-xl border p-2 text-xs font-medium transition ${
                          (data.mediaLayout || "separate") === "separate"
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        Разными сообщениями
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFieldChange("mediaLayout", "caption")}
                        className={`rounded-xl border p-2 text-xs font-medium transition ${
                          data.mediaLayout === "caption"
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        Одним сообщением
                      </button>
                    </div>

                    {data.mediaLayout === "caption" ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Текст относительно медиа
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleFieldChange("mediaPosition", "above")}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition ${
                              data.mediaPosition === "above"
                                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                            Текст сверху
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange("mediaPosition", "below")}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition ${
                              (data.mediaPosition || "below") === "below"
                                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                            Текст снизу
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Порядок в канале
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleFieldChange("mediaOrder", "media_first")}
                            className={`rounded-xl border p-2 text-xs font-medium transition ${
                              (data.mediaOrder || "media_first") === "media_first"
                                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            Сначала медиа
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange("mediaOrder", "text_first")}
                            className={`rounded-xl border p-2 text-xs font-medium transition ${
                              data.mediaOrder === "text_first"
                                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            Сначала текст
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Telegram Options */}
                  <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5">
                    {canSilent && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!data.silent}
                          onChange={(e) => handleFieldChange("silent", e.target.checked)}
                          className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                          Без звука (тихое сообщение)
                        </span>
                      </label>
                    )}

                    {canPin && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!data.pin}
                          onChange={(e) => handleFieldChange("pin", e.target.checked)}
                          className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                          Закрепить сообщение в канале
                        </span>
                      </label>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!data.protectContent}
                        onChange={(e) => handleFieldChange("protectContent", e.target.checked)}
                        className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                        Защита контента (запретить пересылку и сохранение)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!data.disableLinkPreview}
                        onChange={(e) => handleFieldChange("disableLinkPreview", e.target.checked)}
                        className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                        Отключить предпросмотр ссылок (Web Page Preview)
                      </span>
                    </label>
                  </div>

                  {/* Inline Buttons Builder */}
                  {canButtons && (() => {
                    const rawBtns = data.buttons;
                    const buttonRows: Array<Array<{ text: string; url: string; style?: string }>> =
                      !Array.isArray(rawBtns)
                        ? []
                        : rawBtns.length === 0
                        ? []
                        : Array.isArray(rawBtns[0])
                        ? (rawBtns as Array<Array<{ text: string; url: string; style?: string }>>)
                        : [(rawBtns as Array<{ text: string; url: string; style?: string }>)];

                    const updateRows = (
                      newRows: Array<Array<{ text: string; url: string; style?: string }>>
                    ) => {
                      handleFieldChange("buttons", newRows);
                    };

                    const addRow = () => {
                      updateRows([
                        ...buttonRows,
                        [{ text: "Подробнее 🚀", url: "https://postilka.ru", style: "default" }],
                      ]);
                    };

                    const addButtonToRow = (rowIndex: number) => {
                      const next = buttonRows.map((r) => [...r]);
                      next[rowIndex].push({
                        text: "Кнопка",
                        url: "https://postilka.ru",
                        style: "default",
                      });
                      updateRows(next);
                    };

                    const updateButton = (
                      rowIndex: number,
                      btnIndex: number,
                      patch: Partial<{ text: string; url: string; style: string }>
                    ) => {
                      const next = buttonRows.map((r) => r.map((b) => ({ ...b })));
                      next[rowIndex][btnIndex] = { ...next[rowIndex][btnIndex], ...patch };
                      updateRows(next);
                    };

                    const removeButton = (rowIndex: number, btnIndex: number) => {
                      let next = buttonRows.map((r) => r.filter((_, idx) => idx !== btnIndex));
                      next = next.filter((r) => r.length > 0);
                      updateRows(next);
                    };

                    const removeRow = (rowIndex: number) => {
                      const next = buttonRows.filter((_, idx) => idx !== rowIndex);
                      updateRows(next);
                    };

                    return (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                            Инлайн-кнопки (строки и цвета)
                          </label>
                          <button
                            type="button"
                            onClick={addRow}
                            className="flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800 transition"
                          >
                            <Plus className="h-3 w-3" />
                            Добавить строку
                          </button>
                        </div>

                        {buttonRows.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-3 text-center text-[11px] text-zinc-400">
                            Кнопки не добавлены. Нажмите «Добавить строку», чтобы создать кнопки.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {buttonRows.map((row, rowIndex) => (
                              <div
                                key={rowIndex}
                                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/40 p-2.5 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Строка {rowIndex + 1} ({row.length} {row.length === 1 ? "кнопка" : "кнопок"})
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => addButtonToRow(rowIndex)}
                                      className="flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 hover:underline px-1 py-0.5 font-medium"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                      Кнопка в строку
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeRow(rowIndex)}
                                      className="p-1 text-zinc-400 hover:text-red-500 transition"
                                      title="Удалить строку"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  {row.map((btn, btnIndex) => (
                                    <div key={btnIndex} className="flex items-center gap-1.5 min-w-0">
                                      <input
                                        type="text"
                                        value={btn.text || ""}
                                        onChange={(e) =>
                                          updateButton(rowIndex, btnIndex, { text: e.target.value })
                                        }
                                        placeholder="Текст кнопки"
                                        className="min-w-0 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                      />
                                      <input
                                        type="text"
                                        value={btn.url || ""}
                                        onChange={(e) =>
                                          updateButton(rowIndex, btnIndex, { url: e.target.value })
                                        }
                                        placeholder="https://..."
                                        className="min-w-0 flex-[1.2] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                                      />
                                      <ButtonStylePicker
                                        value={btn.style || "default"}
                                        onChange={(style) =>
                                          updateButton(rowIndex, btnIndex, { style })
                                        }
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeButton(rowIndex, btnIndex)}
                                        className="p-1 text-zinc-400 hover:text-red-500 transition shrink-0"
                                        title="Удалить кнопку"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}

              {currentFormat === "story" && (
                <div className="space-y-3">
                  {renderSocialMedia(
                    "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100"
                  )}
                  <div>
                    <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                      <FieldNeedLabel
                        label="Подпись к истории (до 200 символов)"
                        need={socialNeeds.text}
                      />
                    </label>
                    <input
                      type="text"
                      value={data.text || ""}
                      onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                      placeholder="Подпись к истории..."
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <StoryAreaEditor
                    settings={normalizeStorySettings(
                      (data.telegramStory as TelegramStorySettings) || undefined
                    )}
                    mediaPreviewUrl={data.imageUrl || data.videoUrl || data.mediaUrl || null}
                    onChange={(next) => handleFieldChange("telegramStory", next)}
                  />
                </div>
              )}

              {currentFormat === "video_note" && (
                <div className="space-y-3">
                  {renderSocialMedia(
                    "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100"
                  )}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="font-medium text-zinc-700 dark:text-zinc-300">
                        <FieldNeedLabel
                          label="Текст отдельным сообщением"
                          need={socialNeeds.text}
                        />
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
                      rows={3}
                      value={data.text || ""}
                      onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                      placeholder="Подпись отправится следом за кружочком..."
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Кружочек и текст уходят двумя сообщениями, как в композере.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!data.silent}
                      onChange={(e) => handleFieldChange("silent", e.target.checked)}
                      className="rounded border-zinc-300 text-sky-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                      Без звука
                    </span>
                  </label>
                </div>
              )}
            </div>
          );
        })()}

        {/* 5b. MAX NODE */}
        {node.type === "social_max" && (
          <div className="space-y-3">
            {renderChannelSelector("max", "MAX")}
            <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Текст сообщения" need={socialNeeds.text} />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={5}
                value={data.text || ""}
                onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
            </div>

              {renderSocialMedia(
                "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100"
              )}

              {/* MAX Options */}
              <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!data.silent}
                    onChange={(e) => handleFieldChange("silent", e.target.checked)}
                    className="rounded border-zinc-300 text-violet-600"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                    Без звука (тихое уведомление)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!data.pin}
                    onChange={(e) => handleFieldChange("pin", e.target.checked)}
                    className="rounded border-zinc-300 text-violet-600"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                    Закрепить сообщение в MAX
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!data.disableLinkPreview}
                    onChange={(e) => handleFieldChange("disableLinkPreview", e.target.checked)}
                    className="rounded border-zinc-300 text-violet-600"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                    Отключить предпросмотр ссылок
                  </span>
                </label>
              </div>

              {/* Inline Buttons Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300 text-xs">
                    Инлайн-кнопки со ссылками
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const btns = Array.isArray(data.buttons) ? [...data.buttons] : [];
                      btns.push({ text: "Подробнее 🚀", url: "https://postilka.ru" });
                      handleFieldChange("buttons", btns);
                    }}
                    className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 font-medium"
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
                          className="w-1/2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={btn.url || ""}
                          onChange={(e) => {
                            const btns = [...data.buttons];
                            btns[idx].url = e.target.value;
                            handleFieldChange("buttons", btns);
                          }}
                          placeholder="https://..."
                          className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const btns = data.buttons.filter((_: any, i: number) => i !== idx);
                            handleFieldChange("buttons", btns);
                          }}
                          className="p-1 text-zinc-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
        )}

        {/* 6. VK NODE */}
        {node.type === "social_vk" && (
          <div className="space-y-3">
            {renderChannelSelector("vk", "ВКонтакте")}
            <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Формат ВКонтакте
              </label>
              <select
                value={data.format || "wall_post"}
                onChange={(e) => handleFieldChange("format", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-medium"
              >
                <option value="wall_post">Запись на стене (Пост)</option>
                <option value="clip">VK Клип (Короткое видео)</option>
                <option value="story">История (Story)</option>
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Текст записи ВКонтакте" need={socialNeeds.text} />
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
                {...varDropAttrs("text")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
            </div>

            {renderSocialMedia(
              "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
            )}

            <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
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

              <label className="flex items-center gap-2 cursor-pointer">
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.donutOnly}
                  onChange={(e) => handleFieldChange("donutOnly", e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600"
                />
                <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                  Только для донов (VK Donut)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.closeComments}
                  onChange={(e) => handleFieldChange("closeComments", e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600"
                />
                <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                  Отключить комментарии
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
                {...varDropAttrs("firstComment")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Ссылка на источник или дополнительный материал..."
              />
            </div>
          </div>
        )}

        {/* 7. YOUTUBE NODE */}
        {node.type === "social_youtube" && (
          <div className="space-y-3">
            {renderChannelSelector("youtube", "YouTube")}
            <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Формат YouTube
              </label>
              <select
                value={data.format || "shorts"}
                onChange={(e) => handleFieldChange("format", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-medium"
              >
                <option value="shorts">YouTube Shorts (Вертикальное до 60 сек)</option>
                <option value="video">Обычное видео (Горизонтальное)</option>
              </select>
            </div>

            {renderSocialMedia(
              "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100",
              { image: "Обложка / фото", video: "Видео" }
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel
                    label="Заголовок видео"
                    need={socialNeeds.titleText || "required"}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "titleText" ? null : "titleText"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 hover:bg-red-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <input
                type="text"
                value={data.titleText || ""}
                onChange={(e) => handleFieldChange("titleText", e.target.value)}
                {...varDropAttrs("titleText")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none font-medium"
                placeholder="Заголовок ролика #shorts"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Текст / описание" need={socialNeeds.text} />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
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
                value={data.text || data.description || ""}
                onChange={(e) =>
                  handleFieldChange({
                    text: e.target.value,
                    description: e.target.value,
                  })
                }
                {...varDropAttrs("text")}
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
                  Теги
                </label>
                <input
                  type="text"
                  value={data.tags || ""}
                  onChange={(e) => handleFieldChange("tags", e.target.value)}
                  {...varDropAttrs("tags")}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="shorts, ai, marketing"
                />
              </div>
            </div>
          </div>
        )}

        {/* 7b. DZEN NODE */}
        {node.type === "social_dzen" && (
          <div className="space-y-3">
            {renderChannelSelector("dzen", "Дзен")}
            <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Формат Дзен
              </label>
              <select
                value={data.format || "brief"}
                onChange={(e) => handleFieldChange("format", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
              >
                <option value="brief">Короткий пост (Пост в ленту)</option>
                <option value="article">Статья (Лонгрид)</option>
                <option value="video">Видео</option>
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel
                    label={data.format === "article" ? "Текст статьи" : "Текст поста"}
                    need={socialNeeds.text}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={4}
                value={data.text || ""}
                onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
            </div>

            {renderSocialMedia(
              "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100"
            )}
          </div>
        )}

        {node.type === "social_photochka" && (
          <div className="space-y-3">
            {renderChannelSelector("photochka", "Photochka")}
            <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Текст поста" need={socialNeeds.text} />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "text" ? null : "text"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={4}
                value={data.text || ""}
                onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs font-mono"
                placeholder="{{ ai_text_1.text }}"
              />
              <p className="mt-1 text-[10px] text-zinc-500">
                До 3000 символов. Фото и видео перетащите в поля ниже или выберите из медиатеки.
              </p>
            </div>

            {renderSocialMedia(
              "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100"
            )}
          </div>
        )}

        {node.type === "draft_approval" && (() => {
          const activeChannels = channels.filter((c) => c.status !== "disabled");
          const approverIds = Array.isArray(data.approverUserIds)
            ? (data.approverUserIds as string[])
            : [];
          const approverMembers = workspaceMembers.filter(
            (member) =>
              member.status !== "suspended" &&
              (member.role === "owner" ||
                member.role === "admin" ||
                member.role === "editor")
          );
          const toggleApprover = (userId: string) => {
            const next = approverIds.includes(userId)
              ? approverIds.filter((id) => id !== userId)
              : [...approverIds, userId];
            handleFieldChange("approverUserIds", next);
          };

          return (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-3 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                Процесс создаст публикацию со статусом «На согласовании» и остановится.
                После решения в разделе постов публикация уйдёт в выбранный канал, а прогон завершится.
              </div>

              <SocialRequirementsBanner error={socialError} hint={socialNeeds.hint} />

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    <FieldNeedLabel label="Текст публикации" need={socialNeeds.text} />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowVariablePickerFor(
                        showVariablePickerFor === "text" ? null : "text"
                      )
                    }
                    className="flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                  >
                    <Variable className="h-3 w-3" />
                    Переменная
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={data.text || ""}
                  onChange={(e) => handleFieldChange("text", e.target.value)}
                {...varDropAttrs("text")}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs font-mono"
                  placeholder="{{ ai_text_1.text }}"
                />
              </div>

              {renderSocialMedia(
                "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                  Канал публикации
                </label>
                {loadingChannels ? (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Загрузка каналов...
                  </div>
                ) : activeChannels.length === 0 ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Нет подключённых каналов. Можно взять канал со следующего шага публикации.
                  </p>
                ) : (
                  <select
                    value={data.channelId || ""}
                    onChange={(e) => {
                      const ch = activeChannels.find((c) => c.id === e.target.value);
                      handleFieldChange({
                        channelId: e.target.value,
                        channelName: ch ? ch.name : "",
                      });
                    }}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">
                      Взять канал со следующего шага
                    </option>
                    {activeChannels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name} ({ch.provider})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                  Кто согласовывает
                </label>
                {loadingMembers ? (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Загрузка команды...
                  </div>
                ) : approverMembers.length === 0 ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    В команде нет редакторов или администраторов. Добавьте участников в настройках команды.
                  </p>
                ) : (
                  <div className="space-y-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2">
                    {approverMembers.map((member) => {
                      const checked = approverIds.includes(member.user_id);
                      return (
                        <label
                          key={member.user_id}
                          className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/70"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleApprover(member.user_id)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">
                            {member.name?.trim() || member.email}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px] text-zinc-400">
                            {member.role === "owner"
                              ? "Владелец"
                              : member.role === "admin"
                              ? "Администратор"
                              : "Редактор"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {approverIds.length === 0 && !loadingMembers && (
                  <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
                    Без согласующих шаг не отправит публикацию.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                  Желаемое время публикации
                </label>
                <input
                  type="datetime-local"
                  value={data.dueAt || ""}
                  onChange={(e) => handleFieldChange("dueAt", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  Необязательно. Согласующий сможет опубликовать сразу или оставить это время.
                </p>
              </div>
            </div>
          );
        })()}

        {/* 8. SWITCH NODE */}
        {node.type === "switch" && (() => {
          const switchOperators = [
            { value: "not_empty", label: "Не пусто (заполнено)" },
            { value: "is_empty", label: "Пусто (пустая строка)" },
            { value: "equals", label: "Равно ( = )" },
            { value: "not_equals", label: "Не равно ( != )" },
            { value: "contains", label: "Содержит подстроку" },
            { value: "not_contains", label: "Не содержит" },
            { value: "starts_with", label: "Начинается с" },
            { value: "ends_with", label: "Заканчивается на" },
            { value: "greater_than", label: "Больше ( > )" },
            { value: "less_than", label: "Меньше ( < )" },
            { value: "greater_than_or_equal", label: "Больше или равно ( >= )" },
            { value: "less_than_or_equal", label: "Меньше или равно ( <= )" },
            { value: "is_true", label: "Истина (true / 1)" },
            { value: "is_false", label: "Ложь (false / 0)" },
            { value: "regex", label: "RegExp регулярное выражение" },
          ];

          const isUnary = (op: string) =>
            ["not_empty", "is_empty", "is_true", "is_false"].includes(op);

          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-300 text-xs">
                  <Split className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Разветвление сценария (Switch)</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Поток выполнения направляется только по той ветке, условие которой сработало. Шаги на неактивных ветках автоматически пропускаются.
                </p>
              </div>

              {/* Rule 0 / Branch 1 */}
              <div className="rounded-xl border border-emerald-300/80 dark:border-emerald-800 bg-white dark:bg-zinc-900/60 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700 dark:text-emerald-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 font-bold text-[10px]">
                      1
                    </span>
                    <span>Ветка 1 (Выход 1 / True)</span>
                  </span>
                  <input
                    type="text"
                    value={data.rule0_label || "Ветка 1"}
                    onChange={(e) => handleFieldChange("rule0_label", e.target.value)}
                    className="w-24 rounded border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] text-right"
                    placeholder="Название"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Проверяемое значение / переменная
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setShowVariablePickerFor(
                          showVariablePickerFor === "rule0_value1" ? null : "rule0_value1"
                        )
                      }
                      className="flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                    >
                      <Variable className="h-3 w-3" />
                      Переменная
                    </button>
                  </div>
                  <input
                    type="text"
                    value={data.rule0_value1 || ""}
                    onChange={(e) => handleFieldChange("rule0_value1", e.target.value)}
                    {...varDropAttrs("rule0_value1")}
                    placeholder="{{ ai_text_1.text }}"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    Оператор сравнения
                  </label>
                  <select
                    value={data.rule0_operator || "not_empty"}
                    onChange={(e) => handleFieldChange("rule0_operator", e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs"
                  >
                    {switchOperators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!isUnary(data.rule0_operator || "not_empty") && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        Значение для сравнения
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowVariablePickerFor(
                            showVariablePickerFor === "rule0_value2" ? null : "rule0_value2"
                          )
                        }
                        className="flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                      >
                        <Variable className="h-3 w-3" />
                        Переменная
                      </button>
                    </div>
                    <input
                      type="text"
                      value={data.rule0_value2 || ""}
                      onChange={(e) => handleFieldChange("rule0_value2", e.target.value)}
                      {...varDropAttrs("rule0_value2")}
                      placeholder="Значение для проверки..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Rule 1 / Branch 2 */}
              <div className="rounded-xl border border-sky-300/80 dark:border-sky-800 bg-white dark:bg-zinc-900/60 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-xs text-sky-700 dark:text-sky-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 font-bold text-[10px]">
                      2
                    </span>
                    <span>Ветка 2 (Выход 2 / False / Rule 2)</span>
                  </span>
                  <input
                    type="text"
                    value={data.rule1_label || "Ветка 2"}
                    onChange={(e) => handleFieldChange("rule1_label", e.target.value)}
                    className="w-24 rounded border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] text-right"
                    placeholder="Название"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Проверяемое значение / переменная
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setShowVariablePickerFor(
                          showVariablePickerFor === "rule1_value1" ? null : "rule1_value1"
                        )
                      }
                      className="flex items-center gap-1 rounded bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-100"
                    >
                      <Variable className="h-3 w-3" />
                      Переменная
                    </button>
                  </div>
                  <input
                    type="text"
                    value={data.rule1_value1 || ""}
                    onChange={(e) => handleFieldChange("rule1_value1", e.target.value)}
                    {...varDropAttrs("rule1_value1")}
                    placeholder="{{ ai_text_1.text }}"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    Оператор сравнения
                  </label>
                  <select
                    value={data.rule1_operator || "is_empty"}
                    onChange={(e) => handleFieldChange("rule1_operator", e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs"
                  >
                    {switchOperators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!isUnary(data.rule1_operator || "is_empty") && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                        Значение для сравнения
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowVariablePickerFor(
                            showVariablePickerFor === "rule1_value2" ? null : "rule1_value2"
                          )
                        }
                        className="flex items-center gap-1 rounded bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-100"
                      >
                        <Variable className="h-3 w-3" />
                        Переменная
                      </button>
                    </div>
                    <input
                      type="text"
                      value={data.rule1_value2 || ""}
                      onChange={(e) => handleFieldChange("rule1_value2", e.target.value)}
                      {...varDropAttrs("rule1_value2")}
                      placeholder="Значение..."
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Fallback Branch */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/40 p-2.5 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.enableFallback !== false}
                    onChange={(e) => handleFieldChange("enableFallback", e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600"
                  />
                  <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                    Ветка 3 (Иначе / Fallback)
                  </span>
                </label>
                <p className="text-[10px] text-zinc-500 pl-5">
                  Если ни Ветка 1, ни Ветка 2 не выполнились, управление передаётся на выход «Иначе».
                </p>
              </div>
            </div>
          );
        })()}

        {/* 9. LOGIC CONDITION (IF/ELSE) */}
        {node.type === "logic_condition" && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  Проверяемое значение (Left Value)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "leftValue" ? null : "leftValue"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <input
                type="text"
                value={data.leftValue || ""}
                onChange={(e) => handleFieldChange("leftValue", e.target.value)}
                {...varDropAttrs("leftValue")}
                placeholder="{{ ai_text_1.text }}"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Оператор
              </label>
              <select
                value={data.operator || "not_empty"}
                onChange={(e) => handleFieldChange("operator", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs"
              >
                <option value="not_empty">Не пусто (заполнено)</option>
                <option value="equals">Равно (=)</option>
                <option value="not_equals">Не равно (!=)</option>
                <option value="contains">Содержит подстроку</option>
              </select>
            </div>

            {data.operator !== "not_empty" && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-medium text-zinc-700 dark:text-zinc-300">
                    Значение для сравнения (Right Value)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowVariablePickerFor(
                        showVariablePickerFor === "rightValue" ? null : "rightValue"
                      )
                    }
                    className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                  >
                    <Variable className="h-3 w-3" />
                    Переменная
                  </button>
                </div>
                <input
                  type="text"
                  value={data.rightValue || ""}
                  onChange={(e) => handleFieldChange("rightValue", e.target.value)}
                  {...varDropAttrs("rightValue")}
                  placeholder="Значение..."
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* 10. FORMATTER & UTM */}
        {node.type === "formatter" && (
          <div className="space-y-3">
            <SocialRequirementsBanner error={formatterError} hint="Шаблон обязателен. Результат доступен как .text." />
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-zinc-700 dark:text-zinc-300">
                  <FieldNeedLabel label="Шаблон текста" need="required" />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowVariablePickerFor(
                      showVariablePickerFor === "template" ? null : "template"
                    )
                  }
                  className="flex items-center gap-1 rounded bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100"
                >
                  <Variable className="h-3 w-3" />
                  Переменная
                </button>
              </div>
              <textarea
                rows={6}
                value={data.template || ""}
                onChange={(e) => handleFieldChange("template", e.target.value)}
                {...varDropAttrs("template")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs font-mono"
                placeholder="{{ ai_text_1.text }}\n\n🔥 https://postilka.ru/go/promo"
              />
            </div>
            <p className="text-[10px] text-zinc-500">
              Переменные вида <code className="font-mono text-[9px]">{`{{ node_id.field }}`}</code>.
              Выход —{" "}
              <code className="font-mono text-[9px]">{`{{ ${node.id}.text }}`}</code>
              .
            </p>
          </div>
        )}

        {node.type === "merge" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/60 dark:bg-teal-950/20 p-3 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-2">
              <p className="font-medium text-teal-800 dark:text-teal-300">
                Объединяет две входящие ветки
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[10px]">
                <li>
                  <span className="font-semibold">Input 1</span> и{" "}
                  <span className="font-semibold">Input 2</span> — две параллельные
                  ветки (например, AI текст и AI картинка).
                </li>
                <li>
                  Нода выполняется, когда данные пришли с обоих входов.
                </li>
                <li>
                  <span className="font-semibold">Output</span> — один объединённый
                  результат; поля доступны как{" "}
                  <code className="font-mono text-[9px]">{`{{ ${node.id}.text }}`}</code>
                  ,{" "}
                  <code className="font-mono text-[9px]">{`{{ ${node.id}.image_url }}`}</code>
                  ,{" "}
                  <code className="font-mono text-[9px]">{`{{ ${node.id}.video_url }}`}</code>
                  .
                </li>
              </ul>
            </div>
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                Mode (режим)
              </label>
              <select
                value={data.mode || "combine"}
                onChange={(e) => handleFieldChange("mode", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs"
              >
                <option value="combine">
                  Combine — объединить поля Input 1 и Input 2 в один item
                </option>
                <option value="prefer_first">
                  Choose Branch — передать только Input 1
                </option>
                <option value="prefer_last">
                  Choose Branch — передать только Input 2
                </option>
              </select>
            </div>
            <p className="text-[10px] text-zinc-500">
              В режиме Combine поля с одинаковыми именами сливаются; если ключ
              уже заполнен, берётся первое непустое значение. Одинаковые ключи
              сливаются по позиции: один объект на каждый вход.
            </p>
          </div>
        )}

        {node.type === "set_fields" && (
          <div className="space-y-3">
            <p className="text-[10px] leading-relaxed text-zinc-500">
              Для публикаций используйте ключи{" "}
              <code className="font-mono text-[9px]">text</code>,{" "}
              <code className="font-mono text-[9px]">imageUrl</code> и{" "}
              <code className="font-mono text-[9px]">videoUrl</code> — их понимают
              соцсети и согласование.
            </p>
            {(Array.isArray(data.fields) ? data.fields : []).map(
              (field: { key?: string; value?: string }, idx: number) => (
                <div key={idx} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 space-y-2">
                  <input
                    type="text"
                    value={field.key || ""}
                    onChange={(e) => {
                      const next = [...(data.fields || [])];
                      next[idx] = { ...next[idx], key: e.target.value };
                      handleFieldChange("fields", next);
                    }}
                    placeholder="Имя поля (text, imageUrl, videoUrl)"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={field.value || ""}
                    onChange={(e) => {
                      const next = [...(data.fields || [])];
                      next[idx] = { ...next[idx], value: e.target.value };
                      handleFieldChange("fields", next);
                    }}
                    {...varDropAttrs(`fieldValue:${idx}`)}
                    placeholder="{{ trigger_1.body.name }}"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-xs font-mono"
                  />
                </div>
              )
            )}
            <button
              type="button"
              onClick={() =>
                handleFieldChange("fields", [
                  ...(Array.isArray(data.fields) ? data.fields : []),
                  { key: "", value: "" },
                ])
              }
              className="text-[11px] font-medium text-indigo-600 hover:underline"
            >
              + Добавить поле
            </button>
          </div>
        )}

        {node.type === "loop_items" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">Источник списка</label>
              <select
                value={data.itemsSource || "channels"}
                onChange={(e) => handleFieldChange("itemsSource", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs"
              >
                <option value="channels">Каналы workspace</option>
                <option value="static">Статический список</option>
                <option value="upstream_field">Из предыдущей ноды</option>
              </select>
            </div>
            {(data.itemsSource || "channels") === "channels" && (
              <div>
                <label className="mb-1 block text-[10px] text-zinc-500">Провайдеры (через запятую)</label>
                <input
                  type="text"
                  value={(data.channelProviders || ["telegram", "vk"]).join(", ")}
                  onChange={(e) =>
                    handleFieldChange(
                      "channelProviders",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs"
                  placeholder="telegram, vk"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={!!data.stopOnError}
                onChange={(e) => handleFieldChange("stopOnError", e.target.checked)}
              />
              Остановить процесс при ошибке итерации
            </label>
            <p className="text-[10px] text-zinc-500">
              Следующие ноды после этой выполняются для каждого элемента. Используйте{" "}
              <code className="font-mono text-[9px]">{`{{ __loop.current_item_channel_id }}`}</code>.
            </p>
          </div>
        )}

        {node.type === "http_request" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-zinc-500">Метод</label>
                <select
                  value={data.method || "GET"}
                  onChange={(e) => handleFieldChange("method", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-1.5 text-xs"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] text-zinc-500">URL</label>
                <input
                  type="url"
                  value={data.url || ""}
                  onChange={(e) => handleFieldChange("url", e.target.value)}
                  {...varDropAttrs("url")}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-1.5 text-xs font-mono"
                  placeholder="https://api.example.com/data"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Тело запроса (JSON)</label>
              <textarea
                rows={4}
                value={data.body || ""}
                onChange={(e) => handleFieldChange("body", e.target.value)}
                {...varDropAttrs("body")}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2 text-xs font-mono"
                placeholder='{"key": "value"}'
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
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                {...varDropAttrs("fileUrl")}
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
                (() => {
                  const accept = inferFieldAccept(showVariablePickerFor || "");
                  let compatibleCount = 0;
                  const blocks = upstreamNodes.map((un) => {
                    const uDef = NODE_DEFINITIONS[un.type];
                    const outputs = (uDef?.outputs || []).filter((out) =>
                      canAcceptVariable(accept, out.type)
                    );
                    compatibleCount += outputs.length;
                    if (outputs.length === 0) return null;
                    return (
                      <div key={un.id} className="space-y-1 py-1">
                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                          {un.data.title || un.id} ({un.type}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {outputs.map((out) => (
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
                  });
                  if (compatibleCount === 0) {
                    return (
                      <div className="text-[11px] text-zinc-500">
                        Нет переменных подходящего типа для этого поля
                      </div>
                    );
                  }
                  return blocks;
                })()
              )}
            </div>
          </div>
        )}

        {/* Test Node Execution Output */}
        {!isFormLayout && testResult && (
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
              <div className="space-y-1.5">
                {testResult.outputs?.published && (
                  <p className="text-[11px] font-medium">
                    Публикация отправлена в канал
                    {testResult.outputs.provider_post_id
                      ? ` (ID: ${testResult.outputs.provider_post_id})`
                      : ""}
                  </p>
                )}
                <pre className="max-h-32 overflow-x-auto rounded bg-black/5 dark:bg-black/30 p-1.5 text-[10px] font-mono">
                  {JSON.stringify(testResult.outputs, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {!isFormLayout && (
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
            {testing ? "Выполняется тест..." : node.type.startsWith("social_") ? "Отправить тестовую публикацию" : "Протестировать этот узел"}
          </button>
        )}
      </div>
      )}
    </>
  );

  if (isFormLayout) {
    return (
      <div onWheel={(e) => e.stopPropagation()} data-panel="inspector">
        {formBody}
      </div>
    );
  }

  return (
    <aside
      onWheel={(e) => e.stopPropagation()}
      data-panel="inspector"
      className="absolute right-3 top-3 bottom-3 z-30 flex w-96 sm:w-[440px] max-h-[calc(100%-1.5rem)] flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-md"
    >
      {formBody}
    </aside>
  );
};
