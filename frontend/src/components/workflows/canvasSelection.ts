import type { WorkflowEdge, WorkflowNode } from "@/lib/workflows-api";
import {
  NODE_CARD_LAYOUT,
  NODE_DEFINITIONS,
  nodeMinHeightPx,
  type NodeViewMode,
} from "./nodeTypes";

export type GraphRect = { x: number; y: number; w: number; h: number };
export type GraphPoint = { x: number; y: number };

export function clientToGraph(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  pan: GraphPoint,
  zoom: number
): GraphPoint {
  return {
    x: (clientX - canvasRect.left - pan.x) / zoom,
    y: (clientY - canvasRect.top - pan.y) / zoom,
  };
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): GraphRect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  };
}

export function getNodeBounds(node: WorkflowNode, view: NodeViewMode): GraphRect {
  const def = NODE_DEFINITIONS[node.type];
  const portCount = Math.max(def?.inputs.length ?? 0, def?.outputs.length ?? 0, 1);
  const isTrigger = node.type === "trigger";
  const compact = view === "compact";
  const w = compact
    ? NODE_CARD_LAYOUT.compact.width
    : isTrigger
    ? NODE_CARD_LAYOUT.expanded.triggerWidth
    : NODE_CARD_LAYOUT.expanded.width;
  const h = compact
    ? nodeMinHeightPx("compact", portCount)
    : isTrigger
    ? NODE_CARD_LAYOUT.expanded.triggerHeight
    : nodeMinHeightPx("expanded", portCount);
  return { x: node.position.x, y: node.position.y, w, h };
}

export function rectsIntersect(a: GraphRect, b: GraphRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(x: number, y: number, r: GraphRect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (den === 0) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function lineIntersectsRect(
  p1: GraphPoint,
  p2: GraphPoint,
  r: GraphRect
): boolean {
  if (pointInRect(p1.x, p1.y, r) || pointInRect(p2.x, p2.y, r)) return true;
  return (
    segmentsIntersect(p1.x, p1.y, p2.x, p2.y, r.x, r.y, r.x + r.w, r.y) ||
    segmentsIntersect(p1.x, p1.y, p2.x, p2.y, r.x, r.y + r.h, r.x + r.w, r.y + r.h) ||
    segmentsIntersect(p1.x, p1.y, p2.x, p2.y, r.x, r.y, r.x, r.y + r.h) ||
    segmentsIntersect(p1.x, p1.y, p2.x, p2.y, r.x + r.w, r.y, r.x + r.w, r.y + r.h)
  );
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function unionIds(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

export function makeNodeId(type: string, used: Set<string>): string {
  let i = 0;
  while (i < 50) {
    const id = `${type}_${Date.now().toString(36).slice(-4)}${Math.random()
      .toString(36)
      .slice(2, 5)}`;
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
    i += 1;
  }
  const fallback = `${type}_${Date.now()}_${used.size}`;
  used.add(fallback);
  return fallback;
}

export function remapExpressions(
  value: unknown,
  idMap: Map<string, string>
): unknown {
  if (typeof value === "string") {
    let next = value;
    idMap.forEach((newId, oldId) => {
      next = next.split(`{{ ${oldId}.`).join(`{{ ${newId}.`);
      next = next.split(`{{${oldId}.`).join(`{{${newId}.`);
    });
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((item) => remapExpressions(item, idMap));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      out[key] = remapExpressions(item, idMap);
    });
    return out;
  }
  return value;
}

export function cloneGraphSelection(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  selectedNodeIds: string[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null {
  const selected = nodes.filter((node) => selectedNodeIds.includes(node.id));
  if (selected.length === 0) return null;
  const ids = new Set(selected.map((node) => node.id));
  return {
    nodes: selected.map((node) => ({
      ...node,
      data: { ...node.data },
    })),
    edges: edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map((edge) => ({ ...edge })),
  };
}

export function pasteGraphSelection(
  clip: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
  existingNodes: WorkflowNode[],
  offset = 40
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const used = new Set(existingNodes.map((node) => node.id));
  const idMap = new Map<string, string>();
  clip.nodes.forEach((node) => {
    idMap.set(node.id, makeNodeId(node.type, used));
  });
  const nodes = clip.nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id) || node.id,
    position: {
      x: Math.round(node.position.x + offset),
      y: Math.round(node.position.y + offset),
    },
    data: remapExpressions({ ...node.data }, idMap) as Record<string, unknown>,
  }));
  const stamp = Date.now();
  const edges = clip.edges.map((edge, index) => ({
    ...edge,
    id: `e_${idMap.get(edge.source)}_${idMap.get(edge.target)}_${stamp}_${index}`,
    source: idMap.get(edge.source) || edge.source,
    target: idMap.get(edge.target) || edge.target,
  }));
  return { nodes, edges };
}
