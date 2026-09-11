"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Check,
  FileImage,
  GalleryHorizontalEnd,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import {
  composePostText,
  fetchGenerationJob,
  fetchGenerationPricing,
  startGeneration,
  uploadGenerationMediaFromWorkspace,
  type GenerationJob,
  type GenerationPricing,
} from "@/lib/generation-api";
import {
  createCarousel,
  deleteCarousel,
  fetchCarousels,
  updateCarousel,
  type Carousel,
  type CarouselSlide as SavedCarouselSlide,
} from "@/lib/carousel-api";
import { uploadFile, type WorkspaceFile } from "@/lib/files-api";
import { createPost } from "@/lib/posts-api";
import { mediaUrl } from "@/lib/media-display";
import { cn } from "@/lib/utils";

const MIN_SLIDES = 3;
const MAX_SLIDES = 6;
const MAX_REFERENCES = 6;

type CarouselSlide = {
  id: string;
  role: string;
  headline: string;
  body: string;
  file?: WorkspaceFile;
  backgroundFile?: WorkspaceFile;
  styleAccent?: string;
  textAlignment?: "left" | "center";
  generationJobId?: string;
  generationStatus?: "idle" | "queued" | "succeeded" | "failed";
  generationError?: string;
  generationImageUrl?: string;
  generationCreditCost?: number;
};

type StoryboardResponse = {
  slides?: Array<Partial<CarouselSlide>>;
  caption?: string;
};

type CarouselStyleProfile = {
  name: string;
  accent: string;
  alignment: "left" | "center";
  visualRules: string;
};

const STYLE_STORAGE_KEY = "postilka.carousel.style-profile";
const DEFAULT_STYLE: CarouselStyleProfile = {
  name: "Мой стиль",
  accent: "#9c4938",
  alignment: "left",
  visualRules: "Много воздуха, крупный заголовок, один смысл на слайд.",
};

const INITIAL_SLIDES: CarouselSlide[] = [
  {
    id: "slide-1",
    role: "Хук",
    headline: "Начните с идеи карусели",
    body: "Одна сильная мысль на первом слайде удерживает внимание.",
  },
  {
    id: "slide-2",
    role: "Проблема",
    headline: "Покажите знакомую проблему",
    body: "Объясните, почему читателю важно листать дальше.",
  },
  {
    id: "slide-3",
    role: "CTA",
    headline: "Завершите понятным действием",
    body: "Скажите, что сделать после последнего слайда.",
  },
];

function createSlide(index: number): CarouselSlide {
  return {
    id: `slide-${Date.now()}-${index}`,
    role: "Новый слайд",
    headline: "Новая мысль",
    body: "Добавьте содержание этого слайда.",
  };
}

function parseStoryboard(text: string): StoryboardResponse | null {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(normalized) as StoryboardResponse;
    return Array.isArray(parsed.slides) ? parsed : null;
  } catch {
    return null;
  }
}

function toWorkspaceFile(file: SavedCarouselSlide["file"]): WorkspaceFile {
  return {
    id: file.id,
    name: file.name,
    mime_type: file.mime_type,
    workspace_id: "",
    folder_id: null,
    size: 0,
    created_at: "",
    updated_at: "",
  };
}

function toSavedSlide(slide: CarouselSlide): SavedCarouselSlide {
  const file = slide.file ?? slide.backgroundFile;
  if (!file) {
    throw new Error("Каждый слайд должен содержать готовое изображение или фон.");
  }
  return {
    role: slide.role,
    headline: slide.headline,
    body: slide.body,
    file: {
      id: file.id,
      name: file.name,
      mime_type: file.mime_type,
    },
    background_file: slide.backgroundFile
      ? {
          id: slide.backgroundFile.id,
          name: slide.backgroundFile.name,
          mime_type: slide.backgroundFile.mime_type,
        }
      : null,
    generation_job_id: slide.generationJobId,
    generation_credit_cost: slide.generationCreditCost,
  };
}

function restoreSlide(slide: SavedCarouselSlide, index: number): CarouselSlide {
  return {
    id: `slide-${Date.now()}-${index}`,
    role: slide.role,
    headline: slide.headline,
    body: slide.body,
    file: toWorkspaceFile(slide.file),
    backgroundFile: slide.background_file
      ? toWorkspaceFile(slide.background_file)
      : undefined,
    generationJobId: slide.generation_job_id,
    generationStatus: slide.generation_job_id ? "succeeded" : "idle",
    generationCreditCost: slide.generation_credit_cost,
  };
}

function toWorkspaceReference(file: SavedCarouselSlide["file"]): WorkspaceFile {
  return toWorkspaceFile(file);
}

export function CarouselPage(): ReactElement {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<CarouselSlide[]>(INITIAL_SLIDES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPurpose, setPickerPurpose] = useState<
    "reference" | "background"
  >("reference");
  const [referenceFiles, setReferenceFiles] = useState<
    Array<WorkspaceFile | null>
  >([]);
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [referenceSlot, setReferenceSlot] = useState<number | null>(null);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [busy, setBusy] = useState<
    | "storyboard"
    | "upload"
    | "generate"
    | "regenerate"
    | "draft"
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [style, setStyle] = useState<CarouselStyleProfile>(DEFAULT_STYLE);
  const [pricing, setPricing] = useState<GenerationPricing | null>(null);
  const [history, setHistory] = useState<Carousel[]>([]);
  const [textTokenCost, setTextTokenCost] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STYLE_STORAGE_KEY);
      if (stored)
        setStyle({
          ...DEFAULT_STYLE,
          ...(JSON.parse(stored) as Partial<CarouselStyleProfile>),
        });
    } catch {
      // Ignore invalid local style data and keep the defaults.
    }
  }, []);

  useEffect(() => {
    void fetchCarousels()
      .then(({ items }) => setHistory(items))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    void fetchGenerationPricing()
      .then(({ pricing: nextPricing }) => setPricing(nextPricing))
      .catch(() => setPricing(null));
  }, []);

  function updateStyle(patch: Partial<CarouselStyleProfile>): void {
    setStyle((current) => {
      const next = { ...current, ...patch };
      window.localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const selectedIndex = slides.findIndex((slide) => slide.id === selectedId);
  const selectedSlide = selectedIndex >= 0 ? slides[selectedIndex] : null;
  const previewSlide = slides[previewIndex] ?? slides[0];
  const loadedCarouselId = useRef<string | null>(null);

  function slideFile(slide: CarouselSlide): WorkspaceFile | undefined {
    return slide.file ?? slide.backgroundFile;
  }

  function hasCompleteSlides(): boolean {
    return (
      slides.length >= MIN_SLIDES &&
      slides.length <= MAX_SLIDES &&
      slides.every((slide) => Boolean(slideFile(slide)))
    );
  }

  async function saveCarouselHistory(): Promise<void> {
    if (!title.trim()) {
      setError("Укажите название карусели.");
      return;
    }
    if (!hasCompleteSlides()) {
      setError("Добавьте готовое изображение или свой фон для каждого слайда.");
      return;
    }
    setBusy("draft");
    setError(null);
    try {
      const input = {
        title: title.trim(),
        topic: topic.trim(),
        caption: "",
        references: referenceFiles.filter(
          (file): file is WorkspaceFile => file !== null,
        ).map((file) => ({
          id: file.id,
          name: file.name,
          mime_type: file.mime_type,
        })),
        slides: slides.map(toSavedSlide),
        generation_credits: slides.reduce(
          (total, slide) => total + (slide.generationCreditCost ?? 0),
          0,
        ),
        text_credits: textTokenCost,
      };
      const saved = loadedCarouselId.current
        ? await updateCarousel(loadedCarouselId.current, input)
        : await createCarousel(input);
      loadedCarouselId.current = saved.id;
      setHistory((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setNotice("Карусель сохранена в истории.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить карусель");
    } finally {
      setBusy(null);
    }
  }

  async function createPostFromCarousel(): Promise<void> {
    const media = slides
      .map((slide) => ({ slide, file: slideFile(slide) }))
      .filter((item): item is { slide: CarouselSlide; file: WorkspaceFile } => Boolean(item.file));
    if (!hasCompleteSlides()) {
      setError("Добавьте готовое изображение или свой фон для каждого слайда.");
      return;
    }
    setBusy("draft");
    setError(null);
    try {
      const post = await createPost({
        content: { format: "message", text: "", parse_mode: "HTML", entities: [], buttons: [] },
        settings: { telegram_media_layout: "separate", telegram_media_order: "media_first" },
        targets: [],
        media: media.map(({ slide, file }) => ({ file_id: file.id, settings: { alt_text: slide.headline } })),
      });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать пост");
    } finally {
      setBusy(null);
    }
  }

  function restoreCarousel(carousel: Carousel): void {
    const restoredSlides = carousel.slides.map(restoreSlide);
    setTitle(carousel.title);
    setTopic(carousel.topic);
    setReferenceFiles(carousel.references.map(toWorkspaceReference));
    setSlides(restoredSlides);
    setSelectedId(restoredSlides[0]?.id ?? null);
    setPreviewIndex(0);
    setTextTokenCost(carousel.text_credits);
    loadedCarouselId.current = carousel.id;
    setNotice(`Карусель «${carousel.title}» загружена в редактор.`);
  }

  function createNewCarousel(): void {
    setTitle("");
    setTopic("");
    setReferenceFiles([]);
    setSlides(INITIAL_SLIDES.map((slide) => ({ ...slide })));
    setSelectedId(null);
    setPreviewIndex(0);
    setTextTokenCost(0);
    setRegenerateOpen(false);
    setRegeneratePrompt("");
    setError(null);
    setNotice("Новая карусель создана.");
    loadedCarouselId.current = null;
  }

  async function deleteSavedCarousel(carousel: Carousel): Promise<void> {
    try {
      await deleteCarousel(carousel.id);
      setHistory((current) => current.filter((item) => item.id !== carousel.id));
      if (loadedCarouselId.current === carousel.id) {
        loadedCarouselId.current = null;
      }
      setNotice("Карусель удалена из истории.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить карусель");
    }
  }

  async function createPostFromSavedCarousel(carousel: Carousel): Promise<void> {
    restoreCarousel(carousel);
    setBusy("draft");
    setError(null);
    try {
      const post = await createPost({
        content: {
          format: "message",
          text: "",
          parse_mode: "HTML",
          entities: [],
          buttons: [],
        },
        settings: { telegram_media_layout: "separate", telegram_media_order: "media_first" },
        targets: [],
        media: carousel.slides.map((slide) => ({
          file_id: slide.file.id,
          settings: { alt_text: slide.headline },
        })),
      });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать пост");
    } finally {
      setBusy(null);
    }
  }

  function updateSlide(id: string, patch: Partial<CarouselSlide>): void {
    setSlides((current) =>
      current.map((slide) =>
        slide.id === id ? { ...slide, ...patch } : slide,
      ),
    );
  }

  function selectSlide(id: string, index: number): void {
    setSelectedId(id);
    setPreviewIndex(index);
  }

  function changePreview(direction: -1 | 1): void {
    if (slides.length === 0) return;
    setPreviewIndex((current) =>
      (current + direction + slides.length) % slides.length,
    );
  }

  function moveSlide(direction: -1 | 1): void {
    if (selectedIndex < 0) return;
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    const nextSlides = [...slides];
    const [slide] = nextSlides.splice(selectedIndex, 1);
    nextSlides.splice(nextIndex, 0, slide);
    setSlides(nextSlides);
  }

  function moveSlideToIndex(slideId: string, targetIndex: number): void {
    const sourceIndex = slides.findIndex((slide) => slide.id === slideId);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const nextSlides = [...slides];
    const [draggedSlide] = nextSlides.splice(sourceIndex, 1);
    nextSlides.splice(targetIndex, 0, draggedSlide);
    setSlides(nextSlides);
  }

  function clearBackground(): void {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, { backgroundFile: undefined });
    setNotice(`Свой фон у слайда ${selectedIndex + 1} удален.`);
  }

  function addSlide(): void {
    if (slides.length >= MAX_SLIDES) return;
    const slide = createSlide(slides.length);
    setSlides((current) => [...current, slide]);
    setSelectedId(slide.id);
    setPreviewIndex(slides.length);
  }

  function removeSlide(): void {
    if (slides.length <= MIN_SLIDES || selectedIndex < 0) return;
    const nextSlides = slides.filter((slide) => slide.id !== selectedId);
    setSlides(nextSlides);
    const nextIndex = Math.max(0, selectedIndex - 1);
    setSelectedId(nextSlides[nextIndex].id);
    setPreviewIndex(Math.min(previewIndex, nextSlides.length - 1));
  }

  async function generateStoryboard(): Promise<void> {
    if (!topic.trim()) {
      setError("Сначала укажите тему карусели.");
      return;
    }
    setBusy("storyboard");
    setError(null);
    setNotice(null);
    const slideCount = slides.length;
    try {
      const result = await composePostText({
        task: "generate",
        prompt: `Создай storyboard карусели на тему: ${topic.trim()}. Верни только JSON без markdown в формате {"caption":"подпись поста","slides":[{"role":"Хук","headline":"...","body":"..."}]}. Сделай ровно ${slideCount} слайд${slideCount === 1 ? "" : slideCount < 5 ? "а" : "ов"}; не добавляй и не удаляй слайды. Правила: сильный хук, одна мысль на слайд, логическое продолжение и понятный CTA в финале. Стиль: ${style.name}. Правила стиля: ${style.visualRules}. Выравнивание: ${style.alignment}.`,
        length: "long",
        tone: "ясный, живой и профессиональный",
      });
      setTextTokenCost(result.text_tokens ?? 0);
      const parsed = parseStoryboard(result.text);
      if (!parsed?.slides || parsed.slides.length !== slideCount)
        throw new Error(
          `Нейросеть вернула не ${slideCount} слайдов. Повторите запрос.`,
        );
      const nextSlides = parsed.slides
        .slice(0, slideCount)
        .map((slide, index) => ({
          ...createSlide(index),
          role: slide.role?.trim() || `Слайд ${index + 1}`,
          headline: slide.headline?.trim() || "Без заголовка",
          body: slide.body?.trim() || "",
        }));
      setSlides(nextSlides);
      setSelectedId(nextSlides[0].id);
      setPreviewIndex(0);
      setNotice("План готов. Проверьте текст до генерации изображений.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось создать storyboard",
      );
    } finally {
      setBusy(null);
    }
  }

  function selectReference(file: WorkspaceFile): void {
    setReferenceFiles((current) => {
      if (
        current.some((item) => item?.id === file.id) ||
        current.length >= MAX_REFERENCES
      )
        return current;
      if (referenceSlot === null) return [...current, file];
      const next = [...current];
      next[referenceSlot] = file;
      return next;
    });
    setPickerOpen(false);
    setReferenceSlot(null);
    setNotice("Референс добавлен для всех слайдов.");
  }

  function selectReferences(files: WorkspaceFile[]): void {
    setReferenceFiles((current) => {
      const next = [...current];
      for (const file of files) {
        if (next.some((item) => item?.id === file.id)) continue;
        if (next.filter(Boolean).length >= MAX_REFERENCES) break;
        const emptyIndex = next.findIndex((item) => !item);
        if (emptyIndex >= 0) next[emptyIndex] = file;
        else next.push(file);
      }
      return next;
    });
    setNotice(`${files.length} референс(ов) добавлено для всех слайдов.`);
  }

  function selectBackground(file: WorkspaceFile): void {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, { backgroundFile: file });
    setPickerOpen(false);
    setNotice(`Фон назначен для слайда ${selectedIndex + 1}.`);
  }

  async function uploadBackground(file: File): Promise<void> {
    setBusy("upload");
    setError(null);
    try {
      const uploaded = await uploadFile(file);
      selectBackground(uploaded);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить изображение",
      );
    } finally {
      setBusy(null);
    }
  }

  async function uploadReferences(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    setBusy("upload");
    setError(null);
    try {
      const remaining = MAX_REFERENCES - referenceFiles.filter(Boolean).length;
      const uploaded = await Promise.all(
        Array.from(files)
          .slice(0, remaining)
          .map((file) => uploadFile(file)),
      );
      uploaded.forEach(selectReference);
      if (Array.from(files).length > remaining) {
        setNotice(`Добавлены первые ${remaining} референс(ов): максимум ${MAX_REFERENCES}.`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить референс",
      );
    } finally {
      setBusy(null);
      setReferenceSlot(null);
      if (referenceInputRef.current) referenceInputRef.current.value = "";
    }
  }

  function buildSlidePrompt(slide: CarouselSlide, index: number): string {
    return `Создай готовый слайд карусели с текстом внутри изображения. Тема: ${topic.trim()}. Это слайд ${index + 1} из ${slides.length}. Роль: ${slide.role}. Заголовок, который нужно точно написать на русском: ${slide.headline}. Основной текст, который нужно точно написать на русском: ${slide.body}. Не добавляй лишние слова, псевдотекст или lorem ipsum. Сохрани единый визуальный стиль серии. Стиль: ${style.name}. Правила: ${style.visualRules}. Выравнивание: ${style.alignment}. Формат: 4:5. Не копируй референсы буквально.`;
  }

  async function waitForSlideJob(
    slideId: string,
    jobId: string,
    previousCreditCost: number,
  ): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 15 * 60 * 1000) {
      const result = await fetchGenerationJob(jobId);
      const job = result.job as GenerationJob;
      if (job.status === "succeeded") {
        const workspaceFileID = job.generation?.workspace_file_id;
        if (!workspaceFileID) {
          throw new Error("Готовый слайд не привязан к файлу workspace");
        }
        updateSlide(slideId, {
          file: { id: workspaceFileID } as WorkspaceFile,
          generationStatus: "succeeded",
          generationError: undefined,
          generationImageUrl: job.generation?.image_url,
          generationCreditCost:
            previousCreditCost +
            (job.credit_cost ?? job.token_cost ?? pricing?.carousel ?? 0),
        });
        return;
      }
      if (job.status === "failed") {
        throw new Error(job.fail_message || "Генерация слайда не удалась");
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new Error("Ожидание генерации слайда превысило лимит времени");
  }

  async function generateSingleSlide(
    slide: CarouselSlide,
    index: number,
    referenceFilesForSlide: WorkspaceFile[],
    promptSuffix = "",
  ): Promise<void> {
    try {
      const referenceUploadIDs = await Promise.all(
        referenceFilesForSlide.slice(0, MAX_REFERENCES).map((file) =>
          uploadGenerationMediaFromWorkspace(file.id).then(
            (upload) => upload.id,
          ),
        ),
      );
      const result = await startGeneration({
        mode: "carousel",
        prompt: `${buildSlidePrompt(slide, index)}${promptSuffix}`,
        aspect_ratio: "4:5",
        reference_upload_ids: referenceUploadIDs,
      });
      updateSlide(slide.id, {
        generationJobId: result.job.id,
        generationStatus: "queued",
        generationError: undefined,
      });
      await waitForSlideJob(
        slide.id,
        result.job.id,
        slide.generationCreditCost ?? 0,
      );
    } catch (err) {
      updateSlide(slide.id, {
        generationStatus: "failed",
        generationError:
          err instanceof Error ? err.message : "Генерация слайда не удалась",
      });
      throw err;
    }
  }

  async function generateSlides(): Promise<void> {
    if (!topic.trim()) {
      setError("Сначала укажите тему карусели.");
      return;
    }
    setBusy("generate");
    setError(null);
    setNotice(null);
    try {
      const commonReferences = referenceFiles.filter(
        (file): file is WorkspaceFile => file !== null,
      );
      const results = await Promise.allSettled(
        slides.map((slide, index) =>
          generateSingleSlide(slide, index, commonReferences),
        ),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;
      if (failedCount > 0) {
        setError(
          `${failedCount} слайд(ов) не удалось сгенерировать. Повторите только их через кнопку «Повторить».`,
        );
      } else {
        setNotice("Все слайды готовы. Проверьте карусель и сохраните ее в Посты.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сгенерировать слайды",
      );
    } finally {
      setBusy(null);
    }
  }

  async function regenerateSelectedSlide(): Promise<void> {
    if (!selectedSlide || !regeneratePrompt.trim()) return;
    if (!selectedSlide.file) {
      setError("Для перегенерации нужен готовый слайд с изображением.");
      return;
    }
    setBusy("regenerate");
    setError(null);
    setNotice(null);
    try {
      await generateSingleSlide(
        selectedSlide,
        selectedIndex,
        [selectedSlide.file],
        ` Дополнительная правка пользователя: ${regeneratePrompt.trim()}`,
      );
      setRegenerateOpen(false);
      setRegeneratePrompt("");
      setNotice(`Слайд ${selectedIndex + 1} перегенерирован. Стоимость списана как новая генерация слайда.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось перегенерировать слайд",
      );
    } finally {
      setBusy(null);
    }
  }

  async function retrySlide(slide: CarouselSlide, index: number): Promise<void> {
    setBusy("generate");
    setError(null);
    setNotice(null);
    try {
      const references = referenceFiles.filter(
        (file): file is WorkspaceFile => file !== null,
      );
      await generateSingleSlide(slide, index, references);
      setNotice(`Слайд ${index + 1} готов.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Не удалось повторить слайд ${index + 1}`);
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft(): Promise<void> {
    if (slides.some((slide) => !slideFile(slide))) {
      setError("Добавьте готовое изображение или свой фон для каждого слайда.");
      return;
    }
    setBusy("draft");
    setError(null);
    setNotice(null);
    try {
      const media = slides.map((slide) => ({ slide, file: slideFile(slide)! }));
      if (media.length !== slides.length)
        throw new Error("Дождитесь готовности всех слайдов перед сохранением");
      const post = await createPost({
        content: {
          format: "message",
          text: "",
          parse_mode: "HTML",
          entities: [],
          buttons: [],
        },
        settings: {
          telegram_media_layout: "separate",
          telegram_media_order: "media_first",
        },
        targets: [],
        media: media.map(({ slide, file }) => ({
          file_id: file.id,
          settings: { alt_text: slide.headline },
        })),
      });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить черновик",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-accent">
            <GalleryHorizontalEnd size={18} />
            <span className="text-xs font-semibold uppercase tracking-[0.08em]">
              Карусель
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Соберите историю из слайдов
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Утвердите структуру, добавьте референсы, сгенерируйте слайды и
            передайте готовый набор в Посты.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-muted">
          <span className="font-semibold text-text">{slides.length}</span> /{" "}
          {MAX_SLIDES} слайдов
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <label
            className="block text-sm font-medium text-text"
            htmlFor="carousel-topic"
          >
            Тема или задача
          </label>
          <textarea
            id="carousel-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Например: как владельцу малого бизнеса собрать контент-план на неделю"
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void generateStoryboard()}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "storyboard" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}{" "}
              Подготовить структуру
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-bg p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text">
                  Реферсы для карусели
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {referenceFiles.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setReferenceFiles([])}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={14} /> Очистить
                  </button>
                ) : null}
              </div>
            </div>
            <input
              ref={referenceInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void uploadReferences(event.target.files);
              }}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {Array.from({ length: MAX_REFERENCES }, (_, index) => {
                const file = referenceFiles[index] ?? null;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setReferenceSlot(index);
                      referenceInputRef.current?.click();
                    }}
                    className="relative flex aspect-square min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-2 text-center transition hover:border-zinc-400 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {file ? (
                      <>
                        <FileThumbnail
                          fileId={file.id}
                          name={file.name}
                          mimeType={file.mime_type}
                          size="sm"
                          className="absolute inset-0 h-full w-full rounded-lg border-0"
                        />
                        <span className="mt-1 w-full truncate text-[10px] text-muted">
                          {file.name}
                        </span>
                        <span className="absolute inset-x-1 bottom-1 rounded bg-black/55 px-1 py-0.5 text-[10px] text-white">
                          Заменить
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="text-zinc-400" />
                        <span className="mt-1 text-[10px] font-medium text-text">
                          Референс {index + 1}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-accent/30 bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-text">
                    Загрузить референсы
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Можно выбрать до {MAX_REFERENCES} изображений с компьютера или из файлов проекта.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => referenceInputRef.current?.click()}
                    disabled={
                      busy !== null ||
                      referenceFiles.filter(Boolean).length >= MAX_REFERENCES
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    <Upload size={14} /> С компьютера
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerPurpose("reference");
                      setPickerOpen(true);
                    }}
                    disabled={
                      busy !== null ||
                      referenceFiles.filter(Boolean).length >= MAX_REFERENCES
                    }
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"
                  >
                    <FileImage size={14} /> С диска проекта
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-bg p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text">Слайды</h2>
              <button
                type="button"
                onClick={addSlide}
                disabled={slides.length >= MAX_SLIDES}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"
              >
                <Plus size={14} /> Добавить
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => selectSlide(slide.id, index)}
                  draggable
                  onDragStart={() => setDraggedSlideId(slide.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedSlideId) moveSlideToIndex(draggedSlideId, index);
                    setDraggedSlideId(null);
                  }}
                  onDragEnd={() => setDraggedSlideId(null)}
                  className={cn(
                    "relative w-64 min-w-64 shrink-0 rounded-lg border p-2 text-left transition",
                    slide.id === selectedId
                      ? "border-accent bg-blue-50/70"
                      : "border-border bg-surface hover:border-accent/60",
                  )}
                >
                  <div className="relative mb-2 flex h-72 w-full items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-center text-[10px] text-muted">
                    {slide.generationImageUrl ? (
                      <img
                        src={mediaUrl(slide.generationImageUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : slide.backgroundFile ? (
                      <FileThumbnail
                        fileId={slide.backgroundFile.id}
                        name={slide.backgroundFile.name}
                        mimeType={slide.backgroundFile.mime_type}
                        size="sm"
                        className="absolute inset-0 h-full w-full rounded-md border-0"
                      />
                    ) : slide.generationStatus === "queued" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : slide.file ? (
                      <FileThumbnail
                        fileId={slide.file.id}
                        name={slide.file.name}
                        mimeType={slide.file.mime_type}
                        size="sm"
                        className="absolute inset-0 h-full w-full rounded-md border-0"
                      />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="block truncate text-[10px] font-semibold text-text">
                    {slide.role}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted">
                    {slide.generationStatus === "queued"
                      ? "Генерируется…"
                      : slide.generationStatus === "succeeded"
                        ? "Готово"
                        : slide.generationStatus === "failed"
                          ? "Ошибка генерации"
                        : slide.headline}
                  </span>
                  {slide.generationStatus === "failed" ? (
                    <span className="mt-1 block truncate text-[10px] text-red-600">
                      Повторить можно отдельно
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void generateSlides()}
            disabled={busy !== null || slides.length < MIN_SLIDES}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "generate" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GalleryHorizontalEnd size={16} />
            )}{" "}
            Сгенерировать слайды
          </button>

          {selectedSlide ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                    Слайд {selectedIndex + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text">
                    {selectedSlide.role}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {selectedSlide.generationStatus === "queued"
                      ? "KIE генерирует изображение…"
                      : selectedSlide.generationStatus === "succeeded"
                        ? "Изображение готово"
                        : selectedSlide.generationStatus === "failed"
                          ? selectedSlide.generationError || "Генерация не удалась"
                        : "Готов к генерации"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSlide(-1)}
                    disabled={selectedIndex <= 0}
                    className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text disabled:opacity-40"
                    aria-label="Переместить вверх"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(1)}
                    disabled={
                      selectedIndex < 0 || selectedIndex >= slides.length - 1
                    }
                    className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text disabled:opacity-40"
                    aria-label="Переместить вниз"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={removeSlide}
                    disabled={slides.length <= MIN_SLIDES}
                    className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Удалить слайд"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {selectedSlide.generationImageUrl || selectedSlide.file ? (
                <div className="relative mt-4 aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-md bg-zinc-100">
                  {selectedSlide.generationImageUrl ? (
                    <img
                      src={mediaUrl(selectedSlide.generationImageUrl)}
                      alt={selectedSlide.headline}
                      className="h-full w-full object-contain"
                    />
                  ) : selectedSlide.file ? (
                    <FileThumbnail
                      fileId={selectedSlide.file.id}
                      name={selectedSlide.file.name}
                      mimeType={selectedSlide.file.mime_type}
                      size="lg"
                      className="absolute inset-0 h-full w-full rounded-md border-0"
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedSlide.generationStatus === "failed" ? (
                  <button
                    type="button"
                    onClick={() => void retrySlide(selectedSlide, selectedIndex)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Sparkles size={14} /> Повторить слайд
                  </button>
                ) : null}
                {selectedSlide.file ? (
                  <button
                    type="button"
                    onClick={() => setRegenerateOpen(true)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-md border border-accent px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-blue-50 disabled:opacity-50"
                  >
                    <Sparkles size={14} /> Перегенерировать
                  </button>
                ) : null}
              </div>
              <input
                value={selectedSlide.headline}
                onChange={(event) =>
                  updateSlide(selectedSlide.id, {
                    headline: event.target.value,
                  })
                }
                className="mt-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium outline-none focus:border-accent"
                aria-label="Заголовок слайда"
              />
              <textarea
                value={selectedSlide.body}
                onChange={(event) =>
                  updateSlide(selectedSlide.id, { body: event.target.value })
                }
                className="mt-2 min-h-24 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm leading-5 outline-none focus:border-accent"
                aria-label="Текст слайда"
              />
              <div className="mt-4 rounded-md border border-dashed border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-text">
                      Свой фон для слайда
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {selectedSlide.backgroundFile ? (
                        <FileThumbnail
                          fileId={selectedSlide.backgroundFile.id}
                          name={selectedSlide.backgroundFile.name}
                          mimeType={selectedSlide.backgroundFile.mime_type}
                          size="sm"
                          className="mt-2 h-20 w-16 rounded-md border-0"
                        />
                      ) : (
                        "Фон не выбран"
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"
                    >
                      <Upload size={14} /> С ПК
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPickerPurpose("background");
                        setPickerOpen(true);
                      }}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"
                    >
                      <FileImage size={14} /> С диска
                    </button>
                    {selectedSlide.backgroundFile ? (
                      <button
                        type="button"
                        onClick={clearBackground}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={14} /> Удалить фон
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBackground(file);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div
            className={cn(
              "rounded-lg border bg-surface p-4",
              title.trim()
                ? "border-border"
                : "border-amber-400 bg-amber-50/60 ring-1 ring-amber-200",
            )}
          >
            <label
              className="text-sm font-semibold text-text"
              htmlFor="carousel-title"
            >
              Название карусели
            </label>
            <input
              id="carousel-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Контент-план на неделю"
              aria-invalid={!title.trim()}
              className={cn(
                "mt-2 w-full rounded-md border bg-bg px-3 py-2 text-sm outline-none focus:border-accent",
                title.trim() ? "border-border" : "border-amber-400",
              )}
            />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text">Превью карусели</h2>
                <p className="mt-1 text-[11px] text-muted">
                  {previewIndex + 1} из {slides.length} слайдов
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changePreview(-1)}
                  disabled={slides.length <= 1}
                  className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text disabled:opacity-40"
                  aria-label="Предыдущий слайд"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => changePreview(1)}
                  disabled={slides.length <= 1}
                  className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text disabled:opacity-40"
                  aria-label="Следующий слайд"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            {previewSlide ? (
              <button
                type="button"
                onClick={() => selectSlide(previewSlide.id, previewIndex)}
                className="relative mt-3 block aspect-[4/5] w-full overflow-hidden rounded-lg bg-zinc-100 text-left"
              >
                {previewSlide.generationImageUrl ? (
                  <img
                    src={mediaUrl(previewSlide.generationImageUrl)}
                    alt={previewSlide.headline}
                    className="h-full w-full object-cover"
                  />
                ) : slideFile(previewSlide) ? (
                  <FileThumbnail
                    fileId={slideFile(previewSlide)!.id}
                    name={slideFile(previewSlide)!.name}
                    mimeType={slideFile(previewSlide)!.mime_type}
                    size="sm"
                    className="absolute inset-0 h-full w-full rounded-lg border-0"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted">
                    Слайд пока без изображения
                  </div>
                )}
                <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  {previewSlide.headline}
                </span>
              </button>
            ) : null}
            <div className="mt-3 flex justify-center gap-1.5">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => selectSlide(slide.id, index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === previewIndex
                      ? "w-5 bg-accent"
                      : "w-1.5 bg-zinc-300 hover:bg-zinc-400",
                  )}
                  aria-label={`Открыть слайд ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-accent/30 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 text-accent">
              <Check size={17} />
              <h2 className="text-sm font-semibold">Сохранение и постинг</h2>
            </div>
            <button
              type="button"
              onClick={createNewCarousel}
              disabled={busy !== null}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent bg-white px-3 py-2.5 text-sm font-semibold text-accent hover:bg-blue-50 disabled:opacity-60"
            >
              <Plus size={15} /> Создать карусель
            </button>
            <p className="mt-2 text-xs leading-5 text-muted">
              {pricing
                ? `Всего: ${slides.reduce((total, slide) => total + (slide.generationCreditCost ?? 0), 0)} кредитов генерации + ${textTokenCost} текстовых токенов.`
                : "Стоимость генерации загружается…"}
            </p>
            {!title.trim() ? (
              <p className="mt-3 text-xs font-medium text-amber-700">
                Укажите название карусели, чтобы сохранить её в истории.
              </p>
            ) : null}
            <button
              type="button"
              onClick={saveCarouselHistory}
              disabled={
                busy !== null ||
                !title.trim() ||
                !hasCompleteSlides()
              }
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              <Check size={15} /> Сохранить Карусель
            </button>
            <button
              type="button"
              onClick={() => void createPostFromCarousel()}
              disabled={busy !== null || !hasCompleteSlides()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent px-3 py-2.5 text-sm font-semibold text-accent hover:bg-white disabled:opacity-60"
            >
              <GalleryHorizontalEnd size={15} /> В пост
            </button>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-text">История каруселей</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Сохранённых каруселей пока нет.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {history.map((carousel) => (
                  <div key={carousel.id} className="rounded-md border border-border bg-bg p-2">
                    <p className="truncate text-xs font-semibold text-text">{carousel.title}</p>
                    <p className="mt-1 text-[11px] text-muted">{carousel.slides.length} слайд(ов) · {new Date(carousel.created_at).toLocaleDateString("ru-RU")}</p>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {carousel.slides.slice(0, 4).map((slide) => (
                        <FileThumbnail key={slide.file.id} fileId={slide.file.id} name={slide.file.name} mimeType={slide.file.mime_type} size="sm" className="rounded-sm border-0" />
                      ))}
                    </div>
                    {carousel.references.length > 0 ? (
                      <p className="mt-2 truncate text-[10px] text-muted">
                        Референсов: {carousel.references.length}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => restoreCarousel(carousel)}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text hover:border-accent"
                      >
                        Открыть
                      </button>
                      <button
                        type="button"
                        onClick={() => void createPostFromSavedCarousel(carousel)}
                        className="rounded-md border border-accent px-2 py-1 text-[11px] font-medium text-accent hover:bg-blue-50"
                      >
                        В пост
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteSavedCarousel(carousel)}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-red-600 hover:border-red-300"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {notice ? (
            <p className="text-xs leading-5 text-emerald-700">{notice}</p>
          ) : null}
          {error ? (
            <p className="text-xs leading-5 text-red-600">{error}</p>
          ) : null}
        </aside>
      </div>
      <WorkspaceMediaPickerModal
        open={pickerOpen}
        mediaKind="image"
        multiple={pickerPurpose === "reference"}
        maxSelected={MAX_REFERENCES - referenceFiles.filter(Boolean).length}
        onClose={() => setPickerOpen(false)}
        onSelect={
          pickerPurpose === "reference" ? selectReference : selectBackground
        }
        onSelectMany={pickerPurpose === "reference" ? selectReferences : undefined}
      />
      {regenerateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-slide-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2
              id="regenerate-slide-title"
              className="text-base font-semibold text-text"
            >
              Перегенерировать слайд {selectedIndex + 1}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Опишите, что изменить. Текущий слайд будет отправлен в KIE как
              референс.
            </p>
            <textarea
              autoFocus
              value={regeneratePrompt}
              onChange={(event) => setRegeneratePrompt(event.target.value)}
              placeholder="Сделай фон светлее, сохрани композицию и увеличь заголовок"
              className="mt-4 min-h-28 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRegenerateOpen(false)}
                className="rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-bg"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void regenerateSelectedSlide()}
                disabled={!regeneratePrompt.trim() || busy !== null}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {busy === "regenerate" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}{" "}
                Перегенерировать
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
