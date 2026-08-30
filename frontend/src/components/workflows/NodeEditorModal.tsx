"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Play,
  Search,
  X,
} from "lucide-react";
import type { WorkflowEdge, WorkflowNode, WorkflowRunStep } from "@/lib/workflows-api";
import { NODE_DEFINITIONS, PORT_TYPE_COLORS } from "./nodeTypes";
import { NodeInspector } from "./NodeInspector";
import { VariableDragProvider, useVariableDrag } from "./VariableDragContext";
import {
  VAR_DRAG_MIME,
  applyVariableDrop,
  buildVarExpression,
  canAcceptVariable,
  dropModeForAccept,
  encodeVarPayload,
  inferFieldAccept,
  inferPortTypeFromId,
  parseVarPayload,
  rejectDropMessage,
  varDropAttrs,
  type WorkflowVarPayload,
} from "./variableDrag";

type DataView = "schema" | "table" | "json";
type CenterTab = "parameters" | "settings";

type TestResult = {
  outputs?: Record<string, unknown>;
  error?: string;
};

interface NodeEditorModalProps {
  node: WorkflowNode;
  allNodes: WorkflowNode[];
  edges: WorkflowEdge[];
  workflowId?: string;
  lastRunSteps?: WorkflowRunStep[];
  outputCache?: Record<string, Record<string, unknown>>;
  onClose: () => void;
  onUpdateNodeData: (nodeId: string, newData: Record<string, any>) => void;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
  onTestNode: (node: WorkflowNode) => Promise<{ outputs: Record<string, any> }>;
  onTestSuccess?: (nodeId: string, outputs: Record<string, any>) => void;
}

function flattenEntries(
  value: unknown,
  prefix = ""
): Array<{ path: string; value: unknown }> {
  if (value === null || value === undefined) {
    return prefix ? [{ path: prefix, value }] : [];
  }
  if (typeof value !== "object") {
    return [{ path: prefix || "value", value }];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ path: prefix || "items", value: [] }];
    }
    return value.flatMap((item, idx) =>
      flattenEntries(item, prefix ? `${prefix}[${idx}]` : `[${idx}]`)
    );
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return prefix ? [{ path: prefix, value: {} }] : [];
  }
  return entries.flatMap(([key, nested]) =>
    flattenEntries(nested, prefix ? `${prefix}.${key}` : key)
  );
}

function formatPreview(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function payloadForNode(
  nodeId: string,
  outputCache?: Record<string, Record<string, unknown>>,
  lastRunSteps?: WorkflowRunStep[]
): Record<string, unknown> | null {
  const cached = outputCache?.[nodeId];
  if (cached && Object.keys(cached).length > 0) return cached;
  const step = lastRunSteps?.find(
    (s) => s.node_id === nodeId && s.status === "completed" && s.outputs
  );
  if (step?.outputs && Object.keys(step.outputs).length > 0) {
    return step.outputs as Record<string, unknown>;
  }
  return null;
}

const ViewToggle: React.FC<{
  value: DataView;
  onChange: (next: DataView) => void;
}> = ({ value, onChange }) => (
  <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/60 p-0.5 text-[10px] font-semibold">
    {(
      [
        ["schema", "Схема"],
        ["table", "Таблица"],
        ["json", "JSON"],
      ] as const
    ).map(([id, label]) => (
      <button
        key={id}
        type="button"
        onClick={() => onChange(id)}
        className={`rounded-md px-2 py-1 transition ${
          value === id
            ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const JsonBlock: React.FC<{ data: unknown; emptyLabel: string }> = ({
  data,
  emptyLabel,
}) => {
  if (data === null || data === undefined) {
    return <p className="text-xs text-zinc-500">{emptyLabel}</p>;
  }
  return (
    <pre className="max-h-full overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-[11px] font-mono text-zinc-800 dark:text-zinc-200">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

const TableBlock: React.FC<{
  data: unknown;
  emptyLabel: string;
  draggableRows?: boolean;
}> = ({ data, emptyLabel, draggableRows }) => {
  const { setPayload } = useVariableDrag();
  const rows = flattenEntries(data);
  if (rows.length === 0) {
    return <p className="text-xs text-zinc-500">{emptyLabel}</p>;
  }

  const startRowDrag = (path: string, e: React.DragEvent) => {
    const [nodeId, ...rest] = path.split(".");
    const portId = rest.join(".") || path;
    if (!nodeId || !draggableRows) return;
    const payload: WorkflowVarPayload = {
      nodeId,
      portId,
      type: inferPortTypeFromId(portId),
      label: portId,
      expression: buildVarExpression(nodeId, portId),
    };
    e.dataTransfer.setData(VAR_DRAG_MIME, encodeVarPayload(payload));
    e.dataTransfer.setData("text/plain", payload.expression);
    e.dataTransfer.effectAllowed = "copy";
    setPayload(payload);
  };

  return (
    <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-zinc-50 dark:bg-zinc-800/70 text-zinc-500">
          <tr>
            <th className="px-2.5 py-1.5 font-semibold">Поле</th>
            <th className="px-2.5 py-1.5 font-semibold">Значение</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.path}
              draggable={!!draggableRows}
              onDragStart={(e) => startRowDrag(row.path, e)}
              onDragEnd={() => setPayload(null)}
              className={`border-t border-zinc-100 dark:border-zinc-800 ${
                draggableRows
                  ? "cursor-grab active:cursor-grabbing hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30"
                  : ""
              }`}
              title={draggableRows ? "Перетащите в поле параметров" : undefined}
            >
              <td className="px-2.5 py-1.5 font-mono text-zinc-600 dark:text-zinc-400 align-top whitespace-nowrap">
                {row.path}
              </td>
              <td className="px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 break-all">
                {formatPreview(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SchemaTree: React.FC<{
  groups: Array<{
    id: string;
    title: string;
    fields: Array<{ id: string; label: string; type?: string; value?: unknown }>;
  }>;
  query: string;
  emptyLabel: string;
  draggableFields?: boolean;
}> = ({ groups, query, emptyLabel, draggableFields }) => {
  const { setPayload, focusedField } = useVariableDrag();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const filtered = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => {
        if (!q) return true;
        return (
          field.id.toLowerCase().includes(q) ||
          field.label.toLowerCase().includes(q) ||
          group.title.toLowerCase().includes(q)
        );
      }),
    }))
    .filter((group) => group.fields.length > 0);

  if (filtered.length === 0) {
    return <p className="text-xs text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-1">
      {filtered.map((group) => {
        const isOpen = openIds[group.id] !== false;
        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() =>
                setOpenIds((prev) => ({ ...prev, [group.id]: !isOpen }))
              }
              className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
              )}
              <span className="truncate">{group.title}</span>
              <span className="ml-auto text-[10px] font-normal text-zinc-400">
                {group.fields.length}
              </span>
            </button>
            {isOpen && (
              <div className="ml-4 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                {group.fields.map((field) => {
                  const portType = field.type || inferPortTypeFromId(field.id);
                  const typeMeta = PORT_TYPE_COLORS[portType];
                  const payload: WorkflowVarPayload = {
                    nodeId: group.id,
                    portId: field.id,
                    type: portType,
                    label: field.label,
                    expression: buildVarExpression(group.id, field.id),
                  };
                  return (
                    <div
                      key={`${group.id}-${field.id}`}
                      draggable={!!draggableFields}
                      onDragStart={(e) => {
                        if (!draggableFields) return;
                        e.dataTransfer.setData(
                          VAR_DRAG_MIME,
                          encodeVarPayload(payload)
                        );
                        e.dataTransfer.setData("text/plain", payload.expression);
                        e.dataTransfer.effectAllowed = "copy";
                        setPayload(payload);
                      }}
                      onDragEnd={() => setPayload(null)}
                      className={`rounded-md px-1.5 py-1 ${
                        draggableFields
                          ? "cursor-grab active:cursor-grabbing hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                          : ""
                      }`}
                      title={
                        draggableFields
                          ? focusedField
                            ? `Перетащите в поле или отпустите над параметром`
                            : "Перетащите в поле параметров"
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="min-w-0 flex-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {field.label}
                        </div>
                        {typeMeta && (
                          <span
                            className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold ${typeMeta.badge}`}
                          >
                            {typeMeta.label}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500 truncate">
                        {field.value !== undefined
                          ? formatPreview(field.value)
                          : field.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SettingsPane: React.FC<{
  node: WorkflowNode;
  copied: boolean;
  onCopyId: () => void;
  onUpdateNodeData: (nodeId: string, newData: Record<string, any>) => void;
}> = ({ node, copied, onCopyId, onUpdateNodeData }) => {
  const { payload, dropError, setDropError, setFocusedField } = useVariableDrag();

  const applyDrop = (field: string, expression: string, sourceType: string) => {
    const accept = inferFieldAccept(field);
    if (!canAcceptVariable(accept, sourceType)) {
      setDropError(rejectDropMessage(accept, sourceType));
      return;
    }
    const current = String(node.data[field] || "");
    onUpdateNodeData(node.id, {
      ...node.data,
      [field]: applyVariableDrop(current, expression, dropModeForAccept(accept)),
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    const fieldEl = (e.target as HTMLElement).closest("[data-var-field]");
    if (!fieldEl) return;
    const next = payload || parseVarPayload(e.dataTransfer);
    if (!next) return;
    const accept =
      (fieldEl as HTMLElement).dataset.varAccept ||
      inferFieldAccept((fieldEl as HTMLElement).dataset.varField || "");
    e.preventDefault();
    e.dataTransfer.dropEffect = canAcceptVariable(accept, next.type)
      ? "copy"
      : "none";
  };

  const onDrop = (e: React.DragEvent) => {
    const fieldEl = (e.target as HTMLElement).closest(
      "[data-var-field]"
    ) as HTMLElement | null;
    if (!fieldEl?.dataset.varField) return;
    const next = payload || parseVarPayload(e.dataTransfer);
    if (!next) return;
    e.preventDefault();
    applyDrop(fieldEl.dataset.varField, next.expression, next.type);
  };

  return (
    <div
      className="space-y-4 text-xs"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onFocusCapture={(e) => {
        const fieldEl = (e.target as HTMLElement).closest("[data-var-field]") as
          | HTMLElement
          | null;
        if (fieldEl?.dataset.varField) setFocusedField(fieldEl.dataset.varField);
      }}
    >
      {dropError && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-[11px] font-medium text-red-700 dark:text-red-300">
          {dropError}
        </div>
      )}
      <div>
        <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
          Название узла
        </label>
        <input
          type="text"
          value={(node.data.title as string) || ""}
          onChange={(e) =>
            onUpdateNodeData(node.id, {
              ...node.data,
              title: e.target.value,
            })
          }
          {...varDropAttrs("title")}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
          Идентификатор
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            {node.id}
          </code>
          <button
            type="button"
            onClick={onCopyId}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Скопировать ID"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        {copied && (
          <p className="mt-1 text-[10px] text-emerald-600">Скопировано</p>
        )}
      </div>
      <div>
        <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
          Заметка
        </label>
        <textarea
          rows={4}
          value={(node.data.notes as string) || ""}
          onChange={(e) =>
            onUpdateNodeData(node.id, {
              ...node.data,
              notes: e.target.value,
            })
          }
          {...varDropAttrs("notes")}
          placeholder="Коротко, зачем этот шаг в процессе"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

export const NodeEditorModal: React.FC<NodeEditorModalProps> = ({
  node,
  allNodes,
  edges,
  workflowId,
  lastRunSteps,
  outputCache,
  onClose,
  onUpdateNodeData,
  onOpenMediaPicker,
  onTestNode,
  onTestSuccess,
}) => {
  const [centerTab, setCenterTab] = useState<CenterTab>("parameters");
  const [inputView, setInputView] = useState<DataView>("schema");
  const [outputView, setOutputView] = useState<DataView>("schema");
  const [inputQuery, setInputQuery] = useState("");
  const [outputQuery, setOutputQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const def = NODE_DEFINITIONS[node.type];
  const title = (node.data.title as string) || def?.title || node.type;

  const incoming = useMemo(() => {
    const sourceIds = new Set(
      edges.filter((edge) => edge.target === node.id).map((edge) => edge.source)
    );
    return allNodes.filter((item) => sourceIds.has(item.id));
  }, [allNodes, edges, node.id]);

  const inputPayload = useMemo(() => {
    const bag: Record<string, unknown> = {};
    incoming.forEach((src) => {
      const payload = payloadForNode(src.id, outputCache, lastRunSteps);
      if (payload) bag[src.id] = payload;
    });
    return Object.keys(bag).length > 0 ? bag : null;
  }, [incoming, outputCache, lastRunSteps]);

  const outputPayload =
    testResult?.outputs ||
    payloadForNode(node.id, outputCache, lastRunSteps);

  const inputGroups = useMemo(
    () =>
      incoming.map((src) => {
        const srcDef = NODE_DEFINITIONS[src.type];
        const payload = payloadForNode(src.id, outputCache, lastRunSteps);
        const fields = (srcDef?.outputs || []).map((port) => ({
          id: port.id,
          label: port.label,
          type: port.type,
          value: payload ? payload[port.id] : undefined,
        }));
        return {
          id: src.id,
          title: (src.data.title as string) || srcDef?.title || src.id,
          fields:
            fields.length > 0
              ? fields
              : payload
              ? Object.keys(payload).map((key) => ({
                  id: key,
                  label: key,
                  type: inferPortTypeFromId(key),
                  value: payload[key],
                }))
              : [],
        };
      }),
    [incoming, outputCache, lastRunSteps]
  );

  const outputGroups = useMemo(() => {
    const fields = (def?.outputs || []).map((port) => ({
      id: port.id,
      label: port.label,
      value: outputPayload ? outputPayload[port.id] : undefined,
    }));
    if (fields.length === 0 && outputPayload) {
      return [
        {
          id: node.id,
          title: title,
          fields: Object.keys(outputPayload).map((key) => ({
            id: key,
            label: key,
            value: outputPayload[key],
          })),
        },
      ];
    }
    return [
      {
        id: node.id,
        title,
        fields,
      },
    ];
  }, [def, node.id, outputPayload, title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestNode(node);
      setTestResult({ outputs: res.outputs });
      onTestSuccess?.(node.id, res.outputs);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Ошибка при выполнении узла";
      setTestResult({ error: message });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(node.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const isWebhookTrigger =
    node.type === "trigger" && node.data.triggerType === "webhook";

  return (
    <VariableDragProvider>
    <div
      className="absolute inset-0 z-40 flex flex-col bg-zinc-50 dark:bg-zinc-950"
      data-panel="node-editor"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад на холст
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(240px,1fr)_minmax(360px,1.4fr)_minmax(240px,1fr)]">
        <section className="flex min-h-0 flex-col border-b border-zinc-200 dark:border-zinc-800 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Вход
            </span>
            <ViewToggle value={inputView} onChange={setInputView} />
          </div>
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              type="search"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Поиск по полям..."
              className="w-full bg-transparent text-xs text-zinc-800 dark:text-zinc-200 outline-none placeholder:text-zinc-400"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 space-y-2">
            {incoming.length > 0 && (
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Перетащите поле в параметр узла. Тип должен совпадать: текст не
                примет фото или видео.
              </p>
            )}
            {incoming.length === 0 ? (
              <p className="text-xs text-zinc-500 leading-relaxed">
                К этому узлу ещё не подключены предыдущие шаги. Данные появятся
                после соединения и выполнения предыдущих узлов.
              </p>
            ) : inputView === "json" ? (
              <JsonBlock
                data={inputPayload}
                emptyLabel="Нет данных с предыдущих узлов. Выполните их, чтобы увидеть значения."
              />
            ) : inputView === "table" ? (
              <TableBlock
                data={inputPayload}
                emptyLabel="Нет табличных данных. Сначала выполните предыдущие узлы."
                draggableRows
              />
            ) : (
              <SchemaTree
                groups={inputGroups}
                query={inputQuery}
                emptyLabel="Нет схемы входа — подключите предыдущий узел."
                draggableFields
              />
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${
                  def?.color.badge || "bg-indigo-600"
                }`}
              >
                <Play className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h2>
                <p className="truncate text-[10px] text-zinc-500">
                  {def?.title || node.type}
                </p>
              </div>
            </div>
            {!isWebhookTrigger && (
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                {testing
                  ? "Выполняется..."
                  : node.type.startsWith("social_")
                  ? "Отправить тест"
                  : "Выполнить шаг"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 px-4">
            {(
              [
                ["parameters", "Параметры"],
                ["settings", "Настройки"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCenterTab(id)}
                className={`relative py-2.5 text-xs font-semibold transition ${
                  centerTab === id
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {label}
                {centerTab === id && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {centerTab === "parameters" ? (
              <NodeInspector
                layout="form"
                node={node}
                allNodes={allNodes}
                workflowId={workflowId}
                onUpdateNodeData={onUpdateNodeData}
                onOpenMediaPicker={onOpenMediaPicker}
              />
            ) : (
              <SettingsPane
                node={node}
                copied={copied}
                onCopyId={handleCopyId}
                onUpdateNodeData={onUpdateNodeData}
              />
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col border-t border-zinc-200 dark:border-zinc-800 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Выход
              </span>
              {testResult?.outputs && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {testResult?.error && (
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              )}
            </div>
            <ViewToggle value={outputView} onChange={setOutputView} />
          </div>
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              type="search"
              value={outputQuery}
              onChange={(e) => setOutputQuery(e.target.value)}
              placeholder="Поиск по результату..."
              className="w-full bg-transparent text-xs text-zinc-800 dark:text-zinc-200 outline-none placeholder:text-zinc-400"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {testResult?.error ? (
              <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-800 dark:text-red-300">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  Ошибка выполнения
                </div>
                <p>{testResult.error}</p>
              </div>
            ) : !outputPayload ? (
              <p className="text-xs text-zinc-500 leading-relaxed">
                Выполните шаг, чтобы увидеть данные или результат работы узла.
              </p>
            ) : outputView === "json" ? (
              <JsonBlock data={outputPayload} emptyLabel="Пустой результат." />
            ) : outputView === "table" ? (
              <TableBlock data={outputPayload} emptyLabel="Пустой результат." />
            ) : (
              <SchemaTree
                groups={outputGroups}
                query={outputQuery}
                emptyLabel="Нет полей выхода у этого узла."
              />
            )}
          </div>
        </section>
      </div>
    </div>
    </VariableDragProvider>
  );
};
