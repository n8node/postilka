"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  ArrowDown,
  ArrowUp,
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
  generationImageUrl?: string;
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

export function CarouselPage(): ReactElement {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
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

  function updateSlide(id: string, patch: Partial<CarouselSlide>): void {
    setSlides((current) =>
      current.map((slide) =>
        slide.id === id ? { ...slide, ...patch } : slide,
      ),
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
  }

  function removeSlide(): void {
    if (slides.length <= MIN_SLIDES || selectedIndex < 0) return;
    const nextSlides = slides.filter((slide) => slide.id !== selectedId);
    setSlides(nextSlides);
    setSelectedId(nextSlides[Math.max(0, selectedIndex - 1)].id);
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
      const parsed = parseStoryboard(result.text);
      if (!parsed?.slides?.length)
        throw new Error(
          "Нейросеть вернула неподдерживаемый формат. Повторите запрос.",
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

  async function uploadReference(file: File): Promise<void> {
    setBusy("upload");
    setError(null);
    try {
      const uploaded = await uploadFile(file);
      selectReference(uploaded);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить референс",
      );
    } finally {
      setBusy(null);
    }
  }

  function buildSlidePrompt(slide: CarouselSlide, index: number): string {
    return `Создай готовый слайд карусели с текстом внутри изображения. Тема: ${topic.trim()}. Это слайд ${index + 1} из ${slides.length}. Роль: ${slide.role}. Заголовок, который нужно точно написать на русском: ${slide.headline}. Основной текст, который нужно точно написать на русском: ${slide.body}. Не добавляй лишние слова, псевдотекст или lorem ipsum. Сохрани единый визуальный стиль серии. Стиль: ${style.name}. Правила: ${style.visualRules}. Выравнивание: ${style.alignment}. Формат: 4:5. Не копируй референсы буквально.`;
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
      const jobs = await Promise.all(
        slides.map(async (slide, index) => {
          const slideReferenceFiles = [
            ...referenceFiles.filter(
              (file): file is WorkspaceFile => file !== null,
            ),
            ...(slide.backgroundFile ? [slide.backgroundFile] : []),
          ].slice(0, MAX_REFERENCES);
          const referenceUploadIDs = await Promise.all(
            slideReferenceFiles.map((file) =>
              uploadGenerationMediaFromWorkspace(file.id).then(
                (upload) => upload.id,
              ),
            ),
          );
          const result = await startGeneration({
            mode: "carousel",
            prompt: buildSlidePrompt(slide, index),
            aspect_ratio: "4:5",
            reference_upload_ids: referenceUploadIDs,
          });
          updateSlide(slide.id, {
            generationJobId: result.job.id,
            generationStatus: "queued",
          });
          return { slideId: slide.id, jobId: result.job.id };
        }),
      );
      setNotice(
        "Слайды поставлены в очередь и появятся на своих позициях по мере готовности.",
      );
      await Promise.all(
        jobs.map(async ({ slideId, jobId }) => {
          const started = Date.now();
          while (Date.now() - started < 15 * 60 * 1000) {
            const result = await fetchGenerationJob(jobId);
            const job = result.job as GenerationJob;
            if (job.status === "succeeded") {
              const workspaceFileID = job.generation?.workspace_file_id;
              if (!workspaceFileID)
                throw new Error("Готовый слайд не привязан к файлу workspace");
              updateSlide(slideId, {
                file: { id: workspaceFileID } as WorkspaceFile,
                generationStatus: "succeeded",
                generationImageUrl: job.generation?.image_url,
              });
              return;
            }
            if (job.status === "failed")
              throw new Error(
                job.fail_message || "Генерация слайда не удалась",
              );
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
          throw new Error("Ожидание генерации слайда превысило лимит времени");
        }),
      );
      setNotice(
        "Все слайды готовы. Проверьте карусель и сохраните ее в Посты.",
      );
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
    setBusy("regenerate");
    setError(null);
    setNotice(null);
    try {
      const referenceUploadIDs = await Promise.all(
        [
          ...referenceFiles.filter(
            (file): file is WorkspaceFile => file !== null,
          ),
          ...(selectedSlide.backgroundFile ? [selectedSlide.backgroundFile] : []),
        ]
          .slice(0, MAX_REFERENCES)
          .map((file) =>
            uploadGenerationMediaFromWorkspace(file.id).then(
              (upload) => upload.id,
            ),
          ),
      );
      const result = await startGeneration({
        mode: "carousel",
        prompt: `${buildSlidePrompt(selectedSlide, selectedIndex)} Дополнительная правка пользователя: ${regeneratePrompt.trim()}`,
        aspect_ratio: "4:5",
        reference_upload_ids: referenceUploadIDs,
      });
      updateSlide(selectedSlide.id, {
        generationJobId: result.job.id,
        generationStatus: "queued",
      });
      setRegenerateOpen(false);
      setRegeneratePrompt("");
      const started = Date.now();
      while (Date.now() - started < 15 * 60 * 1000) {
        const response = await fetchGenerationJob(result.job.id);
        const job = response.job as GenerationJob;
        if (job.status === "succeeded") {
          const workspaceFileID = job.generation?.workspace_file_id;
          if (!workspaceFileID)
            throw new Error(
              "Перегенерированный слайд не привязан к файлу workspace",
            );
          updateSlide(selectedSlide.id, {
            file: { id: workspaceFileID } as WorkspaceFile,
            generationStatus: "succeeded",
            generationImageUrl: job.generation?.image_url,
          });
          setNotice(
            `Слайд ${selectedIndex + 1} перегенерирован. Стоимость списана как новая генерация слайда.`,
          );
          return;
        }
        if (job.status === "failed")
          throw new Error(
            job.fail_message || "Не удалось перегенерировать слайд",
          );
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      throw new Error("Ожидание перегенерации превысило лимит времени");
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

  async function saveDraft(): Promise<void> {
    if (slides.some((slide) => slide.generationStatus !== "succeeded")) {
      setError("Сначала сгенерируйте все слайды через KIE.");
      return;
    }
    setBusy("draft");
    setError(null);
    setNotice(null);
    try {
      const media = slides.filter((slide) => slide.file);
      if (media.length !== slides.length)
        throw new Error("Дождитесь готовности всех слайдов перед сохранением");
      const post = await createPost({
        content: {
          format: "message",
          text: caption.trim() || topic.trim(),
          parse_mode: "HTML",
          entities: [],
          buttons: [],
        },
        settings: {
          telegram_media_layout: "separate",
          telegram_media_order: "media_first",
        },
        targets: [],
        media: media.map((slide) => ({
          file_id: slide.file!.id,
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
                <button
                  type="button"
                  onClick={() => {
                    setReferenceSlot(
                      referenceFiles.findIndex((file) => !file) >= 0
                        ? referenceFiles.findIndex((file) => !file)
                        : Math.min(referenceFiles.length, MAX_REFERENCES - 1),
                    );
                    referenceInputRef.current?.click();
                  }}
                  disabled={
                    busy !== null ||
                    referenceFiles.filter(Boolean).length >= MAX_REFERENCES
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"
                >
                  <Upload size={14} /> Добавить с ПК
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextSlot = referenceFiles.findIndex((file) => !file);
                    setReferenceSlot(
                      nextSlot >= 0
                        ? nextSlot
                        : Math.min(referenceFiles.length, MAX_REFERENCES - 1),
                    );
                    setPickerPurpose("reference");
                    setPickerOpen(true);
                  }}
                  disabled={
                    busy !== null ||
                    referenceFiles.filter(Boolean).length >= MAX_REFERENCES
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"
                >
                  <FileImage size={14} /> Добавить с диска
                </button>
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
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadReference(file);
                event.currentTarget.value = "";
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
                  onClick={() => setSelectedId(slide.id)}
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
                    "relative w-32 min-w-32 shrink-0 rounded-lg border p-2 text-left transition",
                    slide.id === selectedId
                      ? "border-accent bg-blue-50/70"
                      : "border-border bg-surface hover:border-accent/60",
                  )}
                >
                  <div className="mb-2 flex h-36 w-28 items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-center text-[10px] text-muted">
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
                      <FileImage size={18} />
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
                        : slide.headline}
                  </span>
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
              {selectedSlide.generationImageUrl ? (
                <img
                  src={mediaUrl(selectedSlide.generationImageUrl)}
                  alt={selectedSlide.headline}
                  className="mt-4 max-h-[500px] w-auto max-w-full rounded-md object-contain"
                />
              ) : null}
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
          <button
            type="button"
            onClick={() => setRegenerateOpen(true)}
            disabled={busy !== null || !selectedSlide}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent bg-surface px-3 py-2.5 text-sm font-semibold text-accent hover:bg-blue-50 disabled:opacity-50"
          >
            {busy === "regenerate" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            Перегенерировать выбранный слайд
          </button>
          <div className="rounded-lg border border-border bg-surface p-4">
            <label
              className="text-sm font-semibold text-text"
              htmlFor="carousel-caption"
            >
              Подпись публикации
            </label>
            <textarea
              id="carousel-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Текст, который будет отправлен вместе с каруселью"
              className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="rounded-lg border border-accent/30 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 text-accent">
              <Check size={17} />
              <h2 className="text-sm font-semibold">Готово к постингу</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {pricing
                ? `Стоимость генерации: ${pricing.carousel} кредит${pricing.carousel === 1 ? "" : pricing.carousel < 5 ? "а" : "ов"} за слайд, ${pricing.carousel_wallet_rub} ₽ из кошелька.`
                : "Стоимость генерации загружается…"}
            </p>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={
                busy !== null ||
                slides.some((slide) => slide.generationStatus !== "succeeded")
              }
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {busy === "draft" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}{" "}
              Сохранить набор в Посты
            </button>
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
        onClose={() => setPickerOpen(false)}
        onSelect={
          pickerPurpose === "reference" ? selectReference : selectBackground
        }
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
                {busy === "draft" ? (
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
