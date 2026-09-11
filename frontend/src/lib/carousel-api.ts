import { apiFetch } from "@/lib/api";

export type CarouselFile = {
  id: string;
  name: string;
  mime_type: string;
};

export type CarouselSlide = {
  role: string;
  headline: string;
  body: string;
  file: CarouselFile;
  background_file?: CarouselFile | null;
  generation_job_id?: string;
  generation_credit_cost?: number;
};

export type Carousel = {
  id: string;
  workspace_id: string;
  title: string;
  topic: string;
  caption: string;
  references: CarouselFile[];
  slides: CarouselSlide[];
  generation_credits: number;
  text_credits: number;
  created_at: string;
  updated_at: string;
};

export type SaveCarouselInput = {
  title: string;
  topic: string;
  caption: string;
  references: CarouselFile[];
  slides: CarouselSlide[];
  generation_credits: number;
  text_credits: number;
};

export function fetchCarousels() {
  return apiFetch<{ items: Carousel[] }>("/carousels");
}

export function createCarousel(input: SaveCarouselInput) {
  return apiFetch<Carousel>("/carousels", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCarousel(id: string, input: SaveCarouselInput) {
  return apiFetch<Carousel>(`/carousels/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteCarousel(id: string) {
  return apiFetch<{ ok: boolean }>(`/carousels/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
