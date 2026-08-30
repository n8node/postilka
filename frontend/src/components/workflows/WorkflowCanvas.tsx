"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  Save,
  Plus,
  History,
  LayoutGrid,
  Rows2,
  PanelTop,
  CornerDownRight,
  Spline,
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
import {
  fetchGenerationPricing,
  fetchTextGenerationPricing,
} from "@/lib/generation-api";
import { fetchVideoGenerationPricing } from "@/lib/video-generation-api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import { getFile, type WorkspaceFile } from "@/lib/files-api";
import { getFileDuration } from "@/lib/file-media";
import {
  applyGenerationSlotValue,
  isGenerationSlotField,
  mediaKindForField,
} from "./WorkflowGenerationFields";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { NodePalette } from "./NodePalette";
import { NodeEditorModal } from "./NodeEditorModal";
import {
  NODE_DEFINITIONS,
  NODE_CARD_LAYOUT,
  NODE_VIEW_STORAGE_KEY,
  PORT_TYPE_COLORS,
  isPortCompatible,
  calculateWorkflowCost,
  formatWorkflowCostChip,
  nodeMinHeightPx,
  resolvePortId,
  type NodeViewMode,
  type WorkflowCostPricing,
} from "./nodeTypes";
import {
  EDGE_STYLE_STORAGE_KEY,
  buildEdgePath,
  type EdgeStyle,
} from "./edgePaths";
import {
  clientToGraph,
  cloneGraphSelection,
  getNodeBounds,
  lineIntersectsRect,
  normalizeRect,
  pasteGraphSelection,
  rectsIntersect,
  toggleId,
  unionIds,
} from "./canvasSelection";

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

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
  const [nodeView, setNodeView] = useState<NodeViewMode>(() => {
    if (typeof window === "undefined") return "compact";
    return window.localStorage.getItem(NODE_VIEW_STORAGE_KEY) === "expanded"
      ? "expanded"
      : "compact";
  });
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>(() => {
    if (typeof window === "undefined") return "orthogonal";
    return window.localStorage.getItem(EDGE_STYLE_STORAGE_KEY) === "smooth"
      ? "smooth"
      : "orthogonal";
  });
  const [nodeOutputCache, setNodeOutputCache] = useState<
    Record<string, Record<string, any>>
  >({});
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredDeleteEdgeId, setHoveredDeleteEdgeId] = useState<string | null>(null);
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
  const dragStartRef = useRef<{
    origin: { x: number; y: number };
    positions: Record<string, { x: number; y: number }>;
  } | null>(null);
  const dragMovedRef = useRef(false);
  const clipboardRef = useRef<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  const selectedEdgeIdsRef = useRef(selectedEdgeIds);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  selectedNodeIdsRef.current = selectedNodeIds;
  selectedEdgeIdsRef.current = selectedEdgeIds;

  // Panning canvas state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [marquee, setMarquee] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    additive: boolean;
  } | null>(null);
  const marqueeRef = useRef(marquee);
  marqueeRef.current = marquee;
  const panZoomRef = useRef({ pan, zoom });
  panZoomRef.current = { pan, zoom };

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
    mediaKind?: "image" | "video" | "audio";
  } | null>(null);
  const [costPricing, setCostPricing] = useState<WorkflowCostPricing>({});
  const [fileDurations, setFileDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchGenerationPricing()
        .then((res) => res.pricing)
        .catch(() => null),
      fetchVideoGenerationPricing()
        .then((res) => res.pricing)
        .catch(() => null),
      fetchTextGenerationPricing()
        .then((res) => res.pricing)
        .catch(() => null),
    ]).then(([image, video, text]) => {
      if (!cancelled) {
        setCostPricing((prev) => ({ ...prev, image, video, text }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const missing = new Set<string>();
    for (const node of nodes) {
      if (node.type !== "ai_video") continue;
      const ids = Array.isArray(node.data.referenceVideoFileIds)
        ? node.data.referenceVideoFileIds
        : [];
      const stored = Array.isArray(node.data.referenceVideoDurations)
        ? node.data.referenceVideoDurations
        : [];
      ids.forEach((raw, index) => {
        const fileId = String(raw ?? "").trim();
        if (!fileId) return;
        if (Number(stored[index]) > 0) return;
        if (fileDurations[fileId] != null) return;
        missing.add(fileId);
      });
    }
    if (missing.size === 0) return;
    let cancelled = false;
    Promise.all(
      [...missing].map(async (id) => {
        try {
          const file = await getFile(id);
          return [id, getFileDuration(file) ?? 0] as const;
        } catch {
          return [id, 0] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setFileDurations((prev) => {
        const next = { ...prev };
        for (const [id, duration] of pairs) {
          next[id] = duration;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [nodes, fileDurations]);

  const costSummary = useMemo(
    () => calculateWorkflowCost(nodes, { ...costPricing, fileDurations }),
    [nodes, costPricing, fileDurations],
  );

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
      const actualPortId =
        resolvePortId(node.type, portId, isOutput) || portId || ports?.[0]?.id;
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
    const isTrigger = node.type === "trigger";
    const compact = nodeView === "compact";
    const nodeWidth = compact
      ? NODE_CARD_LAYOUT.compact.width
      : isTrigger
      ? NODE_CARD_LAYOUT.expanded.triggerWidth
      : NODE_CARD_LAYOUT.expanded.width;
    const portIndex = ports?.findIndex((p) => p.id === actualPortId) ?? 0;
    const safeIdx = portIndex >= 0 ? portIndex : 0;
    const totalPorts = Math.max(ports?.length ?? 1, 1);
    const topPercent =
      totalPorts === 1 ? 50 : ((safeIdx + 1) / (totalPorts + 1)) * 100;
    const nodeHeight = compact
      ? nodeMinHeightPx("compact", totalPorts)
      : isTrigger
      ? NODE_CARD_LAYOUT.expanded.triggerHeight
      : nodeMinHeightPx("expanded", totalPorts);
    const nodeYOffset = (topPercent / 100) * nodeHeight;
    return {
      x: isOutput ? node.position.x + nodeWidth + 8 : node.position.x - 8,
      y: node.position.y + nodeYOffset,
    };
    },
    [pan.x, pan.y, zoom, nodeView]
  );

  // Sync state if initial prop changes
  useEffect(() => {
    setNodes(workflow.graph.nodes || []);
    setEdges(workflow.graph.edges || []);
    setName(workflow.name);
    setIsActive(workflow.is_active);
    setPortVersion((v) => v + 1);
  }, [workflow]);

  const clearSelection = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, []);

  const applyMarqueeSelection = useCallback(() => {
    const box = marqueeRef.current;
    if (!box) return;
    const rect = normalizeRect(box.x1, box.y1, box.x2, box.y2);
    if (rect.w < 4 && rect.h < 4) {
      setMarquee(null);
      return;
    }
    const hitNodes = nodesRef.current
      .filter((node) => rectsIntersect(rect, getNodeBounds(node, nodeView)))
      .map((node) => node.id);
    const hitEdges = edgesRef.current
      .filter((edge) => {
        const sourceNode = nodesRef.current.find((n) => n.id === edge.source);
        const targetNode = nodesRef.current.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return false;
        const sourceDef = NODE_DEFINITIONS[sourceNode.type];
        const targetDef = NODE_DEFINITIONS[targetNode.type];
        const p1 = getPortAnchor(
          sourceNode,
          edge.sourceHandle || sourceDef?.outputs[0]?.id,
          true
        );
        const p2 = getPortAnchor(
          targetNode,
          edge.targetHandle || targetDef?.inputs[0]?.id,
          false
        );
        return lineIntersectsRect(p1, p2, rect);
      })
      .map((edge) => edge.id);
    setSelectedNodeIds((prev) =>
      box.additive ? unionIds(prev, hitNodes) : hitNodes
    );
    setSelectedEdgeIds((prev) =>
      box.additive ? unionIds(prev, hitEdges) : hitEdges
    );
    setMarquee(null);
  }, [getPortAnchor, nodeView]);

  // Handle Canvas Pan (Mouse Drag) or Shift+drag marquee
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current && (e.target as HTMLElement).tagName !== "svg") {
      return;
    }
    if (connectingFrom) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    if (e.shiftKey) {
      const point = clientToGraph(e.clientX, e.clientY, canvasRect, pan, zoom);
      setMarquee({
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        additive: true,
      });
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    clearSelection();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const canvasRect = canvasRef.current?.getBoundingClientRect();

    if (marquee && canvasRect) {
      const point = clientToGraph(e.clientX, e.clientY, canvasRect, pan, zoom);
      setMarquee((prev) =>
        prev ? { ...prev, x2: point.x, y2: point.y } : prev
      );
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingNodeId && canvasRect && dragStartRef.current) {
      const point = clientToGraph(e.clientX, e.clientY, canvasRect, pan, zoom);
      const dx = point.x - dragStartRef.current.origin.x;
      const dy = point.y - dragStartRef.current.origin.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
      const starts = dragStartRef.current.positions;
      setNodes((prev) =>
        prev.map((n) => {
          const start = starts[n.id];
          if (!start) return n;
          return {
            ...n,
            position: { x: Math.round(start.x + dx), y: Math.round(start.y + dy) },
          };
        })
      );
    }
  };

  const handleMouseUp = useCallback(() => {
    if (marqueeRef.current) applyMarqueeSelection();
    setIsPanning(false);
    setDraggingNodeId(null);
    dragStartRef.current = null;
    setConnectingFrom(null);
  }, [applyMarqueeSelection]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const { pan: nextPan, zoom: nextZoom } = panZoomRef.current;
      const point = clientToGraph(
        e.clientX,
        e.clientY,
        canvasRect,
        nextPan,
        nextZoom
      );
      if (marqueeRef.current) {
        setMarquee((prev) =>
          prev ? { ...prev, x2: point.x, y2: point.y } : prev
        );
        return;
      }
      const start = dragStartRef.current;
      if (!start) return;
      const dx = point.x - start.origin.x;
      const dy = point.y - start.origin.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
      setNodes((prev) =>
        prev.map((n) => {
          const origin = start.positions[n.id];
          if (!origin) return n;
          return {
            ...n,
            position: {
              x: Math.round(origin.x + dx),
              y: Math.round(origin.y + dy),
            },
          };
        })
      );
    };
    const onUp = () => handleMouseUp();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [handleMouseUp]);

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
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const point = clientToGraph(e.clientX, e.clientY, canvasRect, pan, zoom);
    const movingIds = selectedNodeIds.includes(nodeId)
      ? selectedNodeIds
      : [nodeId];
    if (!selectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds([nodeId]);
      setSelectedEdgeIds([]);
    }

    dragMovedRef.current = false;
    dragStartRef.current = {
      origin: point,
      positions: Object.fromEntries(
        nodes
          .filter((item) => movingIds.includes(item.id))
          .map((item) => [item.id, { ...item.position }])
      ),
    };
    setDraggingNodeId(nodeId);
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
    setSelectedNodeIds([newId]);
    setSelectedEdgeIds([]);
  };

  // Duplicate node
  const handleDuplicateNode = (nodeId: string) => {
    const clip = cloneGraphSelection(nodes, edges, [nodeId]);
    if (!clip) return;
    const pasted = pasteGraphSelection(clip, nodes);
    const first = pasted.nodes[0];
    if (first?.data.title && typeof first.data.title === "string") {
      first.data = {
        ...first.data,
        title: `${first.data.title} (Копия)`,
      };
    }
    setNodes((prev) => [...prev, ...pasted.nodes]);
    setEdges((prev) => [...prev, ...pasted.edges]);
    setSelectedNodeIds(pasted.nodes.map((item) => item.id));
    setSelectedEdgeIds(pasted.edges.map((item) => item.id));
  };

  const handleDeleteNodes = useCallback((nodeIds: string[]) => {
    const remove = new Set(nodeIds);
    setNodes((prev) => prev.filter((n) => !remove.has(n.id)));
    setEdges((prev) =>
      prev.filter((e) => !remove.has(e.source) && !remove.has(e.target))
    );
    setSelectedNodeIds((prev) => prev.filter((id) => !remove.has(id)));
    if (inspectedNodeId && remove.has(inspectedNodeId)) {
      setInspectedNodeId(null);
    }
  }, [inspectedNodeId]);

  // Delete node
  const handleDeleteNode = useCallback((nodeId: string) => {
    handleDeleteNodes([nodeId]);
  }, [handleDeleteNodes]);

  // Delete edge (connection)
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setSelectedEdgeIds((prev) => prev.filter((id) => id !== edgeId));
  }, []);

  const handleDeleteSelection = useCallback(() => {
    const nodeIds = selectedNodeIdsRef.current;
    const edgeIds = new Set(selectedEdgeIdsRef.current);
    if (nodeIds.length === 0 && edgeIds.size === 0) return;
    const removeNodes = new Set(nodeIds);
    setNodes((prev) => prev.filter((n) => !removeNodes.has(n.id)));
    setEdges((prev) =>
      prev.filter(
        (e) =>
          !removeNodes.has(e.source) &&
          !removeNodes.has(e.target) &&
          !edgeIds.has(e.id)
      )
    );
    if (inspectedNodeId && removeNodes.has(inspectedNodeId)) {
      setInspectedNodeId(null);
    }
    clearSelection();
  }, [clearSelection, inspectedNodeId]);

  const handleCopySelection = useCallback(() => {
    const clip = cloneGraphSelection(
      nodesRef.current,
      edgesRef.current,
      selectedNodeIdsRef.current
    );
    if (clip) clipboardRef.current = clip;
  }, []);

  const handlePasteSelection = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip) return;
    const pasted = pasteGraphSelection(clip, nodesRef.current);
    setNodes((prev) => [...prev, ...pasted.nodes]);
    setEdges((prev) => [...prev, ...pasted.edges]);
    setSelectedNodeIds(pasted.nodes.map((item) => item.id));
    setSelectedEdgeIds(pasted.edges.map((item) => item.id));
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute("contenteditable") === "true";
      if (isInput) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (inspectedNodeId) {
          setInspectedNodeId(null);
          return;
        }
        setMarquee(null);
        clearSelection();
        return;
      }

      if (inspectedNodeId) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "a") {
        e.preventDefault();
        setSelectedNodeIds(nodesRef.current.map((n) => n.id));
        setSelectedEdgeIds(edgesRef.current.map((edge) => edge.id));
        return;
      }
      if (mod && key === "c") {
        if (selectedNodeIdsRef.current.length === 0) return;
        e.preventDefault();
        handleCopySelection();
        return;
      }
      if (mod && key === "v") {
        if (!clipboardRef.current) return;
        e.preventDefault();
        handlePasteSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          selectedNodeIdsRef.current.length > 0 ||
          selectedEdgeIdsRef.current.length > 0
        ) {
          e.preventDefault();
          handleDeleteSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    inspectedNodeId,
    clearSelection,
    handleCopySelection,
    handlePasteSelection,
    handleDeleteSelection,
  ]);

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
        const layout =
          nodeView === "compact"
            ? NODE_CARD_LAYOUT.compact
            : NODE_CARD_LAYOUT.expanded;
        return {
          ...n,
          position: {
            x: 80 + lvl * layout.colGap,
            y: 100 + (indexInLvl >= 0 ? indexInLvl : 0) * layout.rowGap,
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

  const inspectedNode = nodes.find((n) => n.id === inspectedNodeId) || null;

  const handleNodeViewChange = (mode: NodeViewMode) => {
    setNodeView(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(NODE_VIEW_STORAGE_KEY, mode);
    }
    setPortVersion((v) => v + 1);
  };

  const handleEdgeStyleChange = (style: EdgeStyle) => {
    setEdgeStyle(style);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EDGE_STYLE_STORAGE_KEY, style);
    }
  };

  const handleOpenSettings = (nodeId: string) => {
    setSelectedNodeIds([nodeId]);
    setInspectedNodeId(nodeId);
    setSelectedEdgeIds([]);
  };

  const handleCardTestNode = async (node: WorkflowNode) => {
    setSelectedNodeIds([node.id]);
    try {
      const res = await onTestNode(node);
      setNodeOutputCache((prev) => ({ ...prev, [node.id]: res.outputs }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка при выполнении узла";
      setWarningToast(message);
      setTimeout(() => setWarningToast(null), 3500);
    }
  };

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

          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => handleNodeViewChange("compact")}
              title="Компактные узлы"
              className={`rounded-lg p-1.5 transition ${
                nodeView === "compact"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Rows2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleNodeViewChange("expanded")}
              title="Развёрнутые узлы"
              className={`rounded-lg p-1.5 transition ${
                nodeView === "expanded"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <PanelTop className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => handleEdgeStyleChange("orthogonal")}
              title="Связи под прямым углом"
              className={`rounded-lg p-1.5 transition ${
                edgeStyle === "orthogonal"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <CornerDownRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEdgeStyleChange("smooth")}
              title="Гибкие связи"
              className={`rounded-lg p-1.5 transition ${
                edgeStyle === "smooth"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Spline className="h-4 w-4" />
            </button>
          </div>
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
            <span>{formatWorkflowCostChip(costSummary)}</span>
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
        className={`relative flex-1 select-none overflow-hidden ${
          marquee
            ? "cursor-crosshair"
            : "cursor-grab active:cursor-grabbing"
        }`}
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
              const { d: pathD, mid } = buildEdgePath(edgeStyle, p1, p2);
              const isEdgeSelected = selectedEdgeIds.includes(edge.id);
              const isEdgeHovered = hoveredEdgeId === edge.id;
              const showDeleteBtn =
                isEdgeSelected ||
                isEdgeHovered ||
                hoveredDeleteEdgeId === edge.id;
              const midX = mid.x;
              const midY = mid.y;

              const activeStroke = isEdgeSelected
                ? "#6366f1"
                : isEdgeHovered
                ? "#818cf8"
                : strokeColor;
              const activeStrokeWidth =
                isEdgeSelected || isEdgeHovered ? 3.5 : 2;
              const edgeMotionClass =
                draggingNodeId || isPanning
                  ? ""
                  : "transition-[stroke,stroke-width,stroke-opacity] duration-150";
              const flowDelay =
                (edge.id.charCodeAt(edge.id.length - 1) % 6) * 0.35;

              return (
                <g
                  key={edge.id}
                  className="pointer-events-auto"
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() =>
                    setHoveredEdgeId((prev) => (prev === edge.id ? null : prev))
                  }
                >
                  {/* Invisible wide stroke (36px width) for ultra-easy clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="36"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        setSelectedEdgeIds((prev) => toggleId(prev, edge.id));
                        return;
                      }
                      setSelectedEdgeIds([edge.id]);
                      setSelectedNodeIds([]);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  />
                  {/* Base wire — no geometry transition while dragging */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={activeStroke}
                    strokeWidth={activeStrokeWidth}
                    strokeOpacity={isEdgeSelected || isEdgeHovered ? "1" : "0.88"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${edgeMotionClass} cursor-pointer`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        setSelectedEdgeIds((prev) => toggleId(prev, edge.id));
                        return;
                      }
                      setSelectedEdgeIds([edge.id]);
                      setSelectedNodeIds([]);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  />
                  {/* Subtle flowing highlight (data stream) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={activeStroke}
                    strokeWidth={Math.max(activeStrokeWidth - 0.5, 1.5)}
                    strokeOpacity={
                      isEdgeSelected || isEdgeHovered ? "0.5" : "0.32"
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="workflow-edge-flow"
                    style={{ animationDelay: `${flowDelay}s` }}
                  />
                  {/* Anchor Dots */}
                  <circle
                    cx={p1.x}
                    cy={p1.y}
                    r="4"
                    fill={isEdgeSelected ? "#6366f1" : strokeColor}
                  />
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r="4"
                    fill={isEdgeSelected ? "#6366f1" : strokeColor}
                  />

                  {/* SVG Delete Edge Button on Midpoint (Native SVG for 100% reliable click detection) */}
                  {showDeleteBtn && (
                    <g
                      className="cursor-pointer"
                      onMouseEnter={() => {
                        setHoveredEdgeId(edge.id);
                        setHoveredDeleteEdgeId(edge.id);
                      }}
                      onMouseLeave={() => {
                        setHoveredDeleteEdgeId((prev) =>
                          prev === edge.id ? null : prev
                        );
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEdge(edge.id);
                        setHoveredDeleteEdgeId(null);
                      }}
                    >
                      {/* Generous invisible hit target (48px diameter) */}
                      <circle
                        cx={midX}
                        cy={midY}
                        r="24"
                        fill="transparent"
                        className="cursor-pointer"
                      />

                      {/* Visible delete badge circle */}
                      <circle
                        cx={midX}
                        cy={midY}
                        r="14"
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="pointer-events-none"
                      />

                      {/* Trash icon paths */}
                      <g
                        transform={`translate(${midX - 6}, ${midY - 6})`}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="pointer-events-none"
                      >
                        <path d="M2 3.5h8" />
                        <path d="M7.5 3.5v-1a.8.8 0 0 0-.8-.8H5.3a.8.8 0 0 0-.8.8v1" />
                        <path d="M3 3.5v6.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3.5" />
                        <line x1="5" y1="5.5" x2="5" y2="8.5" />
                        <line x1="7" y1="5.5" x2="7" y2="8.5" />
                      </g>
                      <title>Удалить связь (Delete / Backspace)</title>
                    </g>
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

              const { d: pathD } = buildEdgePath(edgeStyle, { x: x1, y: y1 }, { x: x2, y: y2 });

              return (
                <g>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                  <circle cx={x1} cy={y1} r="4" fill={color.stroke} />
                  <circle cx={x2} cy={y2} r="4" fill={color.stroke} />
                </g>
              );
            })()}
          </svg>

          {marquee && (
            <div
              className="pointer-events-none absolute z-20 border border-indigo-500 bg-indigo-500/10"
              style={{
                left: Math.min(marquee.x1, marquee.x2),
                top: Math.min(marquee.y1, marquee.y2),
                width: Math.abs(marquee.x2 - marquee.x1),
                height: Math.abs(marquee.y2 - marquee.y1),
              }}
            />
          )}

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
                isSelected={selectedNodeIds.includes(node.id)}
                variant={nodeView}
                scale={zoom}
                connectingFrom={connectingFrom}
                onRegisterPort={handleRegisterPort}
                onUpdateNodeData={handleUpdateNodeData}
                onOpenMediaPicker={(nodeId, field) =>
                  setMediaPickerTarget({
                    nodeId,
                    field,
                    mediaKind: mediaKindForField(field),
                  })
                }
                onSelect={(event) => {
                  if (dragMovedRef.current) return;
                  if (event.shiftKey || event.ctrlKey || event.metaKey) {
                    setSelectedNodeIds((prev) => toggleId(prev, node.id));
                    return;
                  }
                  setSelectedNodeIds([node.id]);
                  setSelectedEdgeIds([]);
                }}
                onOpenSettings={() => handleOpenSettings(node.id)}
                onDelete={() => handleDeleteNode(node.id)}
                onDuplicate={() => handleDuplicateNode(node.id)}
                onTestNode={() => {
                  void handleCardTestNode(node);
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

        {inspectedNode && (
          <NodeEditorModal
            node={inspectedNode}
            allNodes={nodes}
            edges={edges}
            workflowId={workflow.id}
            lastRunSteps={workflow.last_run?.steps}
            outputCache={nodeOutputCache}
            onClose={() => setInspectedNodeId(null)}
            onUpdateNodeData={handleUpdateNodeData}
            onOpenMediaPicker={(nodeId, field) =>
              setMediaPickerTarget({
                nodeId,
                field,
                mediaKind: mediaKindForField(field),
              })
            }
            onTestNode={onTestNode}
            onTestSuccess={(nodeId, outputs) =>
              setNodeOutputCache((prev) => ({ ...prev, [nodeId]: outputs }))
            }
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
                const current =
                  nodes.find((n) => n.id === mediaPickerTarget.nodeId)?.data ||
                  {};
                const field = mediaPickerTarget.field;
                let patch: Record<string, unknown>;
                if (isGenerationSlotField(field)) {
                  patch = {
                    ...applyGenerationSlotValue(
                      current,
                      field,
                      url,
                      file.id,
                      file.media_metadata?.duration_seconds,
                    ),
                    fileName: file.name,
                  };
                } else {
                  patch = {
                    ...current,
                    [field]: url,
                    fileName: file.name,
                  };
                  if (field === "imageUrl") {
                    patch.imageUrl = url;
                    patch.imageFileId = file.id;
                  } else if (field === "videoUrl") {
                    patch.videoUrl = url;
                    patch.videoFileId = file.id;
                  } else {
                    patch.fileId = file.id;
                    patch.mediaKind = isVid ? "video" : "image";
                    if (isVid) patch.videoUrl = url;
                    else patch.imageUrl = url;
                  }
                }
                handleUpdateNodeData(mediaPickerTarget.nodeId, patch);
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
                      По тарифам админки и параметрам узлов на холсте
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
                  <span className="block text-[10px] text-zinc-400">
                    {costSummary.estimatedTokens > 0
                      ? `~${costSummary.estimatedTokens} ток.`
                      : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">AI Фото</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.imageCount}
                  </span>
                  <span className="block text-[10px] text-zinc-400">
                    {costSummary.estimatedImageCredits > 0
                      ? `${costSummary.estimatedImageCredits} кред.`
                      : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">AI Видео</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.videoCount}
                  </span>
                  <span className="block text-[10px] text-zinc-400">
                    {costSummary.estimatedVideoCredits > 0
                      ? `${costSummary.estimatedVideoCredits} кред.`
                      : "—"}
                  </span>
                </div>
                <div className="rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 p-2 text-center">
                  <span className="text-[10px] text-zinc-500 block">Посты</span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {costSummary.socialCount}
                  </span>
                  <span className="block text-[10px] text-zinc-400">лимит тарифа</span>
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
                        <p className="truncate font-mono text-[10px] text-zinc-400">
                          {item.id}
                        </p>
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
                  Считаются все AI-узлы на холсте: режим, длительность выхода, секунды
                  референс-видео и тарифы из админки. Формула видео: кред/сек ×
                  (выход + реф. видео) + доп. фото. Сначала квота тарифа, затем кошелёк.
                  {costSummary.hasUnknownVideoDuration
                    ? " У части референс-видео нет длительности — после выбора файла из медиатеки кредиты уточнятся."
                    : ""}
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
