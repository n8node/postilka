import { apiFetch } from "@/lib/api";

export type CompanyProfile = {
  id: string;
  workspace_id: string;
  name: string;
  company_name: string;
  industry: string;
  description: string;
  website: string;
  target_audience: string;
  tone: string;
  text_instructions: string;
  banned_words: string;
  brand_color: string;
  visual_style: string;
  visual_avoid: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyProfileInput = Omit<CompanyProfile, "id" | "workspace_id" | "created_at" | "updated_at" | "is_default"> & { is_default?: boolean };

export function fetchCompanyProfiles() {
  return apiFetch<{ items: CompanyProfile[] }>("/company-profiles");
}

export function createCompanyProfile(body: CompanyProfileInput) {
  return apiFetch<{ item: CompanyProfile }>("/company-profiles", { method: "POST", body: JSON.stringify(body) });
}

export function updateCompanyProfile(id: string, body: CompanyProfileInput) {
  return apiFetch<{ item: CompanyProfile }>(`/company-profiles/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteCompanyProfile(id: string) {
  return apiFetch<{ deleted: boolean }>(`/company-profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
}