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
  Type,
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
  type: Type,
};

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

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative select-none rounded-2xl border bg-[#10141e]/95 text-zinc-100 shadow-2xl backdrop-blur-xl transition-all ${
        isVisualNode ? "w-72 sm:w-80" : "w-72 sm:w-80"
      } ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/40 shadow-blue-500/20"
          : "border-zinc-800/90 hover:border-zinc-700/90"
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
        const topPercent = Math.round(((idx + 1) / (totalInputs + 1)) * 100);

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
              className={`group/handle flex h-7 w-7 cursor-crosshair items-center justify-center rounded-full border-2 bg-[#121622] text-zinc-300 shadow-xl transition-all duration-150 ${
                isCompatible
                  ? "scale-125 border-emerald-400 bg-emerald-950 text-emerald-200 ring-4 ring-emerald-500/50 animate-pulse z-30"
                  : isSourceOfDrag
                  ? "scale-125 border-indigo-400 bg-indigo-950 text-indigo-200 ring-2 ring-indigo-500 z-30"
                  : "border-zinc-700/90 hover:scale-125 hover:border-indigo-400 hover:text-white"
              }`}
            >
              {inp.type === "string" && (
                <span className="font-bold text-[11px] leading-none text-sky-400">
                  T
                </span>
              )}
              {inp.type === "image" && (
                <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
              )}
              {inp.type === "video" && (
                <Video className="h-3.5 w-3.5 text-pink-400" />
              )}
              {inp.type === "number" && (
                <Hash className="h-3.5 w-3.5 text-amber-400" />
              )}
              {inp.type === "boolean" && (
                <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {inp.type === "any" && (
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              )}

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute left-8 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover/handle:block z-40 border border-zinc-800">
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
        const topPercent = Math.round(((idx + 1) / (totalOutputs + 1)) * 100);

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
              className={`group/handle flex h-7 w-7 cursor-crosshair items-center justify-center rounded-full border-2 bg-[#121622] text-zinc-300 shadow-xl transition-all duration-150 ${
                isCompatible
                  ? "scale-125 border-emerald-400 bg-emerald-950 text-emerald-200 ring-4 ring-emerald-500/50 animate-pulse z-30"
                  : isSourceOfDrag
                  ? "scale-125 border-indigo-400 bg-indigo-950 text-indigo-200 ring-2 ring-indigo-500 z-30"
                  : "border-zinc-700/90 hover:scale-125 hover:border-indigo-400 hover:text-white"
              }`}
            >
              {out.type === "string" && (
                <span className="font-bold text-[11px] leading-none text-sky-400">
                  T
                </span>
              )}
              {out.type === "image" && (
                <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
              )}
              {out.type === "video" && (
                <Video className="h-3.5 w-3.5 text-pink-400" />
              )}
              {out.type === "number" && (
                <Hash className="h-3.5 w-3.5 text-amber-400" />
              )}
              {out.type === "boolean" && (
                <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {out.type === "any" && (
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              )}

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute right-8 hidden whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover/handle:block z-40 border border-zinc-800">
                {out.label} ({color.label})
              </div>
            </div>
          </div>
        );
      })}

      {/* Node Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${def.color.badge} text-[10px] shadow-sm`}
          >
            <Icon className="h-3 w-3" />
          </div>
          <span className="truncate text-xs font-semibold text-zinc-200">
            {title}
          </span>
        </div>

        {/* Status / Quick Action Badge */}
        <div className="flex items-center gap-1">
          {runStatus === "running" && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {runStatus === "completed" && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              <Check className="h-3 w-3" />
            </span>
          )}
          {runStatus === "failed" && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              <AlertCircle className="h-3 w-3" />
            </span>
          )}

          <button
            title="Протестировать этот узел"
            onClick={(e) => {
              e.stopPropagation();
              onTestNode();
            }}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-indigo-400 transition"
          >
            <Play className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Node Body (Specialized Higgsfield Visual Layout) */}
      <div className="p-3">
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
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 group/img">
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
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-800/60">
                      <AlertCircle className="h-3 w-3" /> Upload failed
                    </span>
                  ) : isUploading ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-200 bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />{" "}
                      Загрузка...
                    </span>
                  ) : (
                    <span className="max-w-[140px] truncate text-[10px] text-zinc-300 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {(node.data.fileName as string) || "Изображение готово"}
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
                className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700/80 bg-zinc-900/40 p-4 text-center transition hover:border-zinc-500 hover:bg-zinc-900/70"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-200">
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
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-200 border border-zinc-700 transition"
                  >
                    Загрузить с ПК
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMediaPicker?.(node.id, "fileUrl");
                    }}
                    className="rounded-lg bg-indigo-600/80 hover:bg-indigo-600 px-2.5 py-1 text-[10px] font-medium text-white transition"
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
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#090c14] flex flex-col items-center justify-center">
              {node.data.outputImageUrl || node.data.imageUrl ? (
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
                <div className="flex flex-col items-center justify-center text-zinc-600">
                  <svg
                    className="h-14 w-14 opacity-25"
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
                  <span className="mt-1 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                    KIE Canvas
                  </span>
                </div>
              )}

              {/* Badges Overlay (Top Right) */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="rounded bg-black/70 border border-zinc-700/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 backdrop-blur-sm">
                  {(node.data.resolution as string) || "2k"}
                </span>
                <span className="rounded bg-black/70 border border-zinc-700/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 backdrop-blur-sm">
                  {(node.data.aspectRatio as string) || "1:1"}
                </span>
              </div>
            </div>

            {/* Prompt Preview / Describe */}
            <div className="px-1 pt-1">
              <p className="line-clamp-2 text-[11px] text-zinc-300 font-sans italic">
                {(node.data.prompt as string) || "Describe..."}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  {(node.data.model as string) || "GPT Image 2"}
                </span>
                <span>Flux / KIE</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. AI VIDEO GENERATION */}
        {node.type === "ai_video" && (
          <div className="space-y-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#090c14] flex flex-col items-center justify-center">
              {node.data.videoUrl ? (
                <video
                  src={node.data.videoUrl as string}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600">
                  <Film className="h-10 w-10 opacity-30 text-pink-400" />
                  <span className="mt-1 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                    KIE Video
                  </span>
                </div>
              )}

              {/* Badges Overlay */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="rounded bg-black/70 border border-zinc-700/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 backdrop-blur-sm">
                  {(node.data.durationSeconds as number) || 5}s
                </span>
                <span className="rounded bg-black/70 border border-zinc-700/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 backdrop-blur-sm">
                  {(node.data.aspectRatio as string) || "9:16"}
                </span>
              </div>
            </div>

            <div className="px-1 pt-1">
              <p className="line-clamp-2 text-[11px] text-zinc-300 font-sans italic">
                {(node.data.prompt as string) || "Сценарий видеоролика..."}
              </p>
            </div>
          </div>
        )}

        {/* 4. AI TEXT (YANDEX GPT) */}
        {node.type === "ai_text" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
              <p className="line-clamp-3 text-[11px] text-zinc-300 italic">
                &ldquo;{(node.data.prompt as string) || "Без промпта"}&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between px-1 text-[10px] text-zinc-400">
              <span className="rounded bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.5 text-indigo-300 font-medium">
                {(node.data.role as string) || "Копирайтер"}
              </span>
              <span>T: {(node.data.temperature as number) || 0.7}</span>
            </div>
          </div>
        )}

        {/* 5. TELEGRAM */}
        {node.type === "social_telegram" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-sky-900/30 bg-sky-950/20 p-3 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-300 font-mono">
                {(node.data.text as string) || "{{ AI.text }}"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {node.data.format === "video_note" && (
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-300 font-medium">
                  Кружочек
                </span>
              )}
              {node.data.silent && (
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">
                  Без звука
                </span>
              )}
              {node.data.pin && (
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">
                  Закрепить
                </span>
              )}
              {Array.isArray(node.data.buttons) &&
                node.data.buttons.length > 0 && (
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-300 font-medium">
                    {node.data.buttons.length} кнопок
                  </span>
                )}
            </div>
          </div>
        )}

        {/* 6. VK */}
        {node.type === "social_vk" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 p-3 text-xs">
              <div className="line-clamp-2 text-[11px] text-zinc-300 font-mono">
                {(node.data.text as string) || "{{ AI.text }}"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 px-1">
              <span>{node.data.fromGroup ? "От сообщества" : "От автора"}</span>
              {node.data.firstComment && <span>• 1-й коммент</span>}
            </div>
          </div>
        )}

        {/* 7. YOUTUBE */}
        {node.type === "social_youtube" && (
          <div className="space-y-2">
            <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-2.5 text-xs">
              <div className="line-clamp-1 font-semibold text-[11px] text-zinc-200">
                {(node.data.titleText as string) || "Заголовок видео"}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-300 font-medium uppercase text-[9px]">
                {(node.data.format as string) || "Shorts"}
              </span>
              <span>{(node.data.privacyStatus as string) || "Public"}</span>
            </div>
          </div>
        )}

        {/* 8. TRIGGER */}
        {node.type === "trigger" && (
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2.5 text-xs flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Тип:</span>
            <span className="font-semibold text-emerald-400 text-[11px]">
              {node.data.triggerType === "schedule"
                ? "По расписанию"
                : "Ручной запуск"}
            </span>
          </div>
        )}

        {/* 9. APPROVAL */}
        {node.type === "draft_approval" && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs flex items-center gap-1.5 text-amber-400 text-[11px]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Пауза / Ожидание проверки</span>
          </div>
        )}

        {/* 10. CONDITION & FORMATTER */}
        {node.type === "logic_condition" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 text-[11px] text-zinc-300">
            Условие:{" "}
            <span className="font-semibold text-indigo-400">
              {node.data.operator || "equals"}
            </span>
          </div>
        )}

        {node.type === "formatter" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 text-[11px] text-zinc-300 font-mono line-clamp-2">
            {(node.data.template as string) || "Шаблон"}
          </div>
        )}
      </div>

      {/* Node Hover Actions Bar */}
      <div className="absolute -top-3.5 right-2 hidden group-hover:flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5 shadow-md z-30">
        <button
          title="Дублировать узел"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          title="Удалить узел"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-zinc-400 hover:bg-red-950/60 hover:text-red-400 transition"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
