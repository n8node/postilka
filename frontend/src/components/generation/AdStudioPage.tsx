"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Sparkles, UserRound } from "lucide-react";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ProtectedMediaVideo } from "@/components/media/ProtectedMediaVideo";
import { GenerationProgressPanel } from "@/components/generation/GenerationProgressPanel";
import { MediaSourcePickerModal } from "@/components/generation/MediaSourcePickerModal";
import { ApiError } from "@/lib/api";
import {
  adStudioCategoryLabel,
  adStudioModeLabel,
  adStudioModeNeedsProduct,
  adStudioModeUsesTemplateInput,
  fetchAdStudioTemplates,
  generateFromAdStudioTemplate,
  resolveAdStudioMode,
  catalogHref,
  parseCatalogMedia,
  parseStudioSection,
  visibleCategoriesForCatalog,
  type AdStudioCatalog,
  type AdStudioTemplate,
  type CatalogMediaFilter,
} from "@/lib/ad-studio";
import {
  fetchGenerationPricing,
  generationCostForMode,
  generationWalletRubForMode,
  uploadGenerationMedia,
  uploadGenerationMediaFromWorkspace,
  type GenerationPricing,
} from "@/lib/generation-api";
import type { WorkspaceFile } from "@/lib/files-api";
import {
  hasMediaCredits,
  useGenerationCreditsStore,
  useMediaCreditsRemaining,
} from "@/lib/generation-credits-store";
import { useGenerationJobStore } from "@/lib/generation-job-store";
import type { GenerationUpload } from "@/lib/generation-data";
import {
  fetchVideoGenerationPricing,
  type VideoGenerationJob,
  type VideoGenerationPricing,
} from "@/lib/video-generation-api";
import { useVideoGenerationJobStore } from "@/lib/video-generation-job-store";
import { cn } from "@/lib/utils";

type FilterId = string;

function aspectClass(ratio: string): string {
  switch (ratio) {
    case "9:16":
      return "aspect-[9/16]";
    case "4:5":
      return "aspect-[4/5]";
    case "16:9":
      return "aspect-video";
    default:
      return "aspect-square";
  }
}

function previewBoxSize(ratio: string, height: number): { width: number; height: number } {
  const h = Math.max(0, height);
  switch (ratio) {
    case "9:16":
      return { width: (h * 9) / 16, height: h };
    case "4:5":
      return { width: (h * 4) / 5, height: h };
    case "16:9":
      return { width: Math.min((h * 16) / 9, 512), height: h };
    default:
      return { width: h, height: h };
  }
}

function useMasonryColumnCount(): number {
  const [count, setCount] = useState(2);

  useEffect(() => {
    const mq2xl = window.matchMedia("(min-width: 1536px)");
    const mqXl = window.matchMedia("(min-width: 1280px)");
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const mqSm = window.matchMedia("(min-width: 640px)");
    const update = () => {
      if (mq2xl.matches) setCount(6);
      else if (mqXl.matches) setCount(5);
      else if (mqLg.matches) setCount(4);
      else if (mqSm.matches) setCount(3);
      else setCount(2);
    };
    update();
    mq2xl.addEventListener("change", update);
    mqXl.addEventListener("change", update);
    mqLg.addEventListener("change", update);
    mqSm.addEventListener("change", update);
    return () => {
      mq2xl.removeEventListener("change", update);
      mqXl.removeEventListener("change", update);
      mqLg.removeEventListener("change", update);
      mqSm.removeEventListener("change", update);
    };
  }, []);

  return count;
}

function distributeMasonryColumns<T>(items: T[], columnCount: number): T[][] {
  const columns = Array.from({ length: columnCount }, () => [] as T[]);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

function TemplateMasonryGrid({
  items,
  selectedId,
  onSelect,
}: {
  items: AdStudioTemplate[];
  selectedId?: string;
  onSelect: (item: AdStudioTemplate) => void;
}) {
  const columnCount = useMasonryColumnCount();
  const columns = useMemo(
    () => distributeMasonryColumns(items, columnCount),
    [items, columnCount],
  );

  return (
    <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2.5 lg:gap-3">
          {column.map((item) => (
            <TemplateCard
              key={item.id}
              item={item}
              active={selectedId === item.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function UploadSlot({
  label,
  hint,
  photo,
  disabled,
  onOpen,
  onClear,
}: {
  label: string;
  hint: string;
  photo: GenerationUpload | null;
  disabled?: boolean;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-text">{label}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className={cn(
          "relative flex min-h-[132px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed px-3 py-4 text-center transition-colors",
          photo
            ? "border-border bg-zinc-50"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {photo?.workspaceFileId ? (
          <>
            <FileThumbnail
              fileId={photo.workspaceFileId}
              name={photo.fileName ?? ""}
              mimeType={photo.mimeType ?? "image/jpeg"}
              size="lg"
              className="absolute inset-0 h-full w-full rounded-none border-0"
            />
            <span className="relative z-10 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white">
              Заменить
            </span>
          </>
        ) : photo?.previewUrl ? (
          <>
            <ProtectedMediaImage
              url={photo.previewUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="relative z-10 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white">
              Заменить
            </span>
          </>
        ) : (
          <>
            <ImagePlus size={22} className="mb-2 text-zinc-400" />
            <span className="text-[13px] font-medium text-text">{hint}</span>
            <span className="mt-1 text-[12px] text-muted">
              С компьютера или с диска проекта
            </span>
          </>
        )}
      </button>
      {photo ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-[12px] text-muted hover:text-text"
        >
          Убрать
        </button>
      ) : null}
    </div>
  );
}

function TemplateCard({
  item,
  active,
  onSelect,
}: {
  item: AdStudioTemplate;
  active?: boolean;
  onSelect: (item: AdStudioTemplate) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "group w-full overflow-hidden rounded-xl border bg-surface text-left shadow-sm transition-colors",
        active ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-zinc-300",
      )}
    >
      <div className={cn("relative bg-zinc-100", aspectClass(item.aspect_ratio))}>
        {item.preview_kind === "video" && item.preview_source_url ? (
          <ProtectedMediaVideo
            url={item.preview_source_url}
            poster={item.preview_url}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            controls={false}
            lazy
          />
        ) : item.preview_url ? (
          <ProtectedMediaImage
            url={item.preview_url}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-[13px] text-muted">
            {item.title}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
          {adStudioCategoryLabel(item.category)}
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {item.media_kind === "video" ? "Видео" : "Фото"}
        </span>
      </div>
    </button>
  );
}

export function AdStudioPage({ catalog = "studio" }: { catalog?: AdStudioCatalog }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = searchParams.get("template");
  const filter = parseStudioSection(searchParams.get("section")) as FilterId;
  const mediaFilter = parseCatalogMedia(searchParams.get("media"));
  const [items, setItems] = useState<AdStudioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<AdStudioTemplate | null>(null);
  const [product, setProduct] = useState<GenerationUpload | null>(null);
  const [avatar, setAvatar] = useState<GenerationUpload | null>(null);
  const [edit, setEdit] = useState("");
  const [uploading, setUploading] = useState<"product" | "avatar" | null>(null);
  const [pickerSlot, setPickerSlot] = useState<"product" | "avatar" | null>(null);
  const pickerSlotRef = useRef<"product" | "avatar" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState(0);

  const openPicker = (slot: "product" | "avatar") => {
    pickerSlotRef.current = slot;
    setPickerSlot(slot);
  };

  const closePicker = () => {
    setPickerSlot(null);
  };
  const [imagePricing, setImagePricing] = useState<GenerationPricing | null>(null);
  const [videoPricing, setVideoPricing] = useState<VideoGenerationPricing | null>(null);
  const creditsRemaining = useMediaCreditsRemaining();
  const setCreditsRemaining = useGenerationCreditsStore((s) => s.setCreditsRemaining);

  const imageGenerating = useGenerationJobStore((s) => s.running);
  const imageJob = useGenerationJobStore((s) => s.job);
  const imageError = useGenerationJobStore((s) => s.error);
  const imageResultUrl = useGenerationJobStore((s) => s.resultUrl);
  const imageResultId = useGenerationJobStore((s) => s.resultGenerationId);
  const beginImageJob = useGenerationJobStore((s) => s.beginJob);
  const clearImageError = useGenerationJobStore((s) => s.clearError);
  const clearImageResult = useGenerationJobStore((s) => s.clearResult);

  const videoGenerating = useVideoGenerationJobStore((s) => s.running);
  const videoJob = useVideoGenerationJobStore((s) => s.job);
  const videoError = useVideoGenerationJobStore((s) => s.error);
  const videoResultUrl = useVideoGenerationJobStore((s) => s.resultUrl);
  const videoResultId = useVideoGenerationJobStore((s) => s.resultGenerationId);
  const beginVideoJob = useVideoGenerationJobStore((s) => s.beginJob);
  const clearVideoError = useVideoGenerationJobStore((s) => s.clearError);
  const clearVideoResult = useVideoGenerationJobStore((s) => s.clearResult);

  const selectedMode = selected ? resolveAdStudioMode(selected) : null;
  const isVideo = selectedMode
    ? selectedMode === "text-to-video" ||
      selectedMode === "image-to-video" ||
      selectedMode === "reference-to-video"
    : false;
  const generating = isVideo ? videoGenerating : imageGenerating;
  const generateError = isVideo ? videoError : imageError;
  const resultUrl = isVideo ? videoResultUrl : imageResultUrl;
  const resultId = isVideo ? videoResultId : imageResultId;
  const activeJob = isVideo ? videoJob : imageJob;

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetchAdStudioTemplates(filter === "all" ? undefined : filter, catalog);
      setItems(res.items ?? []);
      setHiddenCategories(res.hidden_categories ?? []);
      const visible = visibleCategoriesForCatalog(catalog, res.hidden_categories);
      const known = visibleCategoriesForCatalog(catalog, []).some((item) => item.id === filter);
      if (known && filter !== "all" && !visible.some((item) => item.id === filter)) {
        router.replace(catalogHref(catalog, "all", templateParam, mediaFilter), { scroll: false });
      }
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : "Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  }, [catalog, filter, mediaFilter, router, templateParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchGenerationPricing()
      .then((res) => {
        setImagePricing(res.pricing);
        if (res.pricing.credits_remaining !== undefined) {
          setCreditsRemaining(res.pricing.credits_remaining ?? null);
        }
      })
      .catch(() => undefined);
    void fetchVideoGenerationPricing()
      .then((res) => setVideoPricing(res.pricing))
      .catch(() => undefined);
  }, [setCreditsRemaining]);

  useEffect(() => {
    if (!selected) {
      setFormHeight(0);
      return;
    }
    const el = formRef.current;
    if (!el) return;

    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => {
      if (!mq.matches) {
        setFormHeight(0);
        return;
      }
      setFormHeight(Math.round(el.getBoundingClientRect().height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    mq.addEventListener("change", update);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, [selected]);

  const selectedIdRef = useRef<string | undefined>(undefined);
  selectedIdRef.current = selected?.id;
  const prevTemplateParamRef = useRef<string | null | undefined>(undefined);

  const applyTemplate = useCallback(
    (item: AdStudioTemplate) => {
      selectedIdRef.current = item.id;
      setSelected(item);
      setEdit("");
      clearImageError();
      clearVideoError();
      clearImageResult();
      clearVideoResult();
    },
    [clearImageError, clearImageResult, clearVideoError, clearVideoResult],
  );

  const selectTemplate = useCallback(
    (item: AdStudioTemplate) => {
      applyTemplate(item);
      if (templateParam !== item.id) {
        router.replace(catalogHref(catalog, filter, item.id, mediaFilter), { scroll: false });
      }
    },
    [applyTemplate, catalog, filter, mediaFilter, router, templateParam],
  );

  // Apply the query only when `?template=` actually changes. Do not depend on
  // `selected`: `router.replace` is async, and a stale param would snap back.
  useEffect(() => {
    if (loading) return;
    const prevParam = prevTemplateParamRef.current;
    if (prevParam === templateParam && prevParam !== undefined) return;

    if (!templateParam) {
      prevTemplateParamRef.current = templateParam;
      if (prevParam) {
        selectedIdRef.current = undefined;
        setSelected(null);
      }
      return;
    }
    if (items.length === 0) return;
    prevTemplateParamRef.current = templateParam;
    const match = items.find((item) => item.id === templateParam);
    if (!match || selectedIdRef.current === match.id) return;
    applyTemplate(match);
  }, [templateParam, loading, items, applyTemplate]);

  const applyUpload = (slot: "product" | "avatar", next: GenerationUpload) => {
    if (slot === "product") setProduct(next);
    else setAvatar(next);
  };

  const failUpload = (msg: string) => {
    if (isVideo) {
      useVideoGenerationJobStore.getState().failJob(msg);
    } else {
      useGenerationJobStore.getState().failJob(msg);
    }
  };

  const pickUpload = async (slot: "product" | "avatar", file: File) => {
    setUploading(slot);
    try {
      const uploaded = await uploadGenerationMedia(file);
      applyUpload(slot, {
        uploadId: uploaded.id,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      failUpload(err instanceof ApiError ? err.message : "Не удалось загрузить фото");
    } finally {
      setUploading(null);
    }
  };

  const pickWorkspace = async (slot: "product" | "avatar", file: WorkspaceFile) => {
    if (!file.mime_type.startsWith("image/")) {
      failUpload("Нужен файл изображения");
      return;
    }
    setUploading(slot);
    try {
      const uploaded = await uploadGenerationMediaFromWorkspace(file.id);
      applyUpload(slot, {
        uploadId: uploaded.id,
        previewUrl: "",
        workspaceFileId: file.id,
        fileName: file.name,
        mimeType: file.mime_type,
      });
    } catch (err) {
      failUpload(err instanceof ApiError ? err.message : "Не удалось взять файл с диска");
    } finally {
      setUploading(null);
    }
  };

  const creditCost = useMemo(() => {
    if (!selected) return 0;
    if (isVideo) {
      if (!videoPricing) return 0;
      const perSec =
        selectedMode === "text-to-video"
          ? videoPricing.credits_per_second_text_to_video
          : selectedMode === "reference-to-video"
            ? videoPricing.credits_per_second_reference_to_video
            : videoPricing.credits_per_second_image_to_video;
      return Math.max(1, (perSec || 1) * (selected.duration || 5));
    }
    if (!imagePricing || !selectedMode) return 0;
    if (selectedMode === "combine") return generationCostForMode(imagePricing, "combine");
    if (selectedMode === "image-to-image") return generationCostForMode(imagePricing, "image-to-image");
    return generationCostForMode(imagePricing, "text-to-image");
  }, [selected, selectedMode, isVideo, imagePricing, videoPricing]);

  const walletRub = useMemo(() => {
    if (!selected || !selectedMode || isVideo || !imagePricing) return 0;
    if (selectedMode === "combine") return generationWalletRubForMode(imagePricing, "combine");
    if (selectedMode === "image-to-image") {
      return generationWalletRubForMode(imagePricing, "image-to-image");
    }
    return generationWalletRubForMode(imagePricing, "text-to-image");
  }, [selected, selectedMode, isVideo, imagePricing]);

  const needsProduct = Boolean(
    selected && (selected.requires_product || (selectedMode && adStudioModeNeedsProduct(selectedMode))),
  );
  const needsTemplateInput = Boolean(selectedMode && adStudioModeUsesTemplateInput(selectedMode));
  const canGenerate = Boolean(
    selected &&
      selectedMode &&
      (!needsTemplateInput || selected.preview_url) &&
      !generating &&
      !uploading &&
      (!needsProduct || product) &&
      (!selected.requires_avatar || avatar) &&
      hasMediaCredits(creditsRemaining),
  );

  const recreate = async () => {
    if (!selected || !canGenerate) return;
    if (isVideo) {
      if (useVideoGenerationJobStore.getState().running) return;
      useVideoGenerationJobStore.getState().markStarting();
    } else {
      if (useGenerationJobStore.getState().running) return;
      useGenerationJobStore.getState().markStarting();
    }
    const startedAt = Date.now();
    try {
      const { job, media_kind } = await generateFromAdStudioTemplate(selected.id, {
        product_upload_id: product?.uploadId,
        avatar_upload_id: avatar?.uploadId,
        edit: edit.trim(),
      });
      if (media_kind === "video") {
        if (!useVideoGenerationJobStore.getState().running) return;
        beginVideoJob(job as VideoGenerationJob, startedAt);
      } else {
        if (!useGenerationJobStore.getState().running) return;
        beginImageJob(job, startedAt);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Не удалось запустить генерацию. Кредиты не были списаны.";
      if (selected.media_kind === "video") {
        useVideoGenerationJobStore.getState().failJob(msg);
      } else {
        useGenerationJobStore.getState().failJob(msg);
      }
    }
  };

  const makePost = () => {
    if (!resultId) return;
    router.push(`/posts/new?generation=${encodeURIComponent(resultId)}`);
  };

  const mediaFiltered = items.filter((item) => {
    if (mediaFilter === "all") return true;
    return item.media_kind === mediaFilter;
  });
  const explore = selected
    ? mediaFiltered.filter((item) => item.id !== selected.id)
    : mediaFiltered;
  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: "Все" },
    ...visibleCategoriesForCatalog(catalog, hiddenCategories),
  ];
  const mediaFilters: { id: CatalogMediaFilter; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "image", label: "Фото" },
    { id: "video", label: "Видео" },
  ];
  const isTrends = catalog === "trends";

  return (
    <div className="flex flex-col gap-6">
      {selected ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className={cn(
              "relative mx-auto shrink-0 overflow-hidden rounded-2xl border border-border bg-zinc-100 shadow-sm sm:mx-0",
              formHeight <= 0 && cn("h-60 w-auto", aspectClass(selected.aspect_ratio)),
            )}
            style={
              formHeight > 0 ? previewBoxSize(selected.aspect_ratio, formHeight) : undefined
            }
          >
            {generating || (!resultUrl && activeJob) ? (
              <div className="absolute inset-0">
                <GenerationProgressPanel
                  progress={activeJob?.progress ?? 0}
                  status={activeJob?.status ?? "preparing"}
                  active={generating}
                  variant={isVideo ? "video" : "image"}
                />
              </div>
            ) : resultUrl ? (
              isVideo ? (
                <ProtectedMediaVideo
                  url={resultUrl}
                  wrapperClassName="absolute inset-0"
                  className="h-full w-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                />
              ) : (
                <ProtectedMediaImage
                  url={resultUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )
            ) : selected.preview_kind === "video" && selected.preview_source_url ? (
              <ProtectedMediaVideo
                url={selected.preview_source_url}
                poster={selected.preview_url}
                wrapperClassName="absolute inset-0"
                className="h-full w-full object-cover"
                controls
                autoPlay
                muted
                loop
              />
            ) : selected.preview_url ? (
              <ProtectedMediaImage
                url={selected.preview_url}
                alt={selected.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-[12px] text-muted">
                {selected.title}
              </div>
            )}
          </div>

          <div
            ref={formRef}
            className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                Пересоздать шаблон
              </p>
              <h2 className="mt-1 text-base font-semibold text-text">{selected.title}</h2>
              <p className="mt-1 text-[12px] text-muted">
                {adStudioCategoryLabel(selected.category)} · {adStudioModeLabel(selectedMode ?? "")} ·{" "}
                {selected.aspect_ratio}
                {isVideo ? ` · ${selected.duration} с` : ""}
              </p>
              {needsTemplateInput && !selected.preview_url ? (
                <p className="mt-2 text-[12px] text-red-700">
                  Для этого режима нужно превью сцены. Загрузите его в админке.
                </p>
              ) : needsTemplateInput ? (
                <p className="mt-2 text-[12px] text-muted">
                  {selected.preview_kind === "video"
                    ? "В модель уйдут видео шаблона и ваше фото товара."
                    : "В модель уйдут превью шаблона и ваше фото товара."}
                </p>
              ) : needsProduct ? (
                <p className="mt-2 text-[12px] text-muted">
                  В модель уйдёт ваше фото товара. Превью шаблона только задаёт стиль в промпте.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted">
                  В модель уйдёт только текст шаблона и ваша правка.
                </p>
              )}
            </div>

            {needsProduct ? (
              <UploadSlot
                label="Товар"
                hint="Загрузить товар"
                photo={product}
                disabled={generating || uploading === "product"}
                onOpen={() => openPicker("product")}
                onClear={() => setProduct(null)}
              />
            ) : null}

            {selected.requires_avatar ? (
              <UploadSlot
                label="Модель"
                hint="Загрузить модель"
                photo={avatar}
                disabled={generating || uploading === "avatar"}
                onOpen={() => openPicker("avatar")}
                onClear={() => setAvatar(null)}
              />
            ) : null}

            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-text">
                <UserRound size={13} className="text-muted" />
                Что изменить
              </span>
              <textarea
                value={edit}
                onChange={(e) => setEdit(e.target.value)}
                disabled={generating}
                rows={4}
                placeholder="Необязательно: уберите текст, смените фон, добавьте слоган…"
                className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] outline-none focus:border-zinc-400"
              />
            </label>

            {generateError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">
                {generateError}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void recreate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={16} />
              {generating ? "Создаём…" : "Создать"}
              {creditCost > 0 ? (
                <span className="text-[12px] font-normal opacity-80">
                  · {creditCost} кред.
                  {walletRub > 0 ? ` / ${walletRub} ₽` : ""}
                </span>
              ) : null}
            </button>

            {resultId ? (
              <button
                type="button"
                onClick={makePost}
                className="rounded-xl border border-border px-4 py-2.5 text-[13px] font-medium text-text hover:bg-zinc-50"
              >
                В пост
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                selectedIdRef.current = undefined;
                setSelected(null);
                if (templateParam) {
                  router.replace(catalogHref(catalog, filter, null, mediaFilter), { scroll: false });
                }
              }}
              className="text-[12px] text-muted hover:text-text"
            >
              Назад к библиотеке
            </button>
          </div>
        </div>
      ) : null}

      <section className="-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
        <div className="px-3 sm:px-4 lg:px-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
                {selected ? "Ещё шаблоны" : "Библиотека"}
              </p>
              <h2 className="mt-1 text-base font-semibold text-text">
                {selected
                  ? "Попробуйте другой стиль"
                  : isTrends
                    ? "Трендовые форматы"
                    : "Готовые рекламные решения"}
              </h2>
            </div>
            {isTrends ? (
              <div className="flex flex-wrap gap-1.5">
                {mediaFilters.map((item) => {
                  const active = mediaFilter === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={catalogHref(catalog, filter, templateParam, item.id)}
                      scroll={false}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                        active
                          ? "bg-accent text-white"
                          : "bg-zinc-100 text-muted hover:bg-zinc-200 hover:text-text",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {filters.map((item) => {
              const active = filter === item.id;
              return (
                <Link
                  key={item.id}
                  href={catalogHref(catalog, item.id, templateParam, mediaFilter)}
                  scroll={false}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-text text-white"
                      : "bg-zinc-100 text-muted hover:bg-zinc-200 hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {listError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{listError}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted">Загрузка шаблонов…</p>
          ) : explore.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-text">Пока нет шаблонов</p>
              <p className="mt-1 text-[13px] text-muted">
                Администратор добавит их в настройках платформы —{" "}
                {isTrends ? "«AI — Тренды»" : "«AI — Студия рекламы»"}.
              </p>
            </div>
          ) : (
            <TemplateMasonryGrid
              items={explore}
              selectedId={selected?.id}
              onSelect={selectTemplate}
            />
          )}
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const slot = pickerSlotRef.current;
          e.target.value = "";
          if (file && slot) void pickUpload(slot, file);
          closePicker();
        }}
      />
      <MediaSourcePickerModal
        open={pickerSlot !== null}
        title={pickerSlot === "avatar" ? "Фото модели" : "Фото товара"}
        subtitle="С компьютера или с диска проекта"
        mediaKind="image"
        onClose={closePicker}
        onPickComputer={() => fileInputRef.current?.click()}
        onPickDiskFile={(file) => {
          const slot = pickerSlotRef.current;
          closePicker();
          if (slot) void pickWorkspace(slot, file);
        }}
      />
    </div>
  );
}
