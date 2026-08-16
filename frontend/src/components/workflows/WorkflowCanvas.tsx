"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import Link from "next/link";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
} from "@/lib/workflows-api";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { NodePalette } from "./NodePalette";
import { NodeInspector } from "./NodeInspector";
import { NODE_DEFINITIONS } from "./nodeTypes";

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
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Sync state if initial prop changes
  useEffect(() => {
    setNodes(workflow.graph.nodes || []);
    setEdges(workflow.graph.edges || []);
    setName(workflow.name);
    setIsActive(workflow.is_active);
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
    e: React.MouseEvent
  ) => {
    setConnectingFrom({
      nodeId,
      handleId,
      isOutput,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Complete connecting wire
  const handleEndConnect = (nodeId: string, handleId: string, isOutput: boolean) => {
    if (!connectingFrom) return;
    if (connectingFrom.nodeId === nodeId) return; // don't self-connect

    const source = connectingFrom.isOutput ? connectingFrom.nodeId : nodeId;
    const target = connectingFrom.isOutput ? nodeId : connectingFrom.nodeId;
    const sourceHandle = connectingFrom.isOutput ? connectingFrom.handleId : handleId;
    const targetHandle = connectingFrom.isOutput ? handleId : connectingFrom.handleId;

    // Check if edge already exists
    const exists = edges.some(
      (edge) => edge.source === source && edge.target === target
    );
    if (!exists) {
      const newEdge: WorkflowEdge = {
        id: `e_${source}_${target}_${Date.now()}`,
        source,
        target,
        sourceHandle,
        targetHandle,
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
  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) =>
      prev.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

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

        {/* Right: History, Test Run & Save */}
        <div className="flex items-center gap-2">
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

              // Compute port anchors
              const x1 = sourceNode.position.x + 288; // width of node card
              const y1 = sourceNode.position.y + 110;
              const x2 = targetNode.position.x;
              const y2 = targetNode.position.y + 110;

              const dx = Math.abs(x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              const isEdgeSelected = selectedEdgeId === edge.id;

              return (
                <g key={edge.id} className="pointer-events-auto">
                  {/* Invisible wide stroke for easy clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
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
                    stroke={
                      isEdgeSelected
                        ? "#6366f1"
                        : "currentColor"
                    }
                    strokeWidth={isEdgeSelected ? "3" : "2"}
                    className={`${
                      isEdgeSelected
                        ? "text-indigo-600"
                        : "text-zinc-300 dark:text-zinc-700 hover:text-indigo-400"
                    } transition`}
                  />
                </g>
              );
            })}

            {/* Connecting Wire in progress */}
            {connectingFrom && (
              <path
                d={`M ${(connectingFrom.x - (canvasRef.current?.getBoundingClientRect().left || 0) - pan.x) / zoom} ${(connectingFrom.y - (canvasRef.current?.getBoundingClientRect().top || 0) - pan.y) / zoom} L ${(mousePos.x - (canvasRef.current?.getBoundingClientRect().left || 0) - pan.x) / zoom} ${(mousePos.y - (canvasRef.current?.getBoundingClientRect().top || 0) - pan.y) / zoom}`}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            )}
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
            onTestNode={onTestNode}
          />
        )}

        {/* Zoom & Canvas Controls (Bottom Left) */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-1.5 shadow-lg backdrop-blur-md">
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
      </div>
    </div>
  );
};
