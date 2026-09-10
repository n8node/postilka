"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileImage,
  GalleryHorizontalEnd,
  Loader2,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import { composePostText } from "@/lib/generation-api";
import { downloadFile, uploadFile, type WorkspaceFile } from "@/lib/files-api";
import { createPost } from "@/lib/posts-api";
import { cn } from "@/lib/utils";

const MIN_SLIDES = 3;
const MAX_SLIDES = 10;

type CarouselSlide = {
  id: string;
  role: string;
  headline: string;
  body: string;
  file?: WorkspaceFile;
  styleAccent?: string;
  textAlignment?: "left" | "center";
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
  { id: "slide-1", role: "Хук", headline: "Начните с идеи карусели", body: "Одна сильная мысль на первом слайде удерживает внимание." },
  { id: "slide-2", role: "Проблема", headline: "Покажите знакомую проблему", body: "Объясните, почему читателю важно листать дальше." },
  { id: "slide-3", role: "CTA", headline: "Завершите понятным действием", body: "Скажите, что сделать после последнего слайда." },
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
  const normalized = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(normalized) as StoryboardResponse;
    return Array.isArray(parsed.slides) ? parsed : null;
  } catch {
    return null;
  }
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadWorkspaceImage(file: WorkspaceFile): Promise<HTMLImageElement> {
  const { url } = await downloadFile(file.id, "inline");
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  return image;
}

async function renderSlide(slide: CarouselSlide, index: number): Promise<File> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не поддерживает рендер карусели");

  context.fillStyle = "#f1eee7";
  context.fillRect(0, 0, width, height);
  if (slide.file) {
    try {
      const image = await loadWorkspaceImage(slide.file);
      const scale = Math.max(width / image.width, height / image.height);
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      context.globalAlpha = 0.72;
      context.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
      context.globalAlpha = 1;
      context.fillStyle = "rgba(241, 238, 231, 0.72)";
      context.fillRect(0, 0, width, height);
    } catch {
      context.fillStyle = "#e4ded2";
      context.fillRect(0, 0, width, height);
    }
  }

  const inset = 104;
  context.fillStyle = slide.styleAccent ?? "#9c4938";
  context.fillRect(inset, 112, 92, 10);
  context.fillStyle = "#1d2724";
  context.font = "600 30px Georgia, serif";
  context.fillText(`${String(index + 1).padStart(2, "0")} / ${String(MAX_SLIDES).padStart(2, "0")}`, inset, 92);

  context.font = "700 72px Georgia, serif";
  context.textAlign = slide.textAlignment ?? "left";
  const headlineLines = wrapCanvasText(context, slide.headline, width - inset * 2);
  let y = 350;
  const textX = slide.textAlignment === "center" ? width / 2 : inset;
  for (const line of headlineLines.slice(0, 4)) {
    context.fillText(line, textX, y);
    y += 82;
  }

  context.font = "400 34px Arial, sans-serif";
  const bodyLines = wrapCanvasText(context, slide.body, width - inset * 2);
  y += 46;
  for (const line of bodyLines.slice(0, 7)) {
    context.fillText(line, textX, y);
    y += 48;
  }

  context.font = "600 24px Arial, sans-serif";
  context.fillStyle = "#59635e";
  context.fillText(slide.role, textX, height - 112);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Не удалось создать PNG"))), "image/png");
  });
  return new File([blob], `carousel_slide_${String(index + 1).padStart(2, "0")}.png`, { type: "image/png" });
}

export function CarouselPage(): ReactElement {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [slides, setSlides] = useState<CarouselSlide[]>(INITIAL_SLIDES);
  const [selectedId, setSelectedId] = useState(INITIAL_SLIDES[0].id);
  const [command, setCommand] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<"storyboard" | "command" | "upload" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [style, setStyle] = useState<CarouselStyleProfile>(DEFAULT_STYLE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STYLE_STORAGE_KEY);
      if (stored) setStyle({ ...DEFAULT_STYLE, ...(JSON.parse(stored) as Partial<CarouselStyleProfile>) });
    } catch {
      // Ignore invalid local style data and keep the defaults.
    }
  }, []);

  function updateStyle(patch: Partial<CarouselStyleProfile>): void {
    setStyle((current) => {
      const next = { ...current, ...patch };
      window.localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const selectedIndex = slides.findIndex((slide) => slide.id === selectedId);
  const selectedSlide = slides[selectedIndex] ?? slides[0];

  function updateSlide(id: string, patch: Partial<CarouselSlide>): void {
    setSlides((current) => current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
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
    try {
      const result = await composePostText({
        task: "generate",
        prompt: `Создай storyboard карусели на тему: ${topic.trim()}. Верни только JSON без markdown в формате {"caption":"подпись поста","slides":[{"role":"Хук","headline":"...","body":"..."}]}. Сделай от ${MIN_SLIDES} до ${Math.min(7, MAX_SLIDES)} слайдов. Правила: сильный хук, одна мысль на слайд, логическое продолжение и понятный CTA в финале. Стиль: ${style.name}. Правила стиля: ${style.visualRules}. Выравнивание: ${style.alignment}.`,
        length: "long",
        tone: "ясный, живой и профессиональный",
      });
      const parsed = parseStoryboard(result.text);
      if (!parsed?.slides?.length) throw new Error("Нейросеть вернула неподдерживаемый формат. Повторите запрос.");
      const nextSlides = parsed.slides.slice(0, MAX_SLIDES).map((slide, index) => ({
        ...createSlide(index),
        role: slide.role?.trim() || `Слайд ${index + 1}`,
        headline: slide.headline?.trim() || "Без заголовка",
        body: slide.body?.trim() || "",
      }));
      setSlides(nextSlides);
      setSelectedId(nextSlides[0].id);
      setCaption(parsed.caption?.trim() || "");
      setNotice("План готов. Проверьте текст до генерации изображений.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать storyboard");
    } finally {
      setBusy(null);
    }
  }

  async function applyCommand(): Promise<void> {
    if (!command.trim() || !selectedSlide) return;
    setBusy("command");
    setError(null);
    setNotice(null);
    try {
      const result = await composePostText({
        task: "generate",
        prompt: `Измени только выбранный слайд по команде пользователя. Верни JSON без markdown в формате {"slides":[{"headline":"...","body":"..."}]}. Команда: ${command.trim()}. Текущий слайд: ${JSON.stringify({ role: selectedSlide.role, headline: selectedSlide.headline, body: selectedSlide.body })}. Стиль: ${style.name}; правила: ${style.visualRules}; выравнивание: ${style.alignment}.`,
        length: "medium",
        tone: "сохрани смысл и стиль карусели",
      });
      const parsed = parseStoryboard(result.text);
      const firstSlide = parsed?.slides?.[0];
      updateSlide(selectedSlide.id, {
        headline: firstSlide?.headline?.trim() || selectedSlide.headline,
        body: firstSlide?.body?.trim() || (parsed ? selectedSlide.body : result.text.trim()),
      });
      setCommand("");
      setNotice(`Слайд ${selectedIndex + 1} обновлен. Остальные слайды не изменялись.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось применить команду");
    } finally {
      setBusy(null);
    }
  }

  function selectBackground(file: WorkspaceFile): void {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, { file });
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
      setError(err instanceof Error ? err.message : "Не удалось загрузить изображение");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft(): Promise<void> {
    setBusy("draft");
    setError(null);
    setNotice(null);
    try {
      const renderedFiles = await Promise.all(slides.map((slide, index) => renderSlide({ ...slide, styleAccent: style.accent, textAlignment: style.alignment }, index)));
      const media = await Promise.all(renderedFiles.map((file) => uploadFile(file)));
      const post = await createPost({
        content: { format: "message", text: caption.trim() || topic.trim(), parse_mode: "HTML", entities: [], buttons: [] },
        settings: { telegram_media_layout: "separate", telegram_media_order: "media_first" },
        targets: [],
        media: media.map((file, index) => ({ file_id: file.id, settings: { alt_text: slides[index].headline } })),
      });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить черновик");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-accent"><GalleryHorizontalEnd size={18} /><span className="text-xs font-semibold uppercase tracking-[0.08em]">Карусель</span></div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Соберите историю из слайдов</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Сначала утвердите смысл и текст, затем назначьте фон каждому слайду и передайте готовый draft в обычный пост-композер.</p>
        </div>
        <div className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-muted"><span className="font-semibold text-text">{slides.length}</span> / {MAX_SLIDES} слайдов</div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <label className="block text-sm font-medium text-text" htmlFor="carousel-topic">Тема или задача</label>
          <textarea id="carousel-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Например: как владельцу малого бизнеса собрать контент-план на неделю" className="mt-2 min-h-24 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
          <button type="button" onClick={() => void generateStoryboard()} disabled={busy !== null} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60">{busy === "storyboard" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Создать storyboard</button>

          <div className="mt-6 rounded-lg border border-border bg-bg p-3">
            <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-text">Слайды</h2><button type="button" onClick={addSlide} disabled={slides.length >= MAX_SLIDES} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"><Plus size={14} /> Добавить</button></div>
            <div className="flex gap-2 overflow-x-auto pb-2">{slides.map((slide, index) => <button key={slide.id} type="button" onClick={() => setSelectedId(slide.id)} className={cn("relative min-w-28 rounded-lg border p-2 text-left transition", slide.id === selectedId ? "border-accent bg-blue-50/70" : "border-border bg-surface hover:border-accent/60")}><div className="mb-2 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-center text-[10px] text-muted">{slide.file ? <FileImage size={18} /> : <span>{index + 1}</span>}</div><span className="block truncate text-[10px] font-semibold text-text">{slide.role}</span><span className="mt-0.5 block truncate text-[10px] text-muted">{slide.headline}</span></button>)}</div>
          </div>

          {selectedSlide ? <div className="mt-4 rounded-lg border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Слайд {selectedIndex + 1}</p><p className="mt-1 text-sm font-semibold text-text">{selectedSlide.role}</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => moveSlide(-1)} disabled={selectedIndex <= 0} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text disabled:opacity-40" aria-label="Переместить вверх"><ArrowUp size={15} /></button><button type="button" onClick={() => moveSlide(1)} disabled={selectedIndex < 0 || selectedIndex >= slides.length - 1} className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-text disabled:opacity-40" aria-label="Переместить вниз"><ArrowDown size={15} /></button><button type="button" onClick={removeSlide} disabled={slides.length <= MIN_SLIDES} className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label="Удалить слайд"><Trash2 size={15} /></button></div></div><input value={selectedSlide.headline} onChange={(event) => updateSlide(selectedSlide.id, { headline: event.target.value })} className="mt-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium outline-none focus:border-accent" aria-label="Заголовок слайда" /><textarea value={selectedSlide.body} onChange={(event) => updateSlide(selectedSlide.id, { body: event.target.value })} className="mt-2 min-h-24 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm leading-5 outline-none focus:border-accent" aria-label="Текст слайда" /><div className="mt-4 rounded-md border border-dashed border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-text">Фон слайда</p><p className="mt-1 text-[11px] text-muted">{selectedSlide.file?.name ?? "Изображение еще не выбрано"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"><Upload size={14} /> С ПК</button><button type="button" onClick={() => setPickerOpen(true)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-accent disabled:opacity-50"><FileImage size={14} /> С диска</button></div></div><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBackground(file); event.currentTarget.value = ""; }} /></div></div> : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4"><div className="rounded-lg border border-border bg-bg p-4"><div className="flex items-center gap-2 text-text"><MessageSquareText size={17} /><h2 className="text-sm font-semibold">Команда для AI</h2></div><p className="mt-2 text-xs leading-5 text-muted">Команда изменит только выбранный слайд. Текстовые токены списываются существующим контуром YandexGPT после успешного ответа.</p><textarea value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Усиль хук и сократи текст в два раза" className="mt-3 min-h-24 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /><button type="button" onClick={() => void applyCommand()} disabled={!command.trim() || busy !== null} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent bg-surface px-3 py-2 text-sm font-semibold text-accent hover:bg-blue-50 disabled:opacity-50">{busy === "command" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Применить к слайду</button></div><div className="rounded-lg border border-border bg-surface p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-text">Профиль стиля</h2><span className="text-[11px] text-muted">сохраняется в браузере</span></div><input value={style.name} onChange={(event) => updateStyle({ name: event.target.value })} className="mt-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent" aria-label="Название профиля стиля" /><div className="mt-2 flex items-center gap-2"><input type="color" value={style.accent} onChange={(event) => updateStyle({ accent: event.target.value })} className="h-9 w-11 rounded border border-border bg-bg p-1" aria-label="Акцентный цвет" /><select value={style.alignment} onChange={(event) => updateStyle({ alignment: event.target.value as CarouselStyleProfile["alignment"] })} className="h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm"><option value="left">Слева</option><option value="center">По центру</option></select></div><textarea value={style.visualRules} onChange={(event) => updateStyle({ visualRules: event.target.value })} className="mt-2 min-h-20 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-xs leading-5 outline-none focus:border-accent" aria-label="Правила визуального стиля" /></div><div className="rounded-lg border border-border bg-surface p-4"><label className="text-sm font-semibold text-text" htmlFor="carousel-caption">Подпись публикации</label><textarea id="carousel-caption" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Текст, который будет отправлен вместе с каруселью" className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent" /></div><div className="rounded-lg border border-accent/30 bg-blue-50/60 p-4"><div className="flex items-center gap-2 text-accent"><Check size={17} /><h2 className="text-sm font-semibold">Готово к постингу</h2></div><p className="mt-2 text-xs leading-5 text-muted">Сохраните слайды как PNG-черновик. Каналы, ограничения и публикация останутся в существующем PostComposer.</p><button type="button" onClick={() => void saveDraft()} disabled={busy !== null} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{busy === "draft" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Сохранить черновик</button></div>{notice ? <p className="text-xs leading-5 text-emerald-700">{notice}</p> : null}{error ? <p className="text-xs leading-5 text-red-600">{error}</p> : null}</aside>
      </div>
      <WorkspaceMediaPickerModal open={pickerOpen} mediaKind="image" onClose={() => setPickerOpen(false)} onSelect={selectBackground} />
    </section>
  );
}
