"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
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
  X,
} from "lucide-react";
import { NODE_DEFINITIONS, NodeCategory, NodeTypeDefinition } from "./nodeTypes";

interface NodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: string) => void;
}

const CATEGORY_NAMES: Record<NodeCategory, string> = {
  trigger: "Триггеры и запуск",
  ai: "AI генерация (Yandex & KIE)",
  social: "Социальные сети (Постинг)",
  media: "Медиатека и файлы",
  logic: "Логика и форматирование",
  control: "Контроль и аппрув",
};

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

export const NodePalette: React.FC<NodePaletteProps> = ({
  isOpen,
  onClose,
  onAddNode,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (!isOpen) return null;

  const allNodes = Object.values(NODE_DEFINITIONS);

  const filteredNodes = allNodes.filter((node) => {
    const matchesSearch =
      node.title.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: (NodeCategory | "all")[] = [
    "all",
    "trigger",
    "ai",
    "social",
    "media",
    "logic",
    "control",
  ];

  return (
    <div className="absolute left-6 top-16 z-30 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Добавить узел на холст
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск ноды (Telegram, AI, VK...)"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Categories Filter Tabs */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-zinc-100 dark:border-zinc-800 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
              selectedCategory === cat
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {cat === "all" ? "Все" : CATEGORY_NAMES[cat]}
          </button>
        ))}
      </div>

      {/* Node List */}
      <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {filteredNodes.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400">
            Ничего не найдено
          </div>
        ) : (
          filteredNodes.map((node) => {
            const Icon = ICON_MAP[node.icon] || Sparkles;
            return (
              <button
                key={node.type}
                onClick={() => {
                  onAddNode(node.type);
                  onClose();
                }}
                className="group flex w-full items-start gap-2.5 rounded-xl border border-transparent p-2 text-left transition hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${node.color.badge} shadow-sm transition group-hover:scale-105`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {node.title}
                    </span>
                    <Plus className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="line-clamp-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {node.description}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
