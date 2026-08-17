"use client";

import React, { useState, useRef } from "react";
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
  GitFork,
  Split,
  MessageSquare,
  Type,
  AlignLeft,
  Trash2,
  Copy,
  Play,
  Loader2,
  AlertCircle,
  Check,
  Hash,
  UploadCloud,
  Layers,
  ExternalLink,
  ChevronDown,
  Calendar,
  Clock,
  Zap,
  GitMerge,
  Repeat,
  Globe,
  List,
  Radio,
} from "lucide-react";
import type { WorkflowNode } from "@/lib/workflows-api";
import { uploadFile } from "@/lib/files-api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
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
  onUpdateNodeData?: (nodeId: string, newData: Record<string, any>) => void;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
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
  "git-fork": GitFork,
  split: Split,
  "message-square": MessageSquare,
  type: Type,
  "align-left": AlignLeft,
  "git-merge": GitMerge,
  repeat: Repeat,
  globe: Globe,
  list: List,
};

function formatTriggerScheduleDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export const WorkflowNodeCard: React.FC<WorkflowNodeCardProps> = ({
  node,
  isSelected,
  runStatus,
  connectingFrom,
  onRegisterPort,
  onUpdateNodeData,
  onOpenMediaPicker,
  onSelect,
  onDelete,
  onDuplicate,
  onTestNode,
  onStartConnect,
  onEndConnect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    // Immediate local preview
    const localUrl = URL.createObjectURL(file);
    const isVid = file.type.startsWith("video/");
    onUpdateNodeData?.(node.id, {
      ...node.data,
      fileUrl: localUrl,
      imageUrl: !isVid ? localUrl : undefined,
      videoUrl: isVid ? localUrl : undefined,
      fileName: file.name,
      mediaKind: isVid ? "video" : "image",
    });

    try {
      const res = await uploadFile(file);
      const permUrl = await getCachedFileMediaUrl(res.id, "preview");
      onUpdateNodeData?.(node.id, {
        ...node.data,
        fileUrl: permUrl,
        imageUrl: !isVid ? permUrl : undefined,
        videoUrl: isVid ? permUrl : undefined,
        fileId: res.id,
        fileName: res.name,
        mediaKind: isVid ? "video" : "image",
      });
    } catch (err: any) {
      setUploadError("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const isVisualNode =
    node.type === "files_media" ||
    node.type === "ai_image" ||
    node.type === "ai_video";
  const isTrigger = node.type === "trigger";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative select-none rounded-2xl border bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 shadow-xl backdrop-blur-xl transition-all ${
        isTrigger
          ? "w-36 h-36 flex flex-col justify-between"
          : isVisualNode
          ? "w-72 sm:w-80"
          : "w-72 sm:w-80"
      } ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/10"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      } ${runStatus === "running" ? "ring-2 ring-amber-500/50 animate-pulse" : ""} ${
        runStatus === "failed" ? "border-red-500 ring-2 ring-red-500/30" : ""
      } ${runStatus === "completed" ? "border-emerald-500 ring-1 ring-emerald-500/30" : ""}`}
    >
      {/* Higgsfield Corner Resize/Selection Handles */}
      {isSelected && (
        <>
          <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-sm bg-blue-500 border border-white dark:border-zinc-950 z-30 shadow" />
          <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-sm bg-blue-500 border border-white dark:border-zinc-950 z-30 shadow" />
          <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-sm bg-blue-500 border border-white dark:border-zinc-950 z-30 shadow" />
          <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm bg-blue-500 border border-white dark:border-zinc-950 z-30 shadow" />
        </>
      )}

      {/* Floating Input Ports (Left Side - Higgsfield Style) */}
      {def.inputs.map((inp, idx) => {
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

        const totalInputs = def.inputs.length;
        const topPercent = totalInputs === 1 ? 50 : Math.round(((idx + 1) / (totalInputs + 1)) * 100);

        return (
          <div
            key={inp.id}
            style={{ top: `${topPercent}%` }}
            className={`absolute -left-3.5 z-20 -translate-y-1/2 transition-all ${
              isConnecting && !isCompatible && !isSourceOfDrag
                ? "opacity-30 pointer-events-none"
                : "opacity-100"
            }`}
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
              className={`group/handle flex h-7 w-7 cursor-crosshair items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-md transition-all duration-150 ${
                isCompatible
                  ? "scale-125 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-200 ring-4 ring-emerald-500/40 animate-pulse z-30"
                  : isSourceOfDrag
                  ? "scale-125 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 ring-2 ring-indigo-500 z-30"
                  : "border-zinc-300 dark:border-zinc-600 hover:scale-125 hover:border-indigo-500"
              }`}
            >
              {inp.type === "string" && (
                <span className="font-bold text-[11px] leading-none text-sky-600 dark:text-sky-400">
                  T
                </span>
              )}
              {inp.type === "image" && (
                <ImageIcon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              )}
              {inp.type === "video" && (
                <Video className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
              )}
              {inp.type === "number" && (
                <Hash className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              {inp.type === "boolean" && (
                <GitBranch className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              {inp.type === "any" && (
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              )}

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute left-8 hidden whitespace-nowrap rounded-md bg-zinc-900 dark:bg-black px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover/handle:block z-40 border border-zinc-700">
                {inp.label} ({color.label})
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating Output Ports (Right Side - Higgsfield Style) */}
      {def.outputs.map((out, idx) => {
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

        const totalOutputs = def.outputs.length;
        const topPercent = totalOutputs === 1 ? 50 : Math.round(((idx + 1) / (totalOutputs + 1)) * 100);

        return (
          <div
            key={out.id}
            style={{ top: `${topPercent}%` }}
            className={`absolute -right-3.5 z-20 -translate-y-1/2 transition-all ${
              isConnecting && !isCompatible && !isSourceOfDrag
                ? "opacity-30 pointer-events-none"
                : "opacity-100"
            }`}
          >
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
              className={`group/handle flex h-7 w-7 cursor-crosshair items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-md transition-all duration-150 ${
                isCompatible
                  ? "scale-125 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-200 ring-4 ring-emerald-500/40 animate-pulse z-30"
                  : isSourceOfDrag
                  ? "scale-125 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 ring-2 ring-indigo-500 z-30"
                  : "border-zinc-300 dark:border-zinc-600 hover:scale-125 hover:border-indigo-500"
              }`}
            >
              {out.type === "string" && (
                <span className="font-bold text-[11px] leading-none text-sky-600 dark:text-sky-400">
                  T
                </span>
              )}
              {out.type === "image" && (
                <ImageIcon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              )}
              {out.type === "video" && (
                <Video className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
              )}
              {out.type === "number" && (
                <Hash className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              {out.type === "boolean" && (
                <GitBranch className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              {out.type === "any" && (
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              )}

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute right-8 hidden whitespace-nowrap rounded-md bg-zinc-900 dark:bg-black px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover/handle:block z-40 border border-zinc-700">
                {out.label} ({color.label})
              </div>
            </div>
          </div>
        );
      })}

      {/* Node Header */}
      {isTrigger ? (
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/60 rounded-t-2xl">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md ${def.color.badge} text-[9px] shadow-sm`}
            >
              <PlayCircle className="h-2.5 w-2.5" />
            </div>
            <span className="truncate text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {runStatus === "running" && (
              <span className="flex items-center rounded-full bg-amber-500/20 p-0.5 text-amber-600 dark:text-amber-400">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              </span>
            )}
            {runStatus === "completed" && (
              <span className="flex items-center rounded-full bg-emerald-500/20 p-0.5 text-emerald-600 dark:text-emerald-400">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
            {runStatus === "failed" && (
              <span className="flex items-center rounded-full bg-red-500/20 p-0.5 text-red-600 dark:text-red-400">
                <AlertCircle className="h-2.5 w-2.5" />
              </span>
            )}
            <button
              title="Протестировать запуск"
              onClick={(e) => {
                e.stopPropagation();
                onTestNode();
              }}
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-emerald-600 transition"
            >
              <Play className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/60 rounded-t-2xl">
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${def.color.badge} text-[10px] shadow-sm`}
            >
              <Icon className="h-3 w-3" />
            </div>
            <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {title}
            </span>
          </div>

          {/* Status / Quick Action Badge */}
          <div className="flex items-center gap-1">
            {runStatus === "running" && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" />
              </span>
            )}
            {runStatus === "completed" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" />
              </span>
            )}
            {runStatus === "failed" && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
              </span>
            )}

            <button
              title="Протестировать этот узел"
              onClick={(e) => {
                e.stopPropagation();
                onTestNode();
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 transition"
            >
              <Play className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Node Body */}
      {isTrigger ? (
        <div className="flex-1 flex flex-col items-center justify-center p-2 text-center select-none">
          {node.data.triggerType === "schedule" ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                {node.data.scheduleDateTime ? (
                  <Calendar className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              {node.data.scheduleDateTime ? (
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-[110px]">
                    {formatTriggerScheduleDate(node.data.scheduleDateTime)}
                  </span>
                  <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    {node.data.scheduleCron ? "Календарь (приор.)" : "Календарь"}
                  </span>
                </div>
              ) : node.data.scheduleCron ? (
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    {node.data.scheduleCron}
                  </span>
                  <span className="text-[8px] text-zinc-400 font-medium uppercase tracking-wider">
                    Cron
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Расписание
                  </span>
                  <span className="text-[8px] text-zinc-400">Не задано</span>
                </div>
              )}
            </div>
          ) : node.data.triggerType === "webhook" ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
                Webhook
              </span>
              <span className="text-[8px] text-zinc-400">Событие</span>
            </div>
          ) : node.data.triggerType === "rss" ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-sm">
                <Radio className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
                RSS
              </span>
              <span className="text-[8px] text-zinc-400 truncate max-w-[120px]">
                {(node.data.rssFeedUrl as string) || "Лента"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                <PlayCircle className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">
                Ручной пуск
              </span>
              <span className="text-[8px] text-zinc-400">По кнопке</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 min-h-[92px]">
        {/* 1. IMAGE / MEDIA FROM DISK OR PC */}
        {node.type === "files_media" && (
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />

            {node.data.fileUrl || node.data.imageUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 group/img">
                {node.data.mediaKind === "video" ? (
                  <video
                    src={
                      (node.data.fileUrl as string) ||
                      (node.data.videoUrl as string)
                    }
                    className="h-full w-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={
                      (node.data.fileUrl as string) ||
                      (node.data.imageUrl as string)
                    }
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                )}

                {/* Bottom Overlay Status inside image */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                  {uploadError ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-red-300 bg-red-950/90 px-2 py-0.5 rounded-md border border-red-800/60">
                      <AlertCircle className="h-3 w-3" /> Ошибка загрузки
                    </span>
                  ) : isUploading ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-200 bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />{" "}
                      Загрузка...
                    </span>
                  ) : (
                    <span className="max-w-[140px] truncate text-[10px] text-zinc-200 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {(node.data.fileName as string) || "Медиафайл готов"}
                    </span>
                  )}

                  {/* Replace button on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="opacity-0 group-hover/img:opacity-100 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md transition"
                  >
                    Заменить
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Dropzone Card */
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-850/40 p-4 text-center transition hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Перетащите изображение
                </p>
                <p className="text-[10px] text-zinc-500 mb-3">
                  с диска или выберите файл
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="rounded-lg bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition"
                  >
                    Загрузить с ПК
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMediaPicker?.(node.id, "fileUrl");
                    }}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm transition"
                  >
                    Медиатека
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. AI IMAGE GENERATION (HIGGSFIELD STYLE) */}
        {node.type === "ai_image" && (
          <div className="space-y-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center">
              {node.data.outputImageUrl || node.data.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={
                    (node.data.outputImageUrl as string) ||
                    (node.data.imageUrl as string)
                  }
                  alt="Generated"
                  className="h-full w-full object-cover"
                />
              ) : (
                /* Higgsfield Stylized Watermark Swirl */
                <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                  <svg
                    className="h-14 w-14 opacity-40 dark:opacity-25"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <path d="M7 12c1.5-2 3-3 5-3s3.5 1 5 3-3 3-5 3-3.5-1-5-3z" />
                  </svg>
                  <span className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-widest font-mono">
                    AI Studio
                  </span>
                </div>
              )}

              {/* Badges Overlay (Top Right) */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="rounded bg-black/60 border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                  {(node.data.resolution as string) || "2k"}
                </span>
                <span className="rounded bg-black/60 border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                  {(node.data.aspectRatio as string) || "1:1"}
                </span>
              </div>
            </div>

            {/* Prompt Preview / Describe */}
            <div className="px-1 pt-1">
              <p className="line-clamp-2 text-[11px] text-zinc-700 dark:text-zinc-300 font-sans italic">
                {(node.data.prompt as string) || "Опишите желаемое изображение..."}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                  <Sparkles className="h-3 w-3" />
                  {(node.data.model as string) || "AI Studio Pro"}
                </span>
                <span>Нейросеть</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. AI VIDEO GENERATION */}
        {node.type === "ai_video" && (
          <div className="space-y-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center">
              {node.data.videoUrl ? (
                <video
                  src={node.data.videoUrl as string}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                  <Film className="h-10 w-10 opacity-40 dark:opacity-30 text-pink-500" />
                  <span className="mt-1 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                    AI Video
                  </span>
                </div>
              )}

              {/* Badges Overlay */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="rounded bg-black/60 border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                  {(node.data.durationSeconds as number) || 5}s
                </span>
                <span className="rounded bg-black/60 border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                  {(node.data.aspectRatio as string) || "9:16"}
                </span>
              </div>
            </div>

            <div className="px-1 pt-1">
              <p className="line-clamp-2 text-[11px] text-zinc-700 dark:text-zinc-300 font-sans italic">
                {(node.data.prompt as string) || "Сценарий видеоролика..."}
              </p>
            </div>
          </div>
        )}

        {/* 4. AI TEXT */}
        {node.type === "ai_text" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 p-3">
              <p className="line-clamp-3 text-[11px] text-zinc-800 dark:text-zinc-200 italic">
                &ldquo;{(node.data.prompt as string) || "Без промпта"}&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between px-1 text-[10px] text-zinc-500">
              <span className="rounded bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 px-1.5 py-0.5 text-indigo-700 dark:text-indigo-300 font-medium">
                {(node.data.role as string) || "Копирайтер"}
              </span>
              <span>T: {(node.data.temperature as number) || 0.7}</span>
            </div>
          </div>
        )}

        {/* 4b. PLAIN TEXT */}
        {node.type === "plain_text" && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
            <p className="line-clamp-4 text-[11px] text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {(node.data.text as string) || "Введите текст поста..."}
            </p>
          </div>
        )}

        {/* 5. TELEGRAM */}
        {node.type === "social_telegram" && (() => {
          const rawBtns = node.data.buttons;
          const btnCount = Array.isArray(rawBtns)
            ? rawBtns.reduce((acc: number, item: any) => acc + (Array.isArray(item) ? item.length : 1), 0)
            : 0;

          return (
            <div className="space-y-2">
              <div className="rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 p-3 text-xs">
                <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono">
                  {(node.data.text as string) || "{{ AI.text }}"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {node.data.channelName ? (
                  <span className="rounded bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/40 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-300 font-medium truncate max-w-[140px]">
                    {node.data.channelName}
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-400 font-medium">
                    Канал не выбран
                  </span>
                )}
                {node.data.format === "video_note" && (
                  <span className="rounded bg-sky-500/10 dark:bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-300 font-medium">
                    Кружочек
                  </span>
                )}
                {node.data.format === "story" && (
                  <span className="rounded bg-purple-500/10 dark:bg-purple-500/20 px-1.5 py-0.5 text-[9px] text-purple-700 dark:text-purple-300 font-medium">
                    История
                  </span>
                )}
                {node.data.mediaPosition === "above" && (
                  <span className="rounded bg-sky-500/10 dark:bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-300 font-medium">
                    Текст сверху
                  </span>
                )}
                {node.data.silent && (
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                    Без звука
                  </span>
                )}
                {node.data.pin && (
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                    Закрепить
                  </span>
                )}
                {btnCount > 0 && (
                  <span className="rounded bg-sky-500/10 dark:bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-300 font-medium">
                    {btnCount} кн.
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* 5b. MAX */}
        {node.type === "social_max" && (() => {
          const rawBtns = node.data.buttons;
          const btnCount = Array.isArray(rawBtns)
            ? rawBtns.reduce((acc: number, item: any) => acc + (Array.isArray(item) ? item.length : 1), 0)
            : 0;

          return (
            <div className="space-y-2">
              <div className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 p-3 text-xs">
                <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono">
                  {(node.data.text as string) || "{{ AI.text }}"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {node.data.channelName ? (
                  <span className="rounded bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40 px-1.5 py-0.5 text-[9px] text-violet-700 dark:text-violet-300 font-medium truncate max-w-[140px]">
                    {node.data.channelName}
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-400 font-medium">
                    Канал не выбран
                  </span>
                )}
                {node.data.silent && (
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                    Без звука
                  </span>
                )}
                {node.data.pin && (
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                    Закрепить
                  </span>
                )}
                {btnCount > 0 && (
                  <span className="rounded bg-violet-500/10 dark:bg-violet-500/20 px-1.5 py-0.5 text-[9px] text-violet-700 dark:text-violet-300 font-medium">
                    {btnCount} кн.
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* 6. VK */}
        {node.type === "social_vk" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono">
                {(node.data.text as string) || "{{ AI.text }}"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500 px-1">
              {node.data.channelName ? (
                <span className="rounded bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 px-1.5 py-0.5 text-[9px] text-blue-700 dark:text-blue-300 font-medium truncate max-w-[120px]">
                  {node.data.channelName}
                </span>
              ) : (
                <span className="rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-400 font-medium">
                  Канал не выбран
                </span>
              )}
              <span>{node.data.fromGroup ? "От сообщества" : "От автора"}</span>
              {node.data.firstComment && <span>• 1-й коммент</span>}
            </div>
          </div>
        )}

        {/* 7. YOUTUBE */}
        {node.type === "social_youtube" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-2.5 text-xs">
              <div className="line-clamp-1 font-semibold text-[11px] text-zinc-800 dark:text-zinc-200">
                {(node.data.titleText as string) || "Заголовок видео"}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
              {node.data.channelName ? (
                <span className="rounded bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/40 px-1.5 py-0.5 text-[9px] text-red-700 dark:text-red-300 font-medium truncate max-w-[100px]">
                  {node.data.channelName}
                </span>
              ) : (
                <span className="rounded bg-red-500/10 dark:bg-red-500/20 px-1.5 py-0.5 text-red-700 dark:text-red-300 font-medium uppercase text-[9px]">
                  {(node.data.format as string) || "Shorts"}
                </span>
              )}
              <span>{(node.data.privacyStatus as string) || "Public"}</span>
            </div>
          </div>
        )}

        {/* 7b. DZEN */}
        {node.type === "social_dzen" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20 p-2.5 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono">
                {(node.data.text as string) || "{{ AI.text }}"}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
              <span className="truncate max-w-[120px]">
                {node.data.channelName || "Канал не выбран"}
              </span>
              <span className="capitalize">{node.data.format || "brief"}</span>
            </div>
          </div>
        )}

        {/* 8. APPROVAL */}
        {node.type === "draft_approval" && (
          <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Пауза / Ожидание проверки</span>
          </div>
        )}

        {/* 10. CONDITION, SWITCH & FORMATTER */}
        {node.type === "logic_condition" && (
          <div className="space-y-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 text-[11px]">
            <div className="text-zinc-700 dark:text-zinc-300">
              Условие:{" "}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {node.data.operator || "equals"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 pt-0.5">
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">
                Да → output_0
              </span>
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400 font-medium">
                Нет → output_1
              </span>
            </div>
          </div>
        )}

        {node.type === "switch" && (
          <div className="space-y-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 text-[11px]">
            <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
              <span>2+ Ветки маршрутизации</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Условия</span>
            </div>
            <div className="space-y-1 text-[10px] text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center justify-between rounded bg-white/70 dark:bg-zinc-900/60 px-1.5 py-0.5 border border-emerald-100 dark:border-emerald-950">
                <span className="font-medium text-emerald-700 dark:text-emerald-300">1: {node.data.rule0_label || "Ветка 1"}</span>
                <span className="font-mono text-zinc-500">{node.data.rule0_operator || "not_empty"}</span>
              </div>
              <div className="flex items-center justify-between rounded bg-white/70 dark:bg-zinc-900/60 px-1.5 py-0.5 border border-emerald-100 dark:border-emerald-950">
                <span className="font-medium text-sky-700 dark:text-sky-300">2: {node.data.rule1_label || "Ветка 2"}</span>
                <span className="font-mono text-zinc-500">{node.data.rule1_operator || "is_empty"}</span>
              </div>
            </div>
          </div>
        )}

        {node.type === "formatter" && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-2 text-[11px] text-zinc-700 dark:text-zinc-300 font-mono line-clamp-2">
            {(node.data.template as string) || "Шаблон"}
          </div>
        )}

        {node.type === "merge" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/60 dark:bg-teal-950/20 p-3 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200">
                Объединяет параллельные ветки: текст, медиа и другие поля в один поток
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="rounded bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/40 px-1.5 py-0.5 text-[9px] text-teal-700 dark:text-teal-300 font-medium">
                {(node.data.mode as string) === "prefer_first"
                  ? "Первый вход"
                  : (node.data.mode as string) === "prefer_last"
                  ? "Последний вход"
                  : "Combine"}
              </span>
              {node.data.waitForAll !== false && (
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                  Ждать все входы
                </span>
              )}
            </div>
          </div>
        )}

        {node.type === "set_fields" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-xs space-y-1.5">
              {(Array.isArray(node.data.fields) ? node.data.fields : [])
                .slice(0, 3)
                .map((field: { key?: string; value?: string }, idx: number) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      {(field.key as string) || `поле_${idx + 1}`}
                    </span>
                    <span className="line-clamp-1 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono">
                      {(field.value as string) || "—"}
                    </span>
                  </div>
                ))}
              {(!Array.isArray(node.data.fields) || node.data.fields.length === 0) && (
                <span className="text-[11px] text-zinc-500 italic">Добавьте поля в инспекторе</span>
              )}
            </div>
            {Array.isArray(node.data.fields) && node.data.fields.length > 3 && (
              <span className="text-[10px] text-zinc-500 px-1">
                +{node.data.fields.length - 3} полей
              </span>
            )}
          </div>
        )}

        {node.type === "loop_items" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/60 dark:bg-orange-950/20 p-3 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200">
                {(node.data.itemsSource as string) === "static"
                  ? "Повтор для каждого элемента статического списка"
                  : (node.data.itemsSource as string) === "upstream_field"
                  ? "Повтор для каждого элемента из предыдущей ноды"
                  : "Повтор для каждого подключённого канала"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {(node.data.itemsSource as string) !== "channels" ? (
                <span className="rounded bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/40 px-1.5 py-0.5 text-[9px] text-orange-700 dark:text-orange-300 font-medium">
                  {(node.data.itemsSource as string) || "channels"}
                </span>
              ) : (
                (Array.isArray(node.data.channelProviders)
                  ? node.data.channelProviders
                  : ["telegram", "vk"]
                ).map((p: string) => (
                  <span
                    key={p}
                    className="rounded bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/40 px-1.5 py-0.5 text-[9px] text-orange-700 dark:text-orange-300 font-medium uppercase"
                  >
                    {p}
                  </span>
                ))
              )}
              <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                max {(node.data.maxIterations as number) || 20}
              </span>
            </div>
          </div>
        )}

        {node.type === "http_request" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 p-3 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-800 dark:text-zinc-200 font-mono break-all">
                {(node.data.url as string) || "https://api.example.com/endpoint"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="rounded bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/40 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-300 font-bold uppercase">
                {(node.data.method as string) || "GET"}
              </span>
              {(node.data.responseFormat as string) && (
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-600 dark:text-zinc-400">
                  {(node.data.responseFormat as string).toUpperCase()}
                </span>
              )}
              {node.data.failOnNon2xx !== false && (
                <span className="rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-400">
                  Fail on 4xx/5xx
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Node Hover Actions Bar */}
      <div className="absolute -top-3.5 right-2 hidden group-hover:flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 shadow-md z-30">
        <button
          title="Дублировать узел"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          title="Удалить узел"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-zinc-500 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 transition"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
