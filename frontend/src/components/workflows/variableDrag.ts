import { isPortCompatible, PORT_TYPE_COLORS } from "./nodeTypes";

export const VAR_DRAG_MIME = "application/x-postilka-workflow-var";

export type WorkflowVarPayload = {
  nodeId: string;
  portId: string;
  type: string;
  label: string;
  expression: string;
};

const FIELD_ACCEPT: Record<string, string> = {
  text: "string",
  prompt: "string",
  role: "string",
  title: "string",
  titleText: "string",
  description: "string",
  firstComment: "string",
  template: "string",
  body: "string",
  url: "string",
  tags: "string",
  notes: "string",
  rssFeedUrl: "string",
  mediaUrl: "any",
  fileUrl: "any",
  fileId: "any",
  imageUrl: "image",
  imageFileId: "any",
  referenceImage: "image",
  firstFrame: "image",
  videoUrl: "video",
  videoFileId: "any",
  leftValue: "any",
  rightValue: "any",
  rule0_value1: "any",
  rule0_value2: "any",
  rule1_value1: "any",
  rule1_value2: "any",
};

export function inferFieldAccept(field: string): string {
  if (field.startsWith("fieldValue:")) return "any";
  const known = FIELD_ACCEPT[field];
  if (known) return known;
  const lower = field.toLowerCase();
  if (lower.includes("video")) return "video";
  if (
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("frame") ||
    lower.includes("reference")
  ) {
    return "image";
  }
  if (lower.includes("media") || lower.includes("file")) return "any";
  return "string";
}

/** Field drop rules are stricter than canvas wires: media cannot go into text. */
export function canAcceptVariable(accept: string, sourceType: string): boolean {
  if (!accept || !sourceType) return true;
  if (accept === "string" && (sourceType === "image" || sourceType === "video")) {
    return false;
  }
  if (accept === "image" && (sourceType === "video" || sourceType === "string" || sourceType === "number" || sourceType === "boolean")) {
    return false;
  }
  if (accept === "video" && (sourceType === "image" || sourceType === "string" || sourceType === "number" || sourceType === "boolean")) {
    return false;
  }
  if (accept === "number" && sourceType !== "number" && sourceType !== "any") {
    return false;
  }
  if (accept === "boolean" && sourceType !== "boolean" && sourceType !== "any") {
    return false;
  }
  return isPortCompatible(sourceType, accept);
}

export function dropModeForAccept(accept: string): "insert" | "replace" {
  if (accept === "image" || accept === "video" || accept === "any") return "replace";
  return "insert";
}

export function applyVariableDrop(
  current: string,
  expression: string,
  mode: "insert" | "replace"
): string {
  if (mode === "replace") return expression;
  const value = current || "";
  if (!value.trim()) return expression;
  if (value.includes(expression)) return value;
  const needsSpace = !/\s$/.test(value);
  return needsSpace ? `${value} ${expression}` : `${value}${expression}`;
}

export function encodeVarPayload(payload: WorkflowVarPayload): string {
  return JSON.stringify(payload);
}

export function parseVarPayload(dataTransfer: DataTransfer | null): WorkflowVarPayload | null {
  if (!dataTransfer) return null;
  const raw =
    dataTransfer.getData(VAR_DRAG_MIME) || dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkflowVarPayload;
    if (parsed?.expression && parsed.type) return parsed;
  } catch {
    const trimmed = raw.trim();
    const match = trimmed.match(/^\{\{\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_.]+)\s*\}\}$/);
    if (match) {
      return {
        nodeId: match[1],
        portId: match[2],
        type: inferPortTypeFromId(match[2]),
        label: match[2],
        expression: trimmed,
      };
    }
  }
  return null;
}

export function inferPortTypeFromId(portId: string): string {
  const id = portId.toLowerCase();
  if (id.includes("video")) return "video";
  if (id.includes("image") || id.includes("photo")) return "image";
  if (id.includes("token") || id.includes("count") || id.includes("duration")) return "number";
  if (id === "file_url" || id === "file_id" || id === "fileid") return "any";
  return "string";
}

export function buildVarExpression(nodeId: string, portId: string): string {
  return `{{ ${nodeId}.${portId} }}`;
}

export function rejectDropMessage(accept: string, sourceType: string): string {
  const acceptLabel = PORT_TYPE_COLORS[accept]?.label || accept;
  const sourceLabel = PORT_TYPE_COLORS[sourceType]?.label || sourceType;
  return `Нельзя подставить «${sourceLabel}» в поле «${acceptLabel}»`;
}

export function varDropAttrs(field: string, accept?: string): Record<string, string> {
  const resolved = accept || inferFieldAccept(field);
  return {
    "data-var-field": field,
    "data-var-accept": resolved,
  };
}
