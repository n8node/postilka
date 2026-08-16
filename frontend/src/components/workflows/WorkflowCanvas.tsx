"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Save,
  Plus,
  History,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Loader2,
  ArrowLeft,
  Check,
  AlertCircle,
  FileCode2,
  Coins,
  CreditCard,
  Trash2,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
} from "@/lib/workflows-api";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import type { WorkspaceFile } from "@/lib/files-api";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { NodePalette } from "./NodePalette";
import { NodeInspector } from "./NodeInspector";
import {
  NODE_DEFINITIONS,
  PORT_TYPE_COLORS,
  isPortCompatible,
  calculateWorkflowCost,
} from "./nodeTypes";

interface WorkflowCanvasProps {
  workflow: Workflow;
  onSave: (updatedGraph: WorkflowGraph, name?: string, isActive?: boolean) => Promise<void>;
  onRun: () => Promise<void>;
  onOpenHistory: () => void;
  onOpenTemplates: () => void;
  onTestNode: (node: WorkflowNode) => Promise<{ outputs: Record<string, any> }>;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  onSave,
  onRun,
  onOpenHistory,
  onOpenTemplates,
  onTestNode,
}) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow.graph.nodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(workflow.graph.edges || []);
  const [name, setName] = useState(workflow.name);
  const [isActive, setIsActive] = useState(workflow.is_active);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Viewport panning & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Panning canvas state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Connection wire in progress
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    handleId: string;
    isOutput: boolean;
    portType: string;
    startX: number;
    startY: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [showEconomicsModal, setShowEconomicsModal] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<{
    nodeId: string;
    field: string;
    mediaKind?: "image" | "video";
  } | null>(null);

  // Workflow economic cost calculation
  const costSummary = useMemo(() => calculateWorkflowCost(nodes), [nodes]);

  // Registered Port DOM Elements for exact anchor coordinates
  const portElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [, setPortVersion] = useState(0);

  const handleRegisterPort = useCallback(
    (
      nodeId: string,
      handleId: string,
      isOutput: boolean,
      el: HTMLElement | null
    ) => {
      const key = `${nodeId}:${isOutput ? "out" : "in"}:${handleId}`;
      if (el) {
        portElementsRef.current.set(key, el);
      } else {
        portElementsRef.current.delete(key);
      }
    },
    []
  );

  const getPortAnchor = useCallback(
    (node: WorkflowNode, portId?: string, isOutput = false) => {
      const def = NODE_DEFINITIONS[node.type];
      const ports = isOutput ? def?.outputs : def?.inputs;
      const actualPortId = portId || ports?.[0]?.id;
      const key = `${node.id}:${isOutput ? "out" : "in"}:${actualPortId}`;
      const portEl = portElementsRef.current.get(key);
      const canvasEl = canvasRef.current;

      if (portEl && canvasEl) {
        const portRect = portEl.getBoundingClientRect();
        const canvasRect = canvasEl.getBoundingClientRect();
        const graphX =
          (portRect.left + portRect.width / 2 - canvasRect.left - pan.x) / zoom;
        const graphY =
          (portRect.top + portRect.height / 2 - canvasRect.top - pan.y) / zoom;
        return { x: graphX, y: graphY };
      }

      // Mathematical fallback based on port index if DOM element not yet mounted
      const portIndex = ports?.findIndex((p) => p.id === actualPortId) ?? 0;
      const safeIdx = portIndex >= 0 ? portIndex : 0;
      return {
        x: isOutput ? node.position.x + 288 + 8 : node.position.x - 8,
        y: node.position.y + 130 + safeIdx * 28,
      };
    },
    [pan.x, pan.y, zoom]
  );

  // Sync state if initial prop changes
  useEffect(() => {
    setNodes(workflow.graph.nodes || []);
    setEdges(workflow.graph.edges || []);
    setName(workflow.name);
    setIsActive(workflow.is_active);
    setPortVersion((v) => v + 1);
  }, [workflow]);

  // Handle Canvas Pan (Mouse Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingNodeId) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const newX = (e.clientX - canvasRect.left - pan.x) / zoom - dragOffset.x;
      const newY = (e.clientY - canvasRect.top - pan.y) / zoom - dragOffset.y;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId
            ? { ...n, position: { x: Math.round(newX), y: Math.round(newY) } }
            : n
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingFrom(null);
  };

  // Zoom with wheel
  const handleWheel = (e: React.WheelEvent) => {
    // Prevent canvas zooming when scrolling inside panels, inspectors or inputs
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.closest("aside") ||
        target.closest("[data-panel]") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.closest("pre") ||
        target.closest(".overflow-y-auto") ||
        target.closest(".overflow-auto"))
    ) {
      return;
    }

    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.3), 2.0);
    setZoom(newZoom);
  };

  // Node Drag Start
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const mouseCanvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - canvasRect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseCanvasX - node.position.x,
      y: mouseCanvasY - node.position.y,
    });
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  };

  // Start connecting wire
  const handleStartConnect = (
    nodeId: string,
    handleId: string,
    isOutput: boolean,
    portType: string,
    e: React.MouseEvent
  ) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const anchor = getPortAnchor(node, handleId, isOutput);
    setConnectingFrom({
      nodeId,
      handleId,
      isOutput,
      portType,
      startX: anchor.x,
      startY: anchor.y,
    });
  };

  // Complete connecting wire
  const handleEndConnect = (
    nodeId: string,
    handleId: string,
    isOutput: boolean,
    portType: string
  ) => {
    if (!connectingFrom) return;

    // Don't connect same node or same direction (out-to-out or in-to-in)
    if (
      connectingFrom.nodeId === nodeId ||
      connectingFrom.isOutput === isOutput
    ) {
      setConnectingFrom(null);
      return;
    }

    const sourceNodeId = connectingFrom.isOutput
      ? connectingFrom.nodeId
      : nodeId;
    const sourceHandleId = connectingFrom.isOutput
      ? connectingFrom.handleId
      : handleId;
    const sourcePortType = connectingFrom.isOutput
      ? connectingFrom.portType
      : portType;

    const targetNodeId = connectingFrom.isOutput
      ? nodeId
      : connectingFrom.nodeId;
    const targetHandleId = connectingFrom.isOutput
      ? handleId
      : connectingFrom.handleId;
    const targetPortType = connectingFrom.isOutput
      ? portType
      : connectingFrom.portType;

    // Strict Type Compatibility Validation
    if (!isPortCompatible(sourcePortType, targetPortType)) {
      const srcLabel =
        PORT_TYPE_COLORS[sourcePortType]?.label || sourcePortType;
      const tgtLabel =
        PORT_TYPE_COLORS[targetPortType]?.label || targetPortType;
      setWarningToast(
        `Несовместимый тип: «${srcLabel}» нельзя подключить к «${tgtLabel}»`
      );
      setTimeout(() => setWarningToast(null), 3500);
      setConnectingFrom(null);
      return;
    }

    // Check if edge already exists with exact handles
    const exists = edges.some(
      (edge) =>
        edge.source === sourceNodeId &&
        edge.target === targetNodeId &&
        edge.sourceHandle === sourceHandleId &&
        edge.targetHandle === targetHandleId
    );

    if (!exists) {
      const newEdge: WorkflowEdge = {
        id: `e_${sourceNodeId}_${targetNodeId}_${Date.now()}`,
        source: sourceNodeId,
        target: targetNodeId,
        sourceHandle: sourceHandleId,
        targetHandle: targetHandleId,
      };
      setEdges((prev) => [...prev, newEdge]);
    }
    setConnectingFrom(null);
  };

  // Add new node from palette
  const handleAddNode = (type: string) => {
    const def = NODE_DEFINITIONS[type];
    const newId = `${type}_${Date.now().toString().slice(-4)}`;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const centerX = canvasRect
      ? (canvasRect.width / 2 - pan.x) / zoom - 140
      : 200;
    const centerY = canvasRect
      ? (canvasRect.height / 2 - pan.y) / zoom - 50
      : 200;

    const newNode: WorkflowNode = {
      id: newId,
      type,
      position: { x: Math.round(centerX), y: Math.round(centerY) },
      data: {
        ...(def?.defaultData || {}),
        title: def?.title || type,
      },
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // Duplicate node
  const handleDuplicateNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newId = `${node.type}_${Date.now().toString().slice(-4)}`;
    const newNode: WorkflowNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data, title: `${node.data.title || node.type} (Копия)` },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // Delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) =>
      prev.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Delete edge (connection)
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
  }, [selectedEdgeId]);

  // Keyboard shortcut listener (Delete / Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute("contenteditable") === "true";
      if (isInput) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEdgeId) {
          e.preventDefault();
          handleDeleteEdge(selectedEdgeId);
        } else if (selectedNodeId) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, selectedNodeId, handleDeleteEdge, handleDeleteNode]);

  // Update node data from inspector
  const handleUpdateNodeData = (nodeId: string, newData: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
    );
  };

  // Auto layout helper
  const handleAutoLayout = () => {
    // Topological arrangement based on incoming edges
    const inDegrees: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    nodes.forEach((n) => {
      inDegrees[n.id] = 0;
      adj[n.id] = [];
    });
    edges.forEach((e) => {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (inDegrees[e.target] !== undefined) inDegrees[e.target]++;
    });

    const levels: Record<string, number> = {};
    const queue: string[] = [];
    nodes.forEach((n) => {
      if (inDegrees[n.id] === 0) {
        queue.push(n.id);
        levels[n.id] = 0;
      }
    });

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const nextLevel = (levels[curr] || 0) + 1;
      (adj[curr] || []).forEach((nxt) => {
        levels[nxt] = Math.max(levels[nxt] || 0, nextLevel);
        inDegrees[nxt]--;
        if (inDegrees[nxt] === 0) {
          queue.push(nxt);
        }
      });
    }

    const levelBuckets: Record<number, string[]> = {};
    nodes.forEach((n) => {
      const lvl = levels[n.id] || 0;
      if (!levelBuckets[lvl]) levelBuckets[lvl] = [];
      levelBuckets[lvl].push(n.id);
    });

    setNodes((prev) =>
      prev.map((n) => {
        const lvl = levels[n.id] || 0;
        const indexInLvl = (levelBuckets[lvl] || []).indexOf(n.id);
        return {
          ...n,
          position: {
            x: 80 + lvl * 360,
            y: 100 + (indexInLvl >= 0 ? indexInLvl : 0) * 220,
          },
        };
      })
    );
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ nodes, edges }, name, isActive);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Run handler
  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onRun();
    } finally {
      setIsRunning(false);
    }
  };

  // Selected node object
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Type mismatch warning toast */}
      {warningToast && (
        <div className="absolute top-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-red-300 dark:border-red-800 bg-red-600/95 dark:bg-red-900/95 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{warningToast}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4">
        {/* Left: Back & Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/workflows"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border-transparent bg-transparent px-2 py-1 text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
            placeholder="Название процесса"
          />

          <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>{isActive ? "Активен" : "На паузе"}</span>
          </label>
        </div>

        {/* Center: Add Node / Templates / Layout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить узел
          </button>

          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Шаблоны
          </button>

          <button
            onClick={handleAutoLayout}
            title="Автоматически выровнять ноды"
            className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Economics, History, Test Run & Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEconomicsModal(true)}
            title="Расчёт стоимости и ресурсов процесса"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-sm transition"
          >
            <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Стоимость:</span>
            <span>
              {costSummary.totalWalletRubles > 0
                ? `0 ₽ тариф (~${costSummary.totalWalletRubles.toFixed(1)} ₽)`
                : "0 ₽ (квота)"}
            </span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <History className="h-3.5 w-3.5" />
            История
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {isRunning ? "Выполняется..." : "Запустить"}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : savedToast ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {savedToast ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </header>

      {/* Main Interactive Canvas Area */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="relative flex-1 cursor-grab active:cursor-grabbing select-none overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(160, 160, 160, 0.2) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Scaled & Panned Graph Container */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connections Layer */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            style={{ width: "1px", height: "1px" }}
          >
            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const sourceDef = NODE_DEFINITIONS[sourceNode.type];
              const targetDef = NODE_DEFINITIONS[targetNode.type];

              const sourceHandleId =
                edge.sourceHandle || sourceDef?.outputs[0]?.id;
              const targetHandleId =
                edge.targetHandle || targetDef?.inputs[0]?.id;

              const sourcePort =
                sourceDef?.outputs.find((p) => p.id === sourceHandleId) ||
                sourceDef?.outputs[0];
              const strokeColor =
                PORT_TYPE_COLORS[sourcePort?.type || "any"]?.stroke ||
                "#6366f1";

              const p1 = getPortAnchor(sourceNode, sourceHandleId, true);
              const p2 = getPortAnchor(targetNode, targetHandleId, false);

              const dx = Math.max(Math.abs(p2.x - p1.x) * 0.5, 40);
              const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${
                p2.x - dx
              } ${p2.y}, ${p2.x} ${p2.y}`;
              const isEdgeSelected = selectedEdgeId === edge.id;

              const c1x = p1.x + dx;
              const c1y = p1.y;
              const c2x = p2.x - dx;
              const c2y = p2.y;
              const midX = 0.125 * p1.x + 0.375 * c1x + 0.375 * c2x + 0.125 * p2.x;
              const midY = 0.125 * p1.y + 0.375 * c1y + 0.375 * c2y + 0.125 * p2.y;

              return (
                <g key={edge.id} className="pointer-events-auto">
                  {/* Invisible wide stroke for easy clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="20"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  />
                  {/* Visible wire path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isEdgeSelected ? "#6366f1" : strokeColor}
                    strokeWidth={isEdgeSelected ? "3.5" : "2"}
                    strokeOpacity={isEdgeSelected ? "1" : "0.9"}
                    className="transition-all hover:stroke-[3.5] hover:stroke-opacity-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  />
                  {/* Anchor Dots */}
                  <circle
                    cx={p1.x}
                    cy={p1.y}
                    r="3.5"
                    fill={isEdgeSelected ? "#6366f1" : strokeColor}
                  />
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r="3.5"
                    fill={isEdgeSelected ? "#6366f1" : strokeColor}
                  />

                  {/* Delete Edge Button on Midpoint when selected */}
                  {isEdgeSelected && (
                    <foreignObject
                      x={midX - 13}
                      y={midY - 13}
                      width={26}
                      height={26}
                      className="overflow-visible"
                    >
                      <button
                        type="button"
                        title="Удалить связь (Delete)"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEdge(edge.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-xl hover:bg-red-500 hover:scale-125 active:scale-95 transition-all border-2 border-white dark:border-zinc-900 cursor-pointer animate-in zoom-in-75"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </foreignObject>
                  )}
                </g>
              );
            })}

            {/* Connecting Wire in progress */}
            {connectingFrom && (() => {
              const canvasRect = canvasRef.current?.getBoundingClientRect();
              const mouseCanvasX = canvasRect
                ? (mousePos.x - canvasRect.left - pan.x) / zoom
                : mousePos.x;
              const mouseCanvasY = canvasRect
                ? (mousePos.y - canvasRect.top - pan.y) / zoom
                : mousePos.y;

              const color =
                PORT_TYPE_COLORS[connectingFrom.portType] ||
                PORT_TYPE_COLORS.any;

              let x1: number, y1: number, x2: number, y2: number;
              if (connectingFrom.isOutput) {
                x1 = connectingFrom.startX;
                y1 = connectingFrom.startY;
                x2 = mouseCanvasX;
                y2 = mouseCanvasY;
              } else {
                x1 = mouseCanvasX;
                y1 = mouseCanvasY;
                x2 = connectingFrom.startX;
                y2 = connectingFrom.startY;
              }

              const dx = Math.max(Math.abs(x2 - x1) * 0.5, 30);
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${
                x2 - dx
              } ${y2}, ${x2} ${y2}`;

              return (
                <g>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                  <circle cx={x1} cy={y1} r="4" fill={color.stroke} />
                  <circle cx={x2} cy={y2} r="4" fill={color.stroke} />
                </g>
              );
            })()}
          </svg>

          {/* Node Cards Layer */}
          {nodes.map((node) => (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: `${node.position.x}px`,
                top: `${node.position.y}px`,
              }}
              onMouseDown={(e) => handleNodeDragStart(node.id, e)}
            >
              <WorkflowNodeCard
                node={node}
                isSelected={selectedNodeId === node.id}
                scale={zoom}
                connectingFrom={connectingFrom}
                onRegisterPort={handleRegisterPort}
                onUpdateNodeData={handleUpdateNodeData}
                onOpenMediaPicker={(nodeId, field) =>
                  setMediaPickerTarget({ nodeId, field, mediaKind: "image" })
                }
                onSelect={() => {
                  setSelectedNodeId(node.id);
                  setSelectedEdgeId(null);
                }}
                onDelete={() => handleDeleteNode(node.id)}
                onDuplicate={() => handleDuplicateNode(node.id)}
                onTestNode={() => {
                  setSelectedNodeId(node.id);
                }}
                onStartConnect={handleStartConnect}
                onEndConnect={handleEndConnect}
              />
            </div>
          ))}
        </div>

        {/* Floating Node Palette */}
        <NodePalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onAddNode={handleAddNode}
        />

        {/* Floating Node Properties Inspector */}
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            allNodes={nodes}
            workflowId={workflow.id}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNodeData={handleUpdateNodeData}
            onOpenMediaPicker={(nodeId, field) =>
              setMediaPickerTarget({ nodeId, field, mediaKind: "image" })
            }
            onTestNode={onTestNode}
          />
        )}

        {/* Workspace Media Library Picker Modal */}
        {mediaPickerTarget && (
          <WorkspaceMediaPickerModal
            open={!!mediaPickerTarget}
            mediaKind={mediaPickerTarget.mediaKind || "image"}
            onClose={() => setMediaPickerTarget(null)}
            onSelect={async (file: WorkspaceFile) => {
              try {
                const url = await getCachedFileMediaUrl(file.id, "preview");
                const isVid =
                  file.mime_type.startsWith("video/") ||
                  file.name.endsWith(".mp4");
                handleUpdateNodeData(mediaPickerTarget.nodeId, {
                  [mediaPickerTarget.field]: url,
                  imageUrl: !isVid ? url : undefined,
                  videoUrl: isVid ? url : undefined,
                  fileId: file.id,
                  fileName: file.name,
                  mediaKind: isVid ? "video" : "image",
                });
              } catch (err) {
                console.error("Failed to fetch file media URL", err);
              } finally {
                setMediaPickerTarget(null);
              }
            }}
          />
        )}

        {/* Zoom & Canvas Controls (Bottom Left) */}
        <div
          onWheel={(e) => e.stopPropagation()}
          className="absolute bottom-6 left-6 z-20 flex items-center gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-1.5 shadow-lg backdrop-blur-md"
        >
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
            title="Приблизить"
            className="rounded-xl p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="px-1 text-xs font-mono text-zinc-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.3))}
            title="Отдалить"
            className="rounded-xl p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Сбросить вид (100%)"
            className="rounded-xl p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Economics & Cost Modal */}
        {showEconomicsModal && (
          <div
            onWheel={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Экономика и стоимость запуска
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Полный расчёт расхода квот тарифа и баланса кошелька
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEconomicsModal(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                  <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                    По тарифу (Included)
                  </span>
                  <p className="mt-1 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    0 ₽
                  </p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    Списывается из квоты тарифа при наличии
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/40 p-3">
                  <span className="text-[10px] font-semibold uppercase text-zinc-500">
                    С кошелька (overage)
                  </span>
                  <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    ~{costSummary.totalWalletRubles.toFixed(2)} ₽
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Только при исчерпании квоты тарифа
                  </p>
                </div>
              </div>

              {/* Resource Summary Counters */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">AI Текст</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.textCount}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">AI Фото</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.imageCount}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">AI Видео</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.videoCount}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">Посты</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.socialCount}
                  </span>
                </div>
              </div>

              {/* Breakdown by Node */}
              <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto pr-1">
                <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Детализация шагов ({costSummary.totalNodes} узлов):
                </h4>

                {costSummary.items.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-2">
                    На холсте нет узлов с расходом генераций или публикаций
                  </p>
                ) : (
                  costSummary.items.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-800/30 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                          {item.nodeTitle}
                        </span>
                        <p className="text-[10px] text-zinc-500">
                          {item.category}: {item.unit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[11px] block">
                          {item.quotaLabel}
                        </span>
                        {item.walletRubles > 0 && (
                          <p className="text-[10px] text-zinc-400">
                            или ~{item.walletRubles.toFixed(2)} ₽
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Economy Rules Notice */}
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/60 dark:bg-indigo-950/20 p-3 text-[11px] text-indigo-900 dark:text-indigo-200">
                <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Принцип расчёта экономики:</span>
                </div>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  1. Сначала расходуются включенные квоты действующего тарифа.
                  2. При нуле квоты расходуется баланс кошелька по тарифам генераций.
                  3. Социальные посты не списывают баланс кошелька и используют только лимит постов тарифа.
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowEconomicsModal(false)}
                  className="rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
