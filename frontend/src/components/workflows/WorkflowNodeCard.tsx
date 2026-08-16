"use client";

import React from "react";
import {
  PlayCircle,
  Sparkles,
  Image as ImageIcon,
  Video,
  Send,
  Share2,
  Youtube,
  Film,
  FileText,
  Folder,
  CheckCircle2,
  GitBranch,
  Type,
  Trash2,
  Copy,
  Play,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import type { WorkflowNode } from "@/lib/workflows-api";
import {
  NODE_DEFINITIONS,
  PORT_TYPE_COLORS,
  isPortCompatible,
} from "./nodeTypes";

interface WorkflowNodeCardProps {
  node: WorkflowNode;
  isSelected: boolean;
  scale: number;
  runStatus?: "pending" | "running" | "completed" | "failed";
  connectingFrom?: {
    nodeId: string;
    handleId: string;
    isOutput: boolean;
    portType: string;
  } | null;
  onRegisterPort?: (
    nodeId: string,
    handleId: string,
    isOutput: boolean,
    el: HTMLElement | null
  ) => void;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onTestNode: () => void;
  onStartConnect: (
    nodeId: string,
    handleId: string,
    isOutput: boolean,
    portType: string,
    e: React.MouseEvent
  ) => void;
  onEndConnect: (
    nodeId: string,
    handleId: string,
    isOutput: boolean,
    portType: string
  ) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  "play-circle": PlayCircle,
  sparkles: Sparkles,
  image: ImageIcon,
  video: Video,
  send: Send,
  "share-2": Share2,
  youtube: Youtube,
  film: Film,
  "file-text": FileText,
  folder: Folder,
  "check-circle-2": CheckCircle2,
  "git-branch": GitBranch,
  type: Type,
};

export const WorkflowNodeCard: React.FC<WorkflowNodeCardProps> = ({
  node,
  isSelected,
  runStatus,
  connectingFrom,
  onRegisterPort,
  onSelect,
  onDelete,
  onDuplicate,
  onTestNode,
  onStartConnect,
  onEndConnect,
}) => {
  const def = NODE_DEFINITIONS[node.type] || {
    type: node.type,
    title: node.type,
    description: "",
    category: "logic",
    icon: "sparkles",
    color: {
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/40",
      badge: "bg-zinc-600 text-white",
      text: "text-zinc-600",
    },
    inputs: [],
    outputs: [],
    defaultData: {},
  };

  const Icon = ICON_MAP[def.icon] || Sparkles;
  const title = (node.data.title as string) || def.title;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative w-72 select-none rounded-2xl border bg-white dark:bg-zinc-900 shadow-lg transition-all ${
        isSelected
          ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-indigo-500/10"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      } ${runStatus === "running" ? "ring-2 ring-amber-500/50 animate-pulse" : ""} ${
        runStatus === "failed" ? "border-red-500 ring-2 ring-red-500/20" : ""
      } ${runStatus === "completed" ? "border-emerald-500 ring-1 ring-emerald-500/20" : ""}`}
    >
      {/* Node Header */}
      <div
        className={`flex items-center justify-between rounded-t-2xl px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 ${def.color.bg}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${def.color.badge} shadow-sm`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h4>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
              {node.id}
            </p>
          </div>
        </div>

        {/* Status / Quick Action Badge */}
        <div className="flex items-center gap-1">
          {runStatus === "running" && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {runStatus === "completed" && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
            </span>
          )}
          {runStatus === "failed" && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
            </span>
          )}

          <button
            title="Протестировать этот узел"
            onClick={(e) => {
              e.stopPropagation();
              onTestNode();
            }}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-indigo-600 transition"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Node Body / Content Preview */}
      <div className="p-3 text-xs text-zinc-600 dark:text-zinc-400">
        {node.type === "trigger" && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Тип триггера:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {node.data.triggerType === "schedule" ? "По расписанию" : "Ручной запуск"}
            </span>
          </div>
        )}

        {node.type === "ai_text" && (
          <div className="space-y-1">
            <div className="line-clamp-2 italic text-[11px] text-zinc-700 dark:text-zinc-300">
              &ldquo;{(node.data.prompt as string) || "Без промпта"}&rdquo;
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Роль: {(node.data.role as string) || "Копирайтер"}</span>
            </div>
          </div>
        )}

        {node.type === "ai_image" && (
          <div className="space-y-1">
            <div className="line-clamp-1 italic text-[11px] text-zinc-700 dark:text-zinc-300">
              {(node.data.prompt as string) || "Промпт..."}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Формат: {(node.data.aspectRatio as string) || "1:1"}</span>
            </div>
          </div>
        )}

        {node.type === "ai_video" && (
          <div className="space-y-1">
            <div className="line-clamp-1 italic text-[11px] text-zinc-700 dark:text-zinc-300">
              {(node.data.prompt as string) || "Промпт..."}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>Длительность: {(node.data.durationSeconds as number) || 5}с</span>
              <span>Формат: {(node.data.aspectRatio as string) || "9:16"}</span>
            </div>
          </div>
        )}

        {node.type === "social_telegram" && (
          <div className="space-y-1">
            <div className="line-clamp-2 text-[11px] text-zinc-700 dark:text-zinc-300">
              {(node.data.text as string) || "{{ AI.text }}"}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              {node.data.silent && (
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                  Без звука
                </span>
              )}
              {node.data.pin && (
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                  Закрепить
                </span>
              )}
              {Array.isArray(node.data.buttons) && node.data.buttons.length > 0 && (
                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                  {node.data.buttons.length} кнопок
                </span>
              )}
            </div>
          </div>
        )}

        {node.type === "social_vk" && (
          <div className="space-y-1">
            <div className="line-clamp-2 text-[11px] text-zinc-700 dark:text-zinc-300">
              {(node.data.text as string) || "{{ AI.text }}"}
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-zinc-500">
              <span>{node.data.fromGroup ? "От сообщества" : "От автора"}</span>
              {node.data.firstComment && <span>• 1-й коммент</span>}
            </div>
          </div>
        )}

        {node.type === "social_youtube" && (
          <div className="space-y-1">
            <div className="line-clamp-1 font-medium text-[11px] text-zinc-800 dark:text-zinc-200">
              {(node.data.titleText as string) || "Заголовок видео"}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-600 dark:text-red-400 font-medium uppercase">
                {(node.data.format as string) || "Shorts"}
              </span>
              <span>{(node.data.privacyStatus as string) || "Public"}</span>
            </div>
          </div>
        )}

        {node.type === "draft_approval" && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Пауза перед отправкой (Approval)</span>
          </div>
        )}

        {node.type === "logic_condition" && (
          <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
            Ветвление: <span className="font-semibold">{node.data.operator || "equals"}</span>
          </div>
        )}

        {node.type === "formatter" && (
          <div className="line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-400">
            {(node.data.template as string) || "Шаблон текста"}
          </div>
        )}
      </div>

      {/* Ports / Handles Section */}
      <div className="relative border-t border-zinc-100 dark:border-zinc-800/80 px-3 py-2 text-[10px] space-y-1">
        {/* Input Ports (Left) */}
        {def.inputs.map((inp) => {
          const color = PORT_TYPE_COLORS[inp.type] || PORT_TYPE_COLORS.any;
          let isCompatible = false;
          let isConnecting = false;
          let isSourceOfDrag = false;

          if (connectingFrom) {
            isConnecting = true;
            if (
              connectingFrom.nodeId === node.id &&
              connectingFrom.handleId === inp.id &&
              !connectingFrom.isOutput
            ) {
              isSourceOfDrag = true;
            } else if (connectingFrom.isOutput) {
              isCompatible =
                isPortCompatible(connectingFrom.portType, inp.type) &&
                connectingFrom.nodeId !== node.id;
            }
          }

          return (
            <div
              key={inp.id}
              className={`group/port relative my-1.5 flex items-center gap-2 transition-all ${
                isConnecting && !isCompatible && !isSourceOfDrag
                  ? "opacity-35"
                  : "opacity-100"
              }`}
              style={{ minHeight: "20px" }}
            >
              <div
                ref={(el) => onRegisterPort?.(node.id, inp.id, false, el)}
                title={`Вход: ${inp.label} (${color.label})`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onStartConnect(node.id, inp.id, false, inp.type, e);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  onEndConnect(node.id, inp.id, false, inp.type);
                }}
                className={`absolute -left-[20px] flex h-4 w-4 cursor-crosshair items-center justify-center rounded-full border-2 ${
                  color.dotBorder
                } ${color.dot} transition-all duration-150 ${
                  isCompatible
                    ? "scale-125 ring-4 ring-emerald-500/40 border-emerald-400 bg-emerald-500 animate-pulse z-10"
                    : isSourceOfDrag
                    ? "scale-125 ring-2 ring-indigo-500 z-10"
                    : "hover:scale-125 hover:ring-2 hover:ring-indigo-400"
                }`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-900" />
              </div>

              <span
                className={`text-[11px] font-medium transition ${
                  isCompatible
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 group-hover/port:text-zinc-900 dark:group-hover/port:text-zinc-100"
                }`}
              >
                {inp.label}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${color.badge}`}
              >
                {color.label}
              </span>
            </div>
          );
        })}

        {/* Output Ports (Right) */}
        {def.outputs.map((out) => {
          const color = PORT_TYPE_COLORS[out.type] || PORT_TYPE_COLORS.any;
          let isCompatible = false;
          let isConnecting = false;
          let isSourceOfDrag = false;

          if (connectingFrom) {
            isConnecting = true;
            if (
              connectingFrom.nodeId === node.id &&
              connectingFrom.handleId === out.id &&
              connectingFrom.isOutput
            ) {
              isSourceOfDrag = true;
            } else if (!connectingFrom.isOutput) {
              isCompatible =
                isPortCompatible(out.type, connectingFrom.portType) &&
                connectingFrom.nodeId !== node.id;
            }
          }

          return (
            <div
              key={out.id}
              className={`group/port relative my-1.5 flex items-center justify-end gap-2 transition-all ${
                isConnecting && !isCompatible && !isSourceOfDrag
                  ? "opacity-35"
                  : "opacity-100"
              }`}
              style={{ minHeight: "20px" }}
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${color.badge}`}
              >
                {color.label}
              </span>
              <span
                className={`text-[11px] font-medium transition ${
                  isCompatible
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 group-hover/port:text-zinc-900 dark:group-hover/port:text-zinc-100"
                }`}
              >
                {out.label}
              </span>

              <div
                ref={(el) => onRegisterPort?.(node.id, out.id, true, el)}
                title={`Выход: ${out.label} (${color.label})`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onStartConnect(node.id, out.id, true, out.type, e);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  onEndConnect(node.id, out.id, true, out.type);
                }}
                className={`absolute -right-[20px] flex h-4 w-4 cursor-crosshair items-center justify-center rounded-full border-2 ${
                  color.dotBorder
                } ${color.dot} transition-all duration-150 ${
                  isCompatible
                    ? "scale-125 ring-4 ring-emerald-500/40 border-emerald-400 bg-emerald-500 animate-pulse z-10"
                    : isSourceOfDrag
                    ? "scale-125 ring-2 ring-indigo-500 z-10"
                    : "hover:scale-125 hover:ring-2 hover:ring-indigo-400"
                }`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-900" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Hover Actions Bar */}
      <div className="absolute -top-3.5 right-2 hidden group-hover:flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 shadow-md">
        <button
          title="Дублировать узел"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          title="Удалить узел"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-zinc-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
