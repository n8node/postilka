import { apiFetch } from "@/lib/api";
import { postGenerationMultipart } from "@/lib/generation-upload";
import type { GenerationJob } from "@/lib/generation-api";
import type { VideoGenerationJob } from "@/lib/video-generation-api";

export type SketchStyle = {
  id: string;
  title: string;
  description: string;
  default_strength: number;
  aspect_ratio: string;
  preview_url?: string;
  sort_order: number;
};

export type SketchStyleAdmin = SketchStyle & {
  positive_prompt: string;
  negative_prompt: string;
  is_published: boolean;
  has_preview: boolean;
  created_at: string;
  updated_at: string;
};

export type SketchStyleWritePayload = {
  title: string;
  description: string;
  positive_prompt: string;
  negative_prompt: string;
  default_strength: number;
  aspect_ratio: string;
  sort_order: number;
  is_published: boolean;
};

export type SketchGenerateBody = {
  style_id: string;
  source_upload_id: string;
  prompt?: string;
  aspect_ratio?: string;
  strength?: number;
  output?: "image" | "video";
  duration?: number;
};

export function sketchStylePreviewUrl(id: string, admin = false): string {
  const base = admin ? "/admin/sketch/styles" : "/sketch/styles";
  return `${base}/${encodeURIComponent(id)}/preview`;
}

export async function fetchSketchStyles() {
  return apiFetch<{ items: SketchStyle[] }>("/sketch/styles");
}

export async function generateFromSketch(body: SketchGenerateBody) {
  return apiFetch<{ job: GenerationJob | VideoGenerationJob; media_kind: string }>(
    "/sketch/generate",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function fetchAdminSketchStyles() {
  return apiFetch<{ items: SketchStyleAdmin[] }>("/admin/sketch/styles");
}

export async function createAdminSketchStyle(payload: SketchStyleWritePayload) {
  return apiFetch<{ item: SketchStyleAdmin }>("/admin/sketch/styles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminSketchStyle(id: string, payload: SketchStyleWritePayload) {
  return apiFetch<{ item: SketchStyleAdmin }>(`/admin/sketch/styles/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminSketchStyle(id: string) {
  return apiFetch<{ ok: boolean }>(`/admin/sketch/styles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function uploadAdminSketchStylePreview(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return postGenerationMultipart(`/admin/sketch/styles/${encodeURIComponent(id)}/preview`, formData);
}
